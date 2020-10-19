const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {booleanAttr, noStyleTags} = require('./htmlInfo');
const {toDom} = require('./markoToDom');
const {bundle} = require('./rollup');
const parsePostcss = require('./postcss');
const JSUrl = require('@yaska-eu/jsurl2');

const globalCss = fs.readFileSync(`${__dirname}/global.css`);
const uhtmlJs = fs.readFileSync(`${__dirname}/uhtml.js`)
const globalJs = uhtmlJs + '\n' + fs.readFileSync(`${__dirname}/global.js`);

const compiledComponents = new Map();

function hash(str) {
	return 'C_' + crypto.createHash('sha1').update(str).digest('base64').replace(/[+/=]/g, '');
}

async function parseFile(file, options = {}, data = {}) {
	if (!file.startsWith('/')) {
		throw new Error('only absolute paths are allowed');
	}

	const type = data.vdom ? 'vdom' : 'ssr';
	const existing = compiledComponents.get(`${type}:${file}`);
	if (existing) return existing;

	// eslint-disable-next-line no-use-before-define
	const component = await parse(fs.readFileSync(file).toString(), {
		...options,
		file,
		root: path.dirname(file),
	}, data);

	compiledComponents.set(`${type}:${file}`, component);
	return component;
}

async function tryParseFile(file, options = {}, data = {}) {
	try {
		return (await parseFile(file, options, data));
	}
	catch (e) {
		if (e.code === 'ENOENT') return false;
		throw e;
	}
}

function random() {
	// first character should be a-z
	const c = Math.floor(Math.random() * 26);
	let str = String.fromCharCode(c + 97);

	for (let i = 0; i < 3; i++) {
		const n = Math.floor(Math.random() * 36);
		str += n < 10 ? n : String.fromCharCode(n + 87);
	}

	return str;
}

function getExpr(expr, raw) {
	if (!expr) return raw;
	const matches = expr.match(/^\(([a-zA-Z0-9_$.]+)\)$/);
	const simpleExpr = matches ? matches[1] : expr;
	return '${' + simpleExpr + '}';
}

