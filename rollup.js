const rollup = require('rollup');
const virtual = require('@rollup/plugin-virtual');
const alias = require('@rollup/plugin-alias');
const path = require('path');

/**
 * entries should be
	{
		entry: `import batman from './a/batcave'; console.log(batman);`,
		batcave: `export default 'hello';`,
		'./a/batcave': `import './yo'; export default 'hello2';`,
		'./a/yo': `export default 'hello3';`
	}
*/

async function build(entries, {dir} = {}) {
	// const normalisedEntries = {};
	// Object.entries(entries).forEach(([key, val]) => {
	// 	if (key.startsWith('./')) {
	// 		normalisedEntries[`/tmp/${key.substring(2)}`] = val;
	// 	}
	// 	else {
	// 		normalisedEntries[key] = val;
	// 	}
	// });

	const plugins = [
		virtual(entries),
		alias({
			entries: [
				{find: /^@\/(.*)$/, replacement: path.join(dir, '$1')},
			],
		}),
	];

	const inputOptions = {
		input: 'entry',
		plugins,
	};

	const outputOptions = {
		format: 'iife',
	};

	const cwd = process.cwd();
	process.chdir(dir);

	const bundle = await rollup.rollup(inputOptions);

	const {output} = await bundle.generate(outputOptions);

	let code = '';
	for (const chunkOrAsset of output) {
		if (chunkOrAsset.type === 'asset') {
			// For assets, this contains
			// {
			//   fileName: string,              // the asset file name
			//   source: string | Uint8Array    // the asset source
			//   type: 'asset'                  // signifies that this is an asset
			// }
			console.log('Asset', chunkOrAsset);
		}
		else {
			code += chunkOrAsset.code;
		}
	}

	process.chdir(cwd);
	return code;
}

module.exports = {
	bundle: build,
};
