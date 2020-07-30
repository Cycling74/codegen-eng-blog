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
	mgraphics.relative_coords = 1;

	function calcAspect() {
		var width = this.box.rect[2] - this.box.rect[0];
		var height = this.box.rect[3] - this.box.rect[1];
		return width/height;
	}

	function paint() {
		const aspect = calcAspect();

		%%statements%%
	}
`);

const makeRectDrawStatements = template(`
	mgraphics.rectangle(%%x%% * aspect, %%y%%, %%w%% * aspect, %%h%%);
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
	let viewBox: number[];

	const parser = new html2.Parser({
		onopentag(name: string, attribs: {[s: string]: string}) {
			if (name === "rect") {

				if (viewBox !== undefined) {
					let x = t.numericLiteral(
						2 * Number.parseFloat(attribs.x || "0") / viewBox[2] - 1
					);
					let y = t.numericLiteral(
						1 - 2 * Number.parseFloat(attribs.y || "0") / viewBox[3]
					);
					let w = t.numericLiteral(
						2 * Number.parseFloat(attribs.width || "0") / viewBox[2]
					);
					let h = t.numericLiteral(
						2 * Number.parseFloat(attribs.height || "0") / viewBox[3]
					);
					const rectStatements = makeRectDrawStatements({ x, y, w, h });
					paintStatements = paintStatements.concat(rectStatements);
				} else {
					console.warn("rect tag outside of svg parent tag with defined viewBox, skipping");
				}
			}

			else if (name === "svg") {
				// Split the viewbox string on spaces and convert to numbers
				viewBox = attribs["viewbox"].split(" ").map(Number.parseFloat);
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
