const postcss = require('postcss');
const atImport = require("postcss-import");
const autoprefixer = require('autoprefixer');
const presetEnv = require('postcss-preset-env');
const nested = require('postcss-nested');
const rem = require('postcss-rem');

const plugins = [
	atImport(),
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

module.exports = async function parse(css, {file}) {
	const result = await parser.process(css, {
		from: file,
		to: undefined,
	});
	return result.css;
};
