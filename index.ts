import * as html2 from "htmlparser2";
import * as fs from "fs";
import * as t from "@babel/types";
import template from "@babel/template";
import generate from "@babel/generator";
import { program } from "commander";
program.version("0.1.0");

program
    .requiredOption("-i, --input <input>", "input file", "input/01-input.svg")
    .requiredOption("-o, --output <output>", "output file", "out.js");

program.parse(process.argv);
fs.readFile(program.input, { encoding: "utf8" }, (err, data) => {
    if (err) {
        console.error(err);
    } else {
        translateSource(data, program.output);
    }
});

const makePaintFunction = template(`
	function paint() {
		%%statements%%
	}
`);

const makeRectDrawStatements = template(`
	mgraphics.rectangle(%%x%%, %%y%%, %%w%%, %%h%%);
	mgraphics.fill();
`);

/**
 * This is where the interesting stuff happens. We'll read in the source data, build an AST,
 * create another AST, and then use that to generate an output in a new language.
 * @param data - Input data in SVG format
 * @param outPath - Path to which we'd like our result to be written
 */
function translateSource(data: string, outPath: string) {

	let paintStatements: t.Statement[] = [];

	const parser = new html2.Parser({
		onopentag(name: string, attribs: {[s: string]: string}) {
			if (name === "rect") {
				let x = t.numericLiteral(Number.parseFloat(attribs.x || "0"));
				let y = t.numericLiteral(Number.parseFloat(attribs.y || "0"));
				let w = t.numericLiteral(Number.parseFloat(attribs.width || "0"));
				let h = t.numericLiteral(Number.parseFloat(attribs.height || "0"));
				const rectStatements = makeRectDrawStatements({ x, y, w, h });
				paintStatements = paintStatements.concat(rectStatements);
			}
		}
	});

	parser.parseComplete(data);

	const paintFunction = ([] as t.Statement[]).concat(makePaintFunction({ statements: paintStatements }));
	const programAST = t.program(paintFunction);

	// Somehow turn our program AST into an outputString
	const outputString = generate(programAST).code;

    fs.writeFile(outPath, outputString, { encoding: "utf8" }, () => {
        console.log(`Wrote output to ${outPath}`);
    });
}