function $kebabCase(str) {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function $camelCase(str) {
	return str.replace(/-(.)/g, (m, chr) => chr.toUpperCase());
}

// eslint-disable-next-line complexity
function getAttr(attributes) {
	if (!attributes.length) return '';

	const styles = [];
	const classes = [];
	let str = '';
	for (const attr of attributes) {
		if (attr.name === 'style') {
			if (!styles.length) str += '<!-- style -->';
			if (attr.value) styles.push(attr.value.replace(/\s*:\s*/g, ':').replace(/\s*;\s*(['"`])/, '$1'));
		}
		else if (attr.name === 'class') {
			if (!classes.length) str += '<!-- class -->';
			if (attr.value) classes.push(attr.value.replace(/\s{2,}/g, ' '));
		}
		else if (attr.literalValue) {
			str += ` ${attr.name}="${attr.literalValue}"`;
		}
		else if (attr.literalValue === false || attr.literalValue === null) {
			// remove the attribute
		}
		else if (attr.value === undefined) {
			str += ` ${attr.name}`;
		}
		else {
			str += `\${$attr('${attr.name}', ${attr.value})}`;
		}
	}

	if (styles.length) {
		if (styles.length === 1) {
			const style = styles[0];
			if (style[0] === '`') {
				// style is template string
				str = str.replace('<!-- style -->', ` style="${style.substring(1, style.length - 1)}"`);
			}
			else if (/^['"]/.test(style)) {
				// style is static
				str = str.replace('<!-- style -->', ` style=${style}`);
			}
			else {
				// style is dynamic
				str = str.replace('<!-- style -->', `\${$style(${style})}`);
			}
		}
		else {
			str = str.replace('<!-- style -->', `\${$style([${styles.map((style) => {
				if (style === 'input.style') return '...$arr(input.style)';
				return style;
			}).join(', ')}])}`);
		}
	}

	if (classes.length) {
		if (classes.length === 1) {
			const cls = classes[0];
			if (cls[0] === '`') {
				// class is template string
				str = str.replace('<!-- class -->', ` class="${cls.substring(1, cls.length - 1)}"`);
			}
			else if (/^['"]/.test(cls)) {
				// class is static
				str = str.replace('<!-- class -->', ` class=${cls}`);
			}
			else {
				// class is dynamic
				str = str.replace('<!-- class -->', `\${$class(${cls})}`);
			}
		}
		else {
			str = str.replace('<!-- class -->', `\${$class([${classes.map((cls) => {
				if (cls === 'input.class') return '...$arr(input.class)';
				return cls;
			}).join(', ')}])}`);
		}
	}

	return str;
}

function attrToObj(attributes, {camelCase = true} = {}) {
	if (!attributes.length) return '{}';

	const classes = [];
	const styles = [];
	const obj = [];

	if (attributes.length === 1) {
		const {name, value} = attributes[0];
		if (name === 'input') {
			return (value || 'input');
		}
		if (name.startsWith('...')) {
			return name.substring(3);
		}
	}

	for (const attr of attributes) {
		if (attr.name === 'style') {
			if (attr.value) styles.push(attr.value.replace(/\s*:\s*/g, ':').replace(/\s*;\s*(['"`])$/, '$1'));
		}
		else if (attr.name === 'class') {
			if (attr.value) classes.push(attr.value.replace(/\s{2,}/g, ' '));
		}
		else if (attr.name === 'input') {
			obj.push(`...${attr.value}`);
		}
		else if (attr.name.startsWith('...')) {
			obj.push(attr.name);
		}
		else {
			const value = attr.value === undefined ? 'true' : attr.value;
			// eslint-disable-next-line no-nested-ternary
			const name = camelCase ?
				$camelCase(attr.name) : (
					attr.name.includes('-') ? `'${attr.name}'` : attr.name
				);
			obj.push(`${name}: ${value}`);
		}
	}

	if (styles.length) {
		if (styles.length === 1) {
			obj.push(`style: ${styles[0]}`);
		}
		else {
			obj.push(`style: [${styles.map((style) => {
				if (style === 'input.style') return '...$arr(input.style)';
				return style;
			}).join(', ')}]`);
		}
	}

	if (classes.length) {
		if (classes.length === 1) {
			obj.push(`class: ${classes[0]}`);
		}
		else {
			obj.push(`class: [${classes.map((cls) => {
				if (cls === 'input.class') return '...$arr(input.class)';
				return cls;
			}).join(', ')}]`);
		}
	}

	return '{' + obj.join(', ') + '}';
}

function $arr(val) {
	if (!val) return [];
	if (!Array.isArray(val)) return [val];
	return val;
}

function $escape(str) {
	if (!str) return '';
	if (!/([<>"'])/.test(str)) return str;
	return str.replace(/([<>"'])/g, (match, g1) => {
		switch (g1) {
			case '<': return '&lt;';
			case '>': return '&gt;';
			case '"': return '&quot;';
			case '\'': return '&#39;';
			default: return g1;
		}
	});
}

function $attr(name, value) {
	if (!value) return '';
	return ` ${name}="${$escape(value)}"`;
}

function $singleStyle(style) {
	if (!style) return '';

	let result;
	if (typeof style === 'string') {
		result = style;
	}
	else if (Array.isArray(style)) {
		result = style.filter(Boolean).join(';');
	}
	else {
		const arr = [];
		Object.entries(style).forEach(([key, val]) => {
			if (val) arr.push(`${$kebabCase(key)}:${val}`);
		});
		result = arr.join(';');
	}

	return result ? ` style="${result}"` : '';
}

function $style(styles) {
	if (!styles) return '';

	if (!Array.isArray(styles)) {
		return $singleStyle(styles);
	}

	if (styles.length === 1) {
		return $singleStyle(styles[0]);
	}

	const map = new Map();
	styles.forEach((style) => {
		if (!style) return;

		if (typeof style === 'string') {
			style.split(';').forEach((s) => {
				const a = s.split(':');
				map.set(a[0].trim(), a[1].trim());
			});
		}
		else if (Array.isArray(style)) {
			style.filter(Boolean).forEach((s) => {
				const a = s.split(':');
				map.set(a[0].trim(), a[1].trim());
			});
		}
		else {
			Object.entries(style).forEach(([key, val]) => {
				if (val) map.set($kebabCase(key), val);
			});
		}
	});

	const result = [];
	map.forEach((val, key) => {
		result.push(`${key}:${val}`);
	});
	return result.length ? ` style="${result.join(';')}"` : '';
}

function $singleClass(cls) {
	if (!cls) return '';

	let result;
	if (typeof cls === 'string') {
		result = cls;
	}
	else if (Array.isArray(cls)) {
		result = cls.filter(Boolean).join(' ');
	}

	return result ? ` class="${result}"` : '';
}

function $class(classes) {
	if (!classes) return '';

	if (!Array.isArray(classes)) {
		return $singleClass(classes);
	}

	if (classes.length === 1) {
		return $singleClass(classes[0]);
	}

	const result = [];
	classes.forEach((cls) => {
		if (!cls) return;

		if (typeof cls === 'string') {
			result.push(cls);
		}
		else if (Array.isArray(cls)) {
			result.push(cls.filter(Boolean).join(' '));
		}
	});

	return result.length ? ` class="${result.join(' ')}"` : '';
}

function $jsUrl(data) {
	return JSUrl.stringify(data, {short: true});
}

function $jsurl(data) {
	return $jsUrl(data);
}

// eslint-disable-next-line max-statements, complexity
async function parse(html, options = {}, data = {}) {
	let writing = false;
	let staticScriptStr = '';
	const $customTags = new Map();
	const clientScript = [];
	const clientStyle = [];
	const refs = {};
	const vdom = data.vdom || false;
	const clientScripts = data.scripts || (data.scripts = []);

	let nodeDepth = 0;
	let currentSlots = {};
	let outs = [];
	let out;
	if (vdom) {
		out = 'let _c = [];\n';
	}
	else {
		out = 'let $out = "";\n';
	}

	let vDomIndex = 0;
	const vDomVar = (i = 0) => `_c${vDomIndex}`;

	const root = (options.root || __dirname).replace(/\/$/, '');
	let isBase = false;
	if (!data.baseRoot) {
		isBase = true;
		data.baseRoot = root;
	}
	const baseRoot = data.baseRoot;

	let include;
	if (options.include) {
		include = options.include;
	}
	else {
		include = async (tagName) => {
			const opts = {...options};

			let res = await tryParseFile(`${root}/${tagName}.marko`, opts, data);
			if (res) return res;

			res = await tryParseFile(`${root}/${tagName}/${tagName}.marko`, opts, data);
			if (res) return res;

			let dir = root;
			// eslint-disable-next-line no-constant-condition
			while (true) {
				// eslint-disable-next-line no-await-in-loop
				res = await tryParseFile(`${dir}/components/${tagName}.marko`, opts, data);
				if (res) return res;

				// eslint-disable-next-line no-await-in-loop
				res = await tryParseFile(`${dir}/components/${tagName}/${tagName}.marko`, opts, data);
				if (res) return res;

				if (dir === baseRoot) break;
				dir = path.dirname(dir);
				if (!dir || dir === '/') break;
			}

			const components = options.components || {};
			const tag = components[tagName];
			if (!tag) {
				throw new Error(`Component ${tagName} not found`);
			}

			if (typeof tag === 'string') {
				res = await tryParseFile(`${dir}/components/${tagName}.marko`, opts, data);
				if (res) return res;

				throw new Error(`Component ${tagName} not found`);
			}

			return tag.render;
		};
	}

	function write(str) {
		if (!str) return;
		if (!writing) {
			out += '$out += `';
		}
		out += str;
		writing = true;
	}

	function script(str) {
		if (!str) return;
		if (writing) {
			out += '`;\n';
		}
		out += str + '\n';
		writing = false;
	}

	function slotBegin() {
		outs.push([out, writing]);
		writing = false;
		out = 'let $out = "";\n';
	}

	function slotEnd() {
		if (writing) {
			out += '`;';
		}

		const res = out;
		[out, writing] = outs.pop();
		return res;
	}

	async function parseSlot(slotName, children) {
		if (!children.length) return;
		slotBegin();
		await parseDom(children);
		currentSlots[slotName] = slotEnd();
	}

	async function parseSlots(children) {
		if (!children.length) return '{}';
		const slots = {};
		const prevSlots = currentSlots;
		currentSlots = slots;
		await parseSlot('default', children);
		currentSlots = prevSlots;

		return '{' + Object.entries(slots).map(([name, val]) => {
			if (!val || val === 'let $out = "";\n') return '';
			return `${name}() {\n${val}\nreturn $out;\n}`;
		}).filter(Boolean).join(',\n') + '}';
	}

	function staticScript(str) {
		staticScriptStr += str + '\n';
	}

	async function addCustomTag(tagName) {
		const tagVar = `$tag_${tagName}`;
		if (!$customTags.has(tagName)) {
			const res = await include(tagName);
			$customTags.set(tagName, res.render);

			if (vdom) {
				return res.tagVar;
			}

			staticScript(`const ${tagVar} = $customTags.get('${tagName}');`);
		}
		return tagVar;
	}

	async function addCustomTagFromFile(tagName, file) {
		const tagVar = `$tag_${tagName}`;
		if (!$customTags.has(tagName)) {
			const res = await parseFile(file, {}, data);
			$customTags.set(tagName, res.render);

			if (vdom) {
				return res.tagVar;
			}

			staticScript(`const ${tagVar} = $customTags.get('${tagName}');`);
		}
		return tagVar;
	}

	function addRef(attributes, name, cls) {
		if (!name) {
			name = random();
			cls = cls || name;
		}
		if (!refs[name]) {
			cls = cls || random();
			refs[name] = cls;
		}
		if (!attributes._hasClass) {
			attributes._hasClass = true;
			attributes.push({
				name: 'class',
				value: `'${refs[name]}'`,
				literalValue: refs[name],
			});
		}

		return refs[name];
	}

	function $include(tagName) {
		const tag = $customTags.get(tagName);
		if (!tag) {
			throw new Error(`Component ${tagName} not found`);
		}
		return tag;
	}

	const dom = toDom(html);

	// eslint-disable-next-line complexity, max-statements
	const parseDom = async (node, {parentVar = '_c'} = {}) => {
		if (!node) return;
		if (Array.isArray(node)) {
			for (const n of node) {
				// eslint-disable-next-line no-await-in-loop
				await parseDom(n, {parentVar});
			}
			return;
		}

		const type = node.type;
		const tagName = node.tagName;

		if (tagName === 'class') {
			if (vdom) {
				// parse class tag
			}
			else {
				await parseFile(options.file, options, {
					...data,
					vdom: true,
				});
			}
		}
		else if (type === 'docType') {
			write(`<!${node.value}>`);
		}
		else if (type === 'declaration') {
			write(`<?${node.value}?>`);
		}
		else if (type === 'cdata') {
			write(`<![CDATA[${node.value}]]>`);
		}
		else if (type === 'comment') {
			// ignore comments
		}
		else if (type === 'text') {
			if (vdom) {
				script(`${parentVar}.push(${JSON.stringify(node.value)});`);
			}
			else {
				write(node.value);
			}
		}
		else if (type === 'placeholder') {
			if (vdom) {
				script(`${parentVar}.push(${node.value.replace(/^\$escape\((.*)\)/, '$1')});`);
			}
			else {
				write(`\${${node.value}}`);
			}
		}
		else if (type === 'script') {
			if (tagName === '#script') {
				script(node.value);
				return;
			}
			if (tagName === 'static') {
				staticScript(node.tagString);
				return;
			}
			if (tagName === 'import') {
				const {what, where} = node.value;
				let file = where;
				if (/^[/.]/.test(file)) {
					file = path.join(root, file);
					const markoFile = file.endsWith('.marko') ? file : `${file}.marko`;
					if (fs.existsSync(markoFile)) {
						await addCustomTagFromFile(what, markoFile);
						return;
					}
				}
				staticScript(`const ${what} = require('${file}');`);
			}
		}
		else if (tagName === 'style' && (node.isBlock || node.hasAttribute('ssr'))) {
			if (!vdom) {
				clientStyle.push(node.textContent);
			}
		}
		else if (tagName === 'script' && (node.isBlock || node.hasAttribute('ssr'))) {
			if (!vdom) {
				clientScript.push(node.textContent);
			}
		}
		else if (['if', 'else-if', 'for', 'while'].includes(node.tagName)) {
			const cond = node.argument.value;
			script(`${node.tagName.replace('-', ' ')} (${cond}) {`);
			await parseDom(node.children, {parentVar});
			script('}');
		}
		else if (['else'].includes(tagName)) {
			script(`${tagName} {`);
			await parseDom(node.children, {parentVar});
			script('}');
		}
		else if (tagName.startsWith('@')) {
			// slot
			await parseSlot(tagName.substring(1), node.children);
		}
		else if (tagName === 'slot') {
			const slotName = node.getAttribute('name')?.literalValue || 'default';
			write(`\${$slots.${slotName} ? $slots.${slotName}() : ''}`);
		}
		else if (['element', 'customElement'].includes(type)) {
			const attributes = [];
			const on = [];
			for (const attr of node.attributes) {
				if (attr.name.startsWith('on-')) {
					const event = attr.name.substring(3);
					const cond = attr.argument.value;
					const matches = cond.match(/^['"]([a-zA-Z0-9$_.]+)['"]$/);
					if (!matches) {
						throw new Error('only static values are allowed as event handlers');
					}
					const handler = matches[1];

					if (vdom) {
						on.push(`${event}: ${handler}`);
					}
					else {
						const refAttr = node.getAttribute('ref');
						const ref = refAttr ? refAttr.literalValue : addRef(attributes);

						// eslint-disable-next-line max-depth
						if (event === 'click') {
							clientScript.push(`$click($refs.${ref}, ${handler});`);
						}
						else {
							clientScript.push(`$event('${event}', $refs.${ref}, ${handler});`);
						}
					}
				}
				else if (attr.name === 'ref') {
					const val = attr.literalValue;
					if (!val) {
						throw new Error('only static values are allowed as refs');
					}

					addRef(attributes, val);
				}
				else if (attr.name === 'hidden') {
					const val = attr.literalValue;
					if (val === true) {
						attributes.push({
							name: 'class',
							value: '"hidden"',
							literalValue: 'hidden',
						});
					}
					else if (val == null) {
						attributes.push({
							name: 'class',
							value: `((${attr.value}) && "hidden")`,
						});
					}
				}
				else if (attr.name === 'json') {
					// json encode the value, can be decoded client side using $elJson(el)
					attributes.push({
						name: 'data--j',
						value: `$jsUrl(${attr.value})`,
					});
				}
				else {
					let value = attr.value;
					let literalValue = attr.literalValue;
					const regex = /([@])refs\.([a-zA-Z0-9_]+)\b/g;
					let matches;
					if (typeof value === 'string') {
						// eslint-disable-next-line no-cond-assign
						while (matches = regex.exec(value)) {
							const key = matches[2];
							const val = addRef([], key);
							attr.value = attr.value.replace(matches[0], val);
						}
					}
					if (typeof literalValue === 'string') {
						// eslint-disable-next-line no-cond-assign
						while (matches = regex.exec(literalValue)) {
							const key = matches[2];
							const val = addRef([], key);
							attr.literalValue = attr.literalValue.replace(matches[0], val);
						}
					}

					attributes.push(attr);
				}
			}

			if (nodeDepth === 0 && (!noStyleTags.has(tagName) || tagName.startsWith('$'))) {
				attributes.push({
					name: 'style',
					value: 'input.style',
				});
				attributes.push({
					name: 'class',
					value: 'input.class',
				});
			}

			nodeDepth++;

			if (type === 'element') {
				if (vdom) {
					vDomIndex++;
					const childVar = vDomVar();
					script(`const ${childVar} = [];`);
					await parseDom(node.children, {parentVar: childVar});
					const tagStr = tagName.startsWith('$') ? tagName.substring(2, tagName.length - 1) : `'${tagName}'`;
					const args = [];
					const arg2 = attrToObj(attributes, {camelCase: false});
					if (arg2 !== '{}') args.push(`attrs: ${arg2}`);
					if (on.length) args.push(`on: {${on.join(', ')}}`);
					script(`${parentVar}.push(h(${tagStr}, {${args.join(', ')}}, ${childVar}));`);
				}
				else {
					write(`<${tagName}${getAttr(attributes)}>`);
					if (!node.isSelfClosing) {
						await parseDom(node.children);
						write(`</${tagName}>`);
					}
				}
			}
			else if (tagName === 'include') {
				const [tag, input] = node.argument.value.split(',').map(s => s.trim());
				if (input) {
					attributes.unshift({
						name: `...${input}`,
						value: undefined,
					});
				}
				const slots = await parseSlots(node.children);
				write(`\${$include(${tag})(${attrToObj(attributes)}, $global, ${slots})}`);
			}
			else {
				const tagVar = await addCustomTag(tagName);
				if (vdom) {
					vDomIndex++;
					const childVar = vDomVar();
					script(`const ${childVar} = [];`);
					await parseDom(node.children, {parentVar: childVar});
					script(`${parentVar}.push(...${tagVar}(${attrToObj(attributes)}, ${childVar}));`);
				}
				else {
					const slots = await parseSlots(node.children);
					write(`\${${tagVar}(${attrToObj(attributes)}, $global, ${slots})}`);
				}
			}

			nodeDepth--;
		}
		else {
			throw new Error(`unknown node ${type}: ${tagName}`);
		}
	};

	await parseDom(dom);

	if (writing) {
		out += '`;';
	}

	if (!data.style) data.style = [];
	if (!data.script) data.script = [];

	const matchedRefs = new Set();
	let matches;
	const regex = /([$@])refs\.([a-zA-Z0-9_]+)\b/g;
	for (let i = 0; i < clientScript.length; i++) {
		let str = clientScript[i];
		// eslint-disable-next-line no-cond-assign
		while (matches = regex.exec(clientScript[i])) {
			const start = matches[1];
			const key = matches[2];
			if (start === '$') {
				matchedRefs.add(key);
			}
			else {
				const val = addRef([], key);
				str = str.replace(matches[0], val);
			}
		}
		clientScript[i] = str;
	}

	const str = [...matchedRefs].map((key) => {
		const val = refs[key];
		if (!val) {
			throw new Error(`ref ${key} not found in ${options.file} but referenced in JS`);
		}
		return `${key}: $selectByClass('${val}')`;
	}).join(', ');

	if (str) {
		clientScript.unshift(`const $refs = {${str}};`);
	}

	if (clientStyle.length) {
		data.style.push(clientStyle.join('\n')
			.replace(/\bref:([a-zA-Z0-9_]+)\b/g, (match, g1) => {
				const val = refs[g1];
				if (!val) {
					throw new Error(`ref ${g1} not found in ${options.file} but referenced in CSS`);
				}
				return `.${val}`;
			})
		);
	}

	// console.log('------- STATIC --------');
	// console.log(staticScriptStr.trim());
	// console.log('------- FUNC ----------');
	// console.log(out);
	// console.log('-----------------------');

	if (vdom) {
		// const tagVar = hash(options.file.replace(baseRoot, '').replace('.marko', ''));
		const tagVar = 'C_' + options.file
			.replace(baseRoot, '')
			.replace('.marko', '')
			.replace(/[^A-Za-z0-9_]/g, '_');
		let funcStr = `function (input) {\n${out}\nreturn _c;\n}`;
		if (staticScriptStr) {
			funcStr = `(function() {\n${staticScriptStr}\nreturn ${funcStr}\n})();`;
		}

		const ret = {
			tagVar,
			render: `const ${tagVar} = ${funcStr}`,
		};

		if (isBase) {
			const fullRender = [];
			compiledComponents.forEach((val, key) => {
				if (!key.startsWith('vdom:')) return;
				fullRender.push(val.render);
			});
			fullRender.push(ret.render);
			ret.fullRender = fullRender.join('\n\n');
		}

		return ret;
	}

	if (isBase) {
		const vDomScript = [];
		compiledComponents.forEach((val, key) => {
			if (!key.startsWith('vdom:')) return;
			vDomScript.push(val.render);
		});

		if (vDomScript.length) {
			data.script.push(vDomScript.join('\n\n'));
		}
	}

	if (isBase && Object.keys(clientScripts).length) {
		clientScripts.entry = Object.keys(clientScripts)
			.map(file => `import '${file}';`).join('\n') + clientScripts.join('\n');
	}
	else if (clientScript.length) {
		clientScripts[options.file.replace('.marko', '')] = clientScript.join('\n');
	}

	// eslint-disable-next-line no-eval
	const render = eval(`
		(function() {
			${staticScriptStr}
			return function render(input, $global = {}, $slots = {}) {\n${out}\nreturn $out;\n}
		})()
	`);

	if (isBase) {
		let script = '';
		if (Object.keys(clientScripts).length) {
			let bundled = await bundle(clientScripts, {
				dir: path.dirname(options.file),
			});

			script = globalJs + '\n' + bundled;
		}

		let style = '';
		if (data.style.length) {
			style = await parsePostcss(globalCss + '\n' + data.style.join('\n'), {
				file: options.file,
			});
		}

		return {
			render,
			style,
			script,
		};
	}

	return {
		render,
	};
}

module.exports = parse;
