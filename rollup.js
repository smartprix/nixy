const rollup = require('rollup');
const alias = require('@rollup/plugin-alias');
const {nodeResolve} = require('@rollup/plugin-node-resolve');
const {babel} = require('@rollup/plugin-babel');
const path = require('path');
const virtual = require('./rollupPluginVirtual');

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
		babel({
			babelrc: false,
			exclude: ['node_modules/**'],
			babelHelpers: 'bundled',
			presets: [
				[
					require.resolve('@babel/preset-env'), {
						useBuiltIns: false,
						loose: true,
						modules: false,
						targets: {
							// modules support
							// NOTE: safari 10.1 does support modules, but other features support is broken
							chrome: '61',
							firefox: '60',
							safari: '11.1',
						},
					},
				],
				require.resolve('babel-preset-solid'),
				// require.resolve('@babel/preset-typescript'),
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
