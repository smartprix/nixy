function forEach(item, fn) {
	Array.prototype.forEach.call(item, fn);
}

const $watchers = new Map();
function $watch(prop, fn) {
	let handlers = $watchers.get(prop);
	if (!handlers) {
		$watchers.set(prop, handlers = []);
	}
	handlers.push(fn);
}

const $state = new Proxy({}, {
	get(obj, prop) {
		return obj[prop];
	},
	set(obj, prop, value) {
		const oldValue = obj[prop];
		const handlers = $watchers.get(prop);
		obj[prop] = value;
		if (handlers && oldValue !== value) {
			handlers.forEach(fn => fn(value, oldValue));
		}
		return true;
	},
});

function $style(obj) {
	return Object.entries(obj).map(([key, val]) => {
		if (!val) return false;
		return `${key}: ${val}`;
	}).filter(Boolean).join('; ');
}

function $select(selector) {
	return document.querySelectorAll(selector);
}

function $selectByClass(cls) {
	return document.getElementsByClassName(cls);
}

function $event(event, selector, func) {
	const list = typeof selector === 'string' ? $select(selector) : selector;
	forEach(list, (node) => {
		node.addEventListener(event, function (e) {
			e.preventDefault();
			e.stopPropagation();
			func.call(this, e);
		});
	});
}

function $click(selector, func) {
	$event('click', selector, func);
}

function $action(refs, func) {
	refs = Array.isArray(refs) ? refs : [refs];
	forEach(refs, (ref) => {
		if (!ref) return;
		if (!ref.length) func(ref);
		else forEach(ref, el => func(el));
	});
}

function $addClass(refs, cls) {
	$action(refs, (el) => {
		el.classList.add(cls);
	});
}

function $removeClass(refs, cls) {
	$action(refs, (el) => {
		el.classList.remove(cls);
	});
}

function $replaceClass(refs, oldClass, newClass) {
	$action(refs, (el) => {
		el.classList.remove(oldClass);
		el.classList.add(newClass);
	});
}

function $show(refs) {
	$addClass(refs, 'hidden');
}

function $hide(refs) {
	$removeClass(refs, 'hidden');
}

const {html, render} = window.uhtml;

function $render(el, template) {
	if (!template) {
		el.classList.add('hidden');
		return render(el, html``);
	}

	render(el, template);
	el.classList.remove('hidden');
}

function $navigate(url) {
	window.location = url;
}
