const chai = require("chai");
const expect = chai.expect;
const chaiString = require("chai-string");
const sinon = require("sinon");

chai.use(chaiString);

const fs = require("fs");
const path = require("path");

let rootDir = path.join(__dirname, "assets");

const {buildTargetDir, convert, normalisePath} = require("../src/converter.cjs");

describe("The converter tool", function ()
{
    before(function ()
    {
        const assetsFolder = path.join(rootDir, "/actual");
        if (fs.existsSync(assetsFolder))
        {
            fs.rmSync(assetsFolder, {recursive: true});
        }
    });

    after(function ()
    {
        if (fs.existsSync(path.join(rootDir, "/esm2")))
        {
            // fs.rmSync(path.join(rootDir, "/esm"))
            fs.rmSync(path.join(rootDir, "/esm2"), {recursive: true});
            fs.rmSync(path.join(rootDir, "/esm3"), {recursive: true});
        }
    });

    describe("from the file system", function ()
    {
        it("should create a directory to host esm files", function ()
        {
            const res = buildTargetDir(path.join(rootDir, "/actual"));
            expect(res).to.be.true;
        });

        it("should accept a directory to host esm files even when this directory already exists", function ()
        {
            let targetDir2 = path.join(rootDir, "/esm2");
            fs.mkdirSync(targetDir2, {recursive: true});
            const res = buildTargetDir(targetDir2);
            expect(res).to.be.true;
        });

        it("should reject an non-existent directory", function ()
        {
            let targetDir3 = path.join(rootDir, "/esm3");
            if (fs.existsSync(targetDir3))
            {
                fs.rmSync(targetDir3);
            }
            const res = buildTargetDir(targetDir3);
            expect(res).to.be.true;
        });

        it("should convert ./cjs/demo-test.cjs into ./expected/demo-test.esm", async function ()
        {
            const input = "./test/assets/cjs/demo-test.cjs";
            const options = {
                input,
                "output": path.join(rootDir, "/actual"),
                "noHeader": false,
                "withreport": true
            };

            const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test.mjs"), "utf8");
            await convert(options);
            const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test.mjs"), "utf8");

            expect(converted).to.equal(expectedConversion);
        });

        it("should convert ./cjs/demo-test-2.cjs into ./expected/demo-test-2.esm", async function ()
            {
                const input = "./test/assets/cjs/demo-test-2.cjs";
                const options = {
                    input,
                    "output": path.join(rootDir, "/actual"),
                    "config": path.join(__dirname, ".toesm.json"),
                    "noheader": false,
                    "withreport": true
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-2.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-2.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        it("should convert ./cjs/demo-test-3.cjs into ./expected/demo-test-3.esm", async function ()
            {
                const input = "./test/assets/cjs/demo-test-3.cjs";
                const options = {
                    input,
                    "output": path.join(rootDir, "/actual"),
                    "config": path.join(__dirname, ".toesm.json"),
                    "noheader": false,
                    "withreport": true
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-3.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-3.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert ./cjs/demo-test-4.cjs into ./expected/demo-test-4.esm", async function ()
            {
                const input = "./test/assets/cjs/demo-test-4.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets", ".toesm.json"),
                    "noheader"  : false,
                    "withreport": true,
                    replaceStart: [
                        {
                            "search" : "/const\\s+ttt\\s*=\\s*require\\(.mama-magnimus.\\);/g",
                            "replace": "// ***",
                            "regex"  : true
                        }
                    ],
                    replaceEnd  : [
                        {
                            "search" : "// ***",
                            "replace": "// --------- mama-magnimus was replaced ----------------"
                        }
                    ]
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-4.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-4.mjs"), "utf8");

                expect(expectedConversion).to.equalIgnoreSpaces(converted);
            }
        );

        it("should parse with regex and convert ./cjs/demo-test-6.cjs into ./expected/demo-test-6.esm", async function ()
            {
                const input = "./test/assets/cjs/demo-test-6.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets", ".toesm.json"),
                    "noheader"  : false,
                    "withreport": true,
                    "solvedep"  : true,
                    replaceStart: [
                        {
                            "search" : "/const\\s+ttt\\s*=\\s*require\\(.mama-magnimus.\\);/g",
                            "replace": "// ***",
                            "regex"  : true
                        }
                    ],
                    replaceEnd  : [
                        {
                            "search" : "// ***",
                            "replace": "// --------- mama-magnimus was replaced ----------------"
                        }
                    ]
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-6.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-6.mjs"), "utf8");

                expect(expectedConversion).to.equalIgnoreSpaces(converted);
            }
        );

        it("should parse html files and add importmaps to them", async function ()
            {
                const input = "./test/assets/cjs/demo-test-7.cjs";
                /**
                 * @example
                 * CLI equivalent:
                 * toesm --input="assets/cjs/demo-test-7.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
                 * --html="assets/*.html"
                 * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport: boolean,
                 *     config: string}}
                 */
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets", ".toesm.json"),
                    "noheader"  : false,
                    "importmaps": true,
                    "withreport": true,
                    "html": "./test/assets/*.html",
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-7.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-7.mjs"), "utf8");

                expect(expectedConversion).to.equal(converted);
            }
        );

        it("should fail ./cjs/demo-bad-syntax.cjs into ./expected/demo-bad-syntax.esm", async function ()
            {
                const input = "./test/assets/cjs/demo-bad-syntax.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, ".toesm.json"),
                    "noheader"  : false,
                    "withreport": false,
                };

                const success = await convert(options);

                chai.expect(success).to.be.false;
            }
        );

        it("should fail ./cjs/demo-test-5.cjs when a glob is passed", async function ()
            {
                const input = "./test/assets/cjs/multi/**/*.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual/multi"),
                    "config"    : path.join(__dirname, ".toesm.json"),
                    "noheader"  : false,
                    "withreport": false,
                };

                const success = await convert(options);

                chai.expect(success).to.be.false;
            }
        );

        it("should do nothing when the list of files is empty", async function ()
            {
                const result = await convert();
                chai.expect(result).to.be.false;
            }
        );

        // Test for --solvedep


    });


});