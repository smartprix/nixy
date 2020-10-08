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

function _toArr(refs) {
	if (!refs) return [];
	if (typeof refs === 'string') {
		return $select(refs);
	}
	return refs.length === undefined ? [refs] : refs;
}

function $action(refs, func) {
	forEach(_toArr(refs), (ref) => {
		if (!ref) return;
		if (!ref.length) func(ref);
		else forEach(ref, el => func(el));
	});
}

function $first(refs) {
	return _toArr(refs)[0];
}

function $event(event, selector, func) {
	const passive = ['scroll', 'touchmove', 'touchstart', 'touchend'].includes(event);
	$action(selector, (el) => {
		el.addEventListener(event, function (e) {
			if (!passive) {
				e.preventDefault();
				e.stopPropagation();
			}
			func.call(this, e);
		});
	});
}

function $click(selector, func) {
	$event('click', selector, func);
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

/** JSURL Decode */
(function(exports) {
	'use strict'
	var stringRE = /^[a-zA-Z]/
	var numRE = /^[\d-]/

	var dict = {
		T: true,
		F: false,
		N: null,
		U: undefined,
		n: NaN,
		I: Infinity,
		J: -Infinity,
	}

	var fromEscape = {
		'*': '*',
		_: '_',
		'-': '~',
		S: '$',
		P: '+',
		'"': "'",
		C: '(', // not necessary but we keep it for symmetry
		D: ')',
		L: '<',
		G: '>', // not necessary but we keep it for symmetry
		'.': '%',
		Q: '?',
		H: '#',
		A: '&',
		E: '=',
		B: '\\',
		N: '\n',
		R: '\r',
		U: '\u2028',
		Z: '\0',
	}
	function origChar(s) {
		if (s === '_') {
			return ' '
		}
		var c = fromEscape[s.charAt(1)]
		if (!c) {
			throw new Error('Illegal escape code', s)
		}
		return c
	}
	var escapeRE = /(_|\*.)/g
	function unescape(s) {
		// oddly enough, testing first is faster
		return escapeRE.test(s) ? s.replace(escapeRE, origChar) : s
	}
	function eat(a) {
		var j, c
		for (
			j = a.i;
			j < a.l && ((c = a.s.charAt(j)), c !== '~' && c !== ')');
			j++
		) {}
		var w = a.s.slice(a.i, j)
		if (c === '~') {
			j++
		}
		a.i = j
		return w
	}
	function peek(a) {
		return a.s.charAt(a.i)
	}
	function eatOne(a) {
		a.i++
	}
	var EOS = {} // unique symbol
	function decode(a) {
		var out, k, t
		var c = peek(a)
		if (!c) {
			return EOS
		}
		if (c === '(') {
			eatOne(a)
			out = {}
			while (((c = peek(a)), c && c !== ')')) {
				k = unescape(eat(a))
				c = peek(a)
				if (c && c !== ')') {
					t = decode(a)
				} else {
					t = true
				}
				out[k] = t
			}
			if (c === ')') {
				eatOne(a)
			}
		} else if (c === '!') {
			eatOne(a)
			out = []
			while (((c = peek(a)), c && c !== '~' && c !== ')')) {
				out.push(decode(a))
			}
			if (c === '~') {
				eatOne(a)
			}
		} else if (c === '_') {
			eatOne(a)
			k = unescape(eat(a))
			if (k.charAt(0) === 'D') {
				out = new Date(k.slice(1))
			} else if (k in dict) {
				out = dict[k]
			} else {
				throw new Error('Unknown dict reference', k)
			}
		} else if (c === '*') {
			eatOne(a)
			out = unescape(eat(a))
		} else if (c === '~') {
			eatOne(a)
			out = true
		} else if (numRE.test(c)) {
			out = Number(eat(a))
			if (isNaN(out)) {
				throw new Error('Not a number', c)
			}
		} else if (stringRE.test(c)) {
			out = unescape(eat(a))
		} else {
			throw new Error('Cannot decode part ' + [t].concat(a).join('~'))
		}
		return out
	}

	var JSONRE = /^({|\[|"|true$|false$|null$)/
	exports.parse = function(s, options) {
		if (JSONRE.test(s)) return JSON.parse(s)
		var l = s.length
		var r = decode({s: s, i: 0, l: l})
		return r === EOS ? true : r
	}

	exports.tryParse = function(s, def, options) {
		try {
			return exports.parse(s, options)
		} catch (ex) {
			return def
		}
	}
})((window.JSURL = window.JSURL || {}));

function $jsUrl(data, def) {
	return JSURL.tryParse(data, def);
}

function $elJson(ref, attr = 'data--j') {
	const el = $first(ref);
	if (!el) return;
	if (el._jjson === undefined) {
		el._jjson = $jsUrl(ref.getAttribute(attr));
	}
	return el._jjson;
}
