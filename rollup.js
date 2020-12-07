const rollup = require('rollup');
const virtual = require('@rollup/plugin-virtual');
const alias = require('@rollup/plugin-alias');
const {nodeResolve} = require('@rollup/plugin-node-resolve');
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
	const plugins = [
		virtual(entries),
		alias({
			entries: [
				{find: /^@\/(.*)$/, replacement: path.join(dir, '$1')},
			],
		}),
		nodeResolve(),
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
