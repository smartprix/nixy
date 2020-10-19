const parser = require('htmljs-parser');
const {htmlTags, htmlVoidTags} = require('./htmlInfo');

const tagRegExpCache = new Map();
function tagRegExp(tag) {
	const existing = tagRegExpCache.get(tag);
	if (existing) return existing;
	const reg = new RegExp(`^${tag}\\s*`);
	tagRegExpCache.set(tag, reg);
	return reg;
}

function getTagString(e, source) {
	const tagName = e.tagName;
	const tagString = source
		.substring(e.pos, e.endPos)
		.replace(/^<|\/>$|>$/g, '')
		.trim();

	let code = tagString.replace(tagRegExp(tagName), '').trim();
	if (code[0] === '{' && code[code.length - 1] === '}') {
		code = code.slice(1, -1).trim();
	}

	return code;
}

class DomNode {
	// type can be => element, customElement, script, text, placeholder, cdata, documentType, declaration, fragment, control
	type;
	// whether it's of type static {} or <static></static>
	isBlock;
	tagName;
	// value of the node
	value;
	// whole tag string including attributes
	tagString;
	// [{name, value, literalValue, argument}]
	attributes = [];
	// <if(i == 5)> => argument is {value: "i == 5"}
	argument;
	// computed
	innerHTML;
	// computed
	outerHTML;
	parent;
	children = [];
	// depth of the node
	depth = 0;

	get isSelfClosing() {
		return htmlVoidTags.has(this.tagName);
	}

	get prevSibling() {
		const children = this.parent.children;
		const indexThis = children.findIndex(node => node === this);
		if (indexThis <= 0) return null;
		return children[indexThis - 1];
	}

	get nextSibling() {
		const children = this.parent.children;
		const indexThis = children.findIndex(node => node === this);
		if (indexThis < 0 || indexThis >= children.length - 1) return null;
		return children[indexThis + 1];
	}

	get textContent() {
		if (this.isBlock) return this.tagString;
		if (this.type === 'text') return this.value;
		const children = this.children;
		let text = '';
		for (const child of children) {
			text += child.textContent;
		}
		return text;
	}

	hasAttribute(name) {
		return this.attributes.some(attr => attr.name === name);
	}

	getAttribute(name) {
		return this.attributes.find(attr => attr.name === name);
	}

	insertParent(node) {
		if (this.parent) {
			const children = this.parent.children;
			const newChildren = children.map((child) => {
				if (child === this) return node;
				return child;
			});
			this.parent.children = newChildren;
		}
		node.children = [this];
		node.depth = this.depth;
		this.parent = node;
		this.depth = node.depth + 1;
	}

	appendChild(node) {
		node.depth = this.depth + 1;
		node.parent = this;
		this.children.push(node);
	}
}

