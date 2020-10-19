const fs = require('fs');
const {compile} = require('../index');

const compileMap = new Map();

async function parse(name) {
	const cached = compileMap.get(name);
	if (cached) return cached;

	const compiled = await compile(fs.readFileSync(`${__dirname}/${name}.marko`).toString(), {
		root: __dirname,
		file: `${__dirname}/${name}.marko`,
	});

	compileMap.set(name, compiled);
	return compiled;
}

async function main() {
	const comp = await parse('Test');

	const style = comp.style;
	const script = comp.script;

	console.log(style);
	console.log(script);
	console.log(comp.render.toString());

	const out = comp.render({pos: 'mw_product_3'});
	console.log(out);

	console.assert(out === '<div><div data-pos="mw_product_3" class="sm-da" cla="height: 31.25vw"></div><div data-pos="mw_product_3" class="sm-da" cla="height: 31.25vw"></div><div class="box"><div class="header"><div class="title"><h3>A Box</h3></div><div class="actions"><a>View All →</a></div></div><a>Hello</a></div><div data--j="(a~b"></div></div>');

	console.time('render');
	for (let i = 1; i < 10000; i++) {
		comp.render({pos: 'mw_product_3'});
	}
	console.timeEnd('render');
}

process.on('unhandledRejection', (e) => {
	console.error('unhandled', e);
});

main();
