const path = require('path');

/* eslint-disable consistent-return */

const PREFIX = `virtual:`;

function virtual(modules) {
	const resolvedIds = new Map();

	Object.keys(modules).forEach((id) => {
		resolvedIds.set(path.resolve(id), modules[id]);
	});

	return {
		name: 'virtual',

		resolveId(id, importer) {
			if (id in modules) return PREFIX + id;
			if (`${id}.js` in modules) return PREFIX + `${id}.js`;

			if (importer) {
				// eslint-disable-next-line no-param-reassign
				if (importer.startsWith(PREFIX)) importer = importer.slice(PREFIX.length);
				const resolved = path.resolve(path.dirname(importer), id);
				if (resolvedIds.has(resolved)) return PREFIX + resolved;
				if (resolvedIds.has(`${resolved}.js`)) return PREFIX + `${resolved}.js`;
			}
		},

		load(id) {
			if (id.startsWith(PREFIX)) {
				// eslint-disable-next-line no-param-reassign
				id = id.slice(PREFIX.length);

				return id in modules ? modules[id] : resolvedIds.get(id);
			}
		}
	};
}

module.exports = virtual;