// eslint-disable-next-line max-statements
function toDom(html) {
	const rootNodes = [];
	let currentNode;
	let actualCurrentNode;

	function addNode(node, {isNode = true} = {}) {
		if (!currentNode) {
			rootNodes.push(node);
		}
		else {
			currentNode.appendChild(node);
		}

		if (isNode) currentNode = node;
		actualCurrentNode = node;
	}

	const marko = parser.createParser({
		onDocumentType(e) {
			// ignore comments
			const node = new DomNode();
			node.type = 'docType';
			node.tagName = '#docType';
			node.value = e.value;
			node.children = [];
			node.attributes = [];

			addNode(node, {isNode: false});
		},

		onDeclaration(e) {
			const node = new DomNode();
			node.type = 'declaration';
			node.tagName = '#declaration';
			node.value = e.value;
			node.children = [];
			node.attributes = [];

			addNode(node, {isNode: false});
		},

		onCDATA(e) {
			const node = new DomNode();
			node.type = 'cdata';
			node.tagName = '#cdata';
			node.value = e.value;
			node.children = [];
			node.attributes = [];

			addNode(node, {isNode: false});
		},

		onComment(e) {
			// ignore comments
			const node = new DomNode();
			node.type = 'comment';
			node.tagName = '#comment';
			node.value = e.value;
			node.children = [];
			node.attributes = [];

			addNode(node, {isNode: false});
		},

		// eslint-disable-next-line max-statements, complexity
		onOpenTag(e, source) {
			try {
				const tagName = e.tagName;
				const node = new DomNode();
				node.tagName = tagName;
				node.tagString = getTagString(e, source);

				const start = source.src[e.pos];
				node.isBlock = start !== '<';

				if (['static', 'style', 'script', 'template'].includes(tagName)) {
					marko.enterStaticTextContentState();
				}

				if (tagName === 'import') {
					const code = node.tagString.replace(/\s*;+$/, '');
					const matches = code.match(/^(.*)\s+from\s+(?:'|")(.*)(?:'|")$/);
					const what = matches[1];
					const where = matches[2];

					node.type = 'script';
					node.value = {
						what,
						where,
					};

					addNode(node);
					return;
				}

				if (tagName === 'static') {
					node.type = 'script';
					addNode(node);
					return;
				}

				if (['if', 'else-if', 'else', 'for', 'while'].includes(tagName)) {
					node.type = 'control';
					node.argument = e.argument;
					addNode(node);
					return;
				}

				const attributes = [];
				for (const attr of e.attributes) {
					if (['if', 'else-if', 'else', 'for', 'while'].includes(attr.name)) {
						const parentNode = new DomNode();
						parentNode.tagName = attr.name;
						parentNode.type = 'control';
						parentNode.attributes = [];
						parentNode.argument = attr.argument;
						parentNode.tagString = parentNode.argument ? `(${parentNode.argument.value})` : '';
						addNode(parentNode);

						node.__hasCondAttr = true;
					}
					else {
						attributes.push(attr);
					}
				}

				node.attributes = attributes;
				node.argument = e.argument;

				if (htmlTags.has(tagName) || tagName.startsWith('$')) {
					node.type = 'element';
				}
				else {
					node.type = 'customElement';
				}

				addNode(node);
			}
			catch (err) {
				console.error(err);
			}
		},

		onCloseTag(e) {
			if (currentNode.__hasCondAttr) {
				currentNode = currentNode.parent.parent;
			}
			else {
				currentNode = currentNode.parent;
			}
		},

		onText(e) {
			let value = e.value;
			if (/^ +$/.test(value)) {
				// preserve single space
				value = ' ';
			}
			else {
				value = value.trim();
				if (/[^\s] +$/) {
					// preserve single space at end
					value = value + ' ';
				}
				if (/^ +[^\s]/) {
					// preserve single space at start
					value = ' ' + value;
				}
				if (!value) return;
			}

			const node = new DomNode();
			node.type = 'text';
			node.tagName = '#text';
			node.value = value;
			node.originalValue = e.value;
			node.children = [];
			node.attributes = [];

			addNode(node, {isNode: false});
		},

		onPlaceholder(e) {
			if (e.withinTagName || e.withinString) {
				// ignore placeholder within tag name (handled by onOpenTag)
				return;
			}

			const value = e.value.trim();
			if (!value) return;

			const node = new DomNode();
			node.type = 'placeholder';
			node.tagName = '#placeholder';
			node.value = e.escape ? `$escape(${value})` : value;
			node.children = [];
			node.attributes = [];

			addNode(node, {isNode: false});
		},

		onScriptlet(e) {
			const value = e.value.trim();
			if (!value) return;

			const node = new DomNode();
			node.type = 'script';
			node.tagName = '#script';
			node.value = value;
			node.children = [];
			node.attributes = [];

			addNode(node, {isNode: false});
		},

		onString(e) {
			// This is unnecessary for now, as openTag already handles it
		},

		onError(e) {
			console.error(e);
		},
	});

	marko.parse(html);

	return rootNodes;
}

module.exports = {
	toDom,
	DomNode,
};
