const postcss = require('postcss');
const autoprefixer = require('autoprefixer');
const presetEnv = require('postcss-preset-env');
const nested = require('postcss-nested');
const rem = require('postcss-rem');

const plugins = [
	autoprefixer(),
	presetEnv({
		browsers: '> 1%, last 2 versions, Firefox ESR, not dead',
		stage: 0,
		features: {
			// we are already using postcss-nested
			'nesting-rules': false,
		},
	}),
	nested(),
	rem({
		baseline: 13,
	}),
];

const parser = postcss(plugins);

module.exports = async function parse(css) {
	const result = await parser.process(css, {from: undefined, to: undefined});
	return result.css;
};
