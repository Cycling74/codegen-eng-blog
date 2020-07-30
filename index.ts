import * as html2 from "htmlparser2";
import * as fs from "fs";
import * as t from "@babel/types";
import template from "@babel/template";
import generate from "@babel/generator";
import * as csstree from "css-tree";
import { program } from "commander";
program.version("0.1.0");

program
    .requiredOption("-i, --input <input>", "input file", "input/02-input.svg")
    .requiredOption("-o, --output <output>", "output file", "out.js");

program.parse(process.argv);
fs.readFile(program.input, { encoding: "utf8" }, (err, data) => {
    if (err) {
        console.error(err);
    } else {
        translateSource(data, program.output);
    }
});

function createLegalName(name: string) {
	return name.replace(/[^_a-zA-Z0-9]/g, "_");
}

function hexColorToColorArray(colorAsHex: string) {
	let result = [];
	for (let i = 0; i < colorAsHex.length;) {
		let chars;
		if (colorAsHex.length > 4) {
			chars = colorAsHex.slice(i, i + 2);
		} else {
			chars = colorAsHex.slice(i, i + 1);
		}

		let nval = Number.parseInt(chars, 16);
		if (chars.length < 2) {
			result.push(nval / 15);
		} else {
			result.push(nval / 255);
		}

		i += chars.length;
	}

	while (result.length < 4) {
		result.push(1.0);
	}
	return result;
}

const makeStyleFunction = template(`
	function %%styleFunctionName%%() {
		mgraphics.set_source_rgba(%%r%%, %%g%%, %%b%%, %%a%%);
	}
`);

const makePaintFunction = template(`
	mgraphics.relative_coords = 1;

	%%styleFunctions%%

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

const makeStyledRectDrawStatements = template(`
	mgraphics.save();
	%%styleFunctionName%%();
	mgraphics.rectangle(%%x%% * aspect, %%y%%, %%w%% * aspect, %%h%%);
	mgraphics.fill();
	mgraphics.restore();
`);

/**
 * This is where the interesting stuff happens. We'll read in the source data, build an AST,
 * create another AST, and then use that to generate an output in a new language.
 * @param data - Input data in SVG format
 * @param outPath - Path to which we'd like our result to be written
 */
function translateSource(data: string, outPath: string) {

	let styleFunctions: t.Statement[] = [];
	let paintStatements: t.Statement[] = [];
	let viewBox: number[];
	let inStyle = false;

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
					let rectStatements;
					if (attribs.class) {
						const styleFunctionName = t.identifier(createLegalName(attribs.class));
						rectStatements = makeStyledRectDrawStatements({ styleFunctionName, x, y, w, h });
					} else {
						rectStatements = makeRectDrawStatements({ x, y, w, h });
					}
					paintStatements = paintStatements.concat(rectStatements);
				} else {
					console.warn("rect tag outside of svg parent tag with defined viewBox, skipping");
				}
			}

			else if (name === "svg") {
				// Split the viewbox string on spaces and convert to numbers
				viewBox = attribs["viewbox"].split(" ").map(Number.parseFloat);
			}

			else if (name === "style") {
				inStyle = true;
			}
		},

		ontext(data: string) {
			if (inStyle) {

				let styleFunctionName;
				let inDeclaration = false;

				const cssast = csstree.parse(data);

				csstree.walk(cssast, {
					enter(node: csstree.CssNode) {
						if (node.type === "Rule") {
							// Reset state machine
							styleFunctionName = undefined;
						}

						else if (node.type === "ClassSelector") {
							styleFunctionName = createLegalName(node.name);
						}

						else if (node.type === "Declaration") {
							inDeclaration = true;
						}

						else if (node.type === "HexColor") {
							if (inDeclaration && styleFunctionName) {
								const color = hexColorToColorArray(node.value);
								styleFunctions = styleFunctions.concat(
									makeStyleFunction({
										styleFunctionName: t.identifier(styleFunctionName),
										r: t.numericLiteral(color[0]),
										g: t.numericLiteral(color[1]),
										b: t.numericLiteral(color[2]),
										a: t.numericLiteral(color[3])
									})
								);

								// Make sure we only have one
								styleFunctionName = undefined;
							}
						}
					},

					leave(node: csstree.CssNode) {
						if (node.type === "Declaration") {
							inDeclaration = false;
						}
					}
				});
			}
		},

		onclosetag(name) {
			if (name === "style") {
				inStyle = false;
			}
		}
	});

	parser.parseComplete(data);

	const paintFunction = ([] as t.Statement[]).concat(
		makePaintFunction({
			statements: paintStatements,
			styleFunctions: styleFunctions
		})
	);
	const programAST = t.program(paintFunction);

	// Somehow turn our program AST into an outputString
	const outputString = generate(programAST).code;

    fs.writeFile(outPath, outputString, { encoding: "utf8" }, () => {
        console.log(`Wrote output to ${outPath}`);
    });
}
