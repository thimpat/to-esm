const chai = require("chai");
const expect = chai.expect;
const chaiString = require("chai-string");
const EOL = require("os").EOL;
const sinon = require("sinon");

chai.use(chaiString);

const fs = require("fs");
const path = require("path");

let rootDir = path.join(__dirname, "assets");

const {buildTargetDir, convert} = require("../src/converter.cjs");

describe("The converter tool", function ()
{
    before(function ()
    {
        const assetsFolder = path.join(rootDir, "/actual");
        if (fs.existsSync(assetsFolder))
        {
            fs.rmSync(assetsFolder, {recursive: true});
        }

        fs.mkdirSync(assetsFolder, {recursive: true});

        fs.copyFileSync(path.join(rootDir, "index.html"), path.join(rootDir, "actual", "index.html"));
        fs.copyFileSync(path.join(rootDir, "index-2.html"), path.join(rootDir, "actual", "index-2.html"));
        fs.copyFileSync(path.join(rootDir, "other.html"), path.join(rootDir, "actual", "other.html"));
    });

    after(function ()
    {
        if (fs.existsSync(path.join(rootDir, "/esm2")))
        {
            // fs.rmSync(path.join(rootDir, "/esm"))
            fs.rmSync(path.join(rootDir, "esm2"), {recursive: true});
        }

        if (fs.existsSync(path.join(rootDir, "/esm2")))
        {
            fs.rmSync(path.join(rootDir, "esm3"), {recursive: true});
        }
    });

    beforeEach(function ()
    {
        const index1 = path.join(rootDir, "actual", "index.html");
        const index2 = path.join(rootDir, "actual", "index-2.html");
        const index3 = path.join(rootDir, "actual", "other.html");

        fs.rmSync(index1);
        fs.rmSync(index2);
        fs.rmSync(index3);

        fs.copyFileSync(path.join(rootDir, "index.html"), index1);
        fs.copyFileSync(path.join(rootDir, "index-2.html"), index2);
        fs.copyFileSync(path.join(rootDir, "other.html"), index3);
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

        it("should reject an invalid directory name", function ()
        {
            let targetDir3 = path.join(rootDir, "/esm3><");
            const res = buildTargetDir(targetDir3);
            expect(res).to.be.false;
        });

        it("should convert ./given/demo-test.cjs into ./expected/demo-test.esm", async function ()
        {
            const input = "./test/assets/given/demo-test.cjs";
            const options = {
                input,
                "output": path.join(rootDir, "/actual"),
                "noHeader": false,
                "withreport": true
            };

            const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test.mjs"), "utf8");
            await convert(options);
            const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test.mjs"), "utf8");

            expect(converted).to.equalIgnoreSpaces(expectedConversion);
        });

        it("should convert ./given/demo-test-2.cjs into ./expected/demo-test-2.esm", async function ()
            {
                const input = "./test/assets/given/demo-test-2.cjs";
                const options = {
                    input,
                    "output": path.join(rootDir, "/actual"),
                    "config": path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                    "noheader": false,
                    "withreport": true
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-2.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-2.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        it("should convert ./given/demo-test-3.cjs into ./expected/demo-test-3.esm", async function ()
            {
                const input = "./test/assets/given/demo-test-3.cjs";
                const options = {
                    input,
                    "output": path.join(rootDir, "/actual"),
                    "config": path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                    "noheader": false,
                    "withreport": true
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-3.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-3.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        it("should convert ./given/demo-test-4.cjs into ./expected/demo-test-4.esm", async function ()
            {
                const input = "./test/assets/given/demo-test-4.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
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

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        it("should parse with regex and convert ./given/demo-test-6.cjs into ./expected/demo-test-6.esm", async function ()
            {
                const input = "./test/assets/given/demo-test-6.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
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

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-6.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-6.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        /**
         * Testing:
         * $> toesm --input="assets/given/demo-test-7.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
         */
        it("should update the link in demo-test-7.cjs", async function ()
            {
                const input = "./test/assets/given/demo-test-7.cjs";
                /**
                 * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport: boolean,
                 *     config: string}}
                 */
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
                    "noheader"  : false,
                    "withreport": true,
                };

                // Conversion Link
                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-7.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-7.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        /**
         * Testing:
         * $> toesm --input="assets/given/demo-test-8.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
         */
        it("should convert the rgb-hex(rgb-hex) module entry point", async function ()
            {
                const input = "./test/assets/given/demo-test-8.cjs";
                /**
                 * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport: boolean,
                 *     config: string}}
                 */
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
                    "noheader"  : false,
                    "withreport": true,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected/node_modules/rgb-hex-cjs/", "index.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual/node_modules/rgb-hex-cjs/", "index.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        /**
         * Testing:
         * $> toesm --input="assets/given/demo-test-9.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
         */
        it("should solve rgb-hex-cjs into rgb-hex when specified with a replaceModules key in the config file", async function ()
            {
                const input = "./test/assets/given/demo-test-9.cjs";
                /**
                 * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport: boolean,
                 *     config: string}}
                 */
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm.json"),
                    "noheader"  : false,
                    "withreport": true,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-9.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-9.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        /**
         * Testing:
         * $> toesm --input="assets/given/demo-test-10.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
         */
        it("should solve rgb-hex-cjs into /rgb-hex when specified on the replaceModules key in the config file", async function ()
            {
                const input = "./test/assets/given/demo-test-10.cjs";
                /**
                 * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport: boolean,
                 *     config: string}}
                 */
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm-replace-modules.json"),
                    "noheader"  : false,
                    "withreport": true,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-10.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-10.mjs"), "utf8");

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        /**
         * Testing:
         * $> toesm --input="assets/given/demo-test-x.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
         * --html="assets/*.html
         */
        it("should generate an import maps into the parsed html files", async function ()
            {
                const input = "./test/assets/given/demo-test-x.cjs";
                const htmlPattern = "./test/assets/actual/*.html";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm.json"),
                    "noheader"  : false,
                    "withreport": true,
                    "html": htmlPattern,
                };

                await convert(options);

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "index.html"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "actual", "index.html"), "utf8");
                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        it("should handle weird conditions", async function ()
            {
                const input = "./test/assets/given/demo-test-11.cjs";
                const htmlPattern = "./test/assets/actual/index-2.html";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "assets/given/.toesm-invalid.json"),
                    "noheader"  : false,
                    "withreport": true,
                    "html": htmlPattern,
                };

                await convert(options);

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "index-2.html"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "actual", "index-2.html"), "utf8");
                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should fail ./given/demo-bad-syntax.cjs into ./expected/demo-bad-syntax.esm", async function ()
            {
                const input = "./test/assets/given/demo-bad-syntax.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                    "noheader"  : false,
                    "withreport": false,
                };

                const success = await convert(options);

                chai.expect(success).to.be.false;
            }
        );

        it("should fail ./given/demo-test-5.cjs when a glob is passed", async function ()
            {
                const input = "./test/assets/given/multi/**/*.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual/multi"),
                    "config"    : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
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


    });


});