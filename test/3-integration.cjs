const chai = require("chai");
const expect = chai.expect;

const fs = require("fs");
const path = require("path");

const capcon = require("capture-console");

let rootDir = path.join(__dirname, "assets");

const {setupConsole, buildTargetDir, convert, normaliseString, TARGET} = require("../src/converter.cjs");

describe("The converter tool", function ()
{
    this.timeout(10000);

    before(function ()
    {
        setupConsole();

        // Prepare actual folder
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

    beforeEach(() =>
    {
        const workingDir = path.join(__dirname, "..");
        process.chdir(workingDir);
    });

    after(function ()
    {
        // Delete test noises
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
        // Regenerate .html files on every test
        const index1 = path.join(rootDir, "actual", "index.html");
        const index2 = path.join(rootDir, "actual", "index-2.html");
        const index3 = path.join(rootDir, "actual", "other.html");

        fs.rmSync(index1);
        fs.rmSync(index2);
        fs.rmSync(index3);

        fs.copyFileSync(path.join(rootDir, "index.html"), index1);
        fs.copyFileSync(path.join(rootDir, "index-2.html"), index2);
        fs.copyFileSync(path.join(rootDir, "other.html"), index3);

        // Regenerate package.json on every test
        const packageJsonPath = path.join(rootDir, "package.json");
        if (fs.existsSync(packageJsonPath))
        {
            fs.rmSync(packageJsonPath);
        }
        fs.copyFileSync(path.join(rootDir, "given", "package.json"), packageJsonPath);
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

        it("should convert ./given/demo-test.cjs into ./expected/demo-test.mjs", async function ()
        {
            const input = "./test/assets/given/demo-test.cjs";
            const options = {
                input,
                "output"    : path.join(rootDir, "/actual"),
                "noHeader"  : false,
                "withreport": true
            };

            const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test.mjs"), "utf8");
            await convert(options);
            const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test.mjs"), "utf8");

            expect(converted).to.equal(expectedConversion);
        });

        it("should convert ./given/demo-test-2.cjs into ./expected/demo-test-2.mjs", async function ()
            {
                const input = "./test/assets/given/demo-test-2.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                    "noheader"  : false,
                    "withreport": true
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-2.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-2.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert ./given/demo-test-3.cjs into ./expected/demo-test-3.mjs", async function ()
            {
                const input = "./test/assets/given/demo-test-3.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                    "target"    : TARGET.BROWSER,
                    "noheader"  : false,
                    "withreport": true
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-3.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-3.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert ./given/demo-test-4.cjs into ./expected/demo-test-4.mjs", async function ()
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

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should parse with regex and convert ./given/demo-test-6.cjs into ./expected/demo-test-6.mjs", async function ()
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

                expect(converted).to.equal(expectedConversion);
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

                expect(converted).to.equal(expectedConversion);
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

                expect(converted).to.equal(expectedConversion);
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

                expect(converted).to.equal(expectedConversion);
            }
        );

        /**
         * Testing:
         * $> toesm --input="assets/given/demo-test-10.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
         */
        it("should solve rgb-hex-cjs into /rgb-hex when specified on the replaceModules key in the config file",
            async function ()
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
                    target      : TARGET.BROWSER
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-10.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-10.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should apply directives correctly when the target is the browser", async function ()
            {
                const input = "./test/assets/given/demo-test-12.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.BROWSER
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-12.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-12.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert file with ambiguous names", async function ()
            {
                const input = "./test/assets/given/demo-test-16.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-16.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-16.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should not have duplicated imports", async function ()
            {
                const input = "./test/assets/given/demo-test-17.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-17.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-17.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should transform require with .dot", async function ()
            {
                const input = "./test/assets/given/demo-test-18.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-18.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-18.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert indirect requires", async function ()
            {
                const input = "./test/assets/given/demo-test-19.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-19.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-19.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should not convert some special cases of exports", async function ()
            {
                const input = "./test/assets/given/demo-test-20.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-20.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-20.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should move imports to top level - 1", async function ()
            {
                const input = "./test/assets/given/demo-test-21.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-21.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-21.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should move imports to top level - 2", async function ()
            {
                const input = "./test/assets/given/demo-test-22.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-22.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-22.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert source when comments or strings contain dollar signs", async function ()
            {
                const input = "./test/assets/given/demo-test-23.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-23.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-23.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should have debug mode information", async function ()
            {
                const input = "./test/assets/given/demo-test-24.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                    debug     : true
                };

                await convert(options);
                expect(fs.existsSync("debug/dump-0001-demo-test-24--read-file.js")).to.be.true;
            }
        );

        it("should no broken exports", async function ()
            {
                const input = "./test/assets/given/demo-test-25.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-25.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-25.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert string with regexes correctly", async function ()
            {
                const input = "./test/assets/given/demo-test-26.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-26.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-26.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert exports = module.exports correctly", async function ()
            {
                const input = "./test/assets/given/demo-test-27.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-27.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-27.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert the to-ansi module", async function ()
            {
                const input = "./test/assets/given/demo-test-28.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.ESM,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-28.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-28.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should bundle correctly", async function ()
            {
                process.chdir(path.join(__dirname, ".."));
                const input = "./test/assets/given/demo-test-29.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.BROWSER,
                    bundle    : path.join(rootDir, "/actual/demo-test-29.min.mjs"),
                };

                let expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-29.min.mjs"), "utf8");
                expectedConversion = normaliseString(expectedConversion);

                await convert(options);
                let converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-29.min.mjs"), "utf8");
                converted = normaliseString(converted);

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert analogger", async function ()
            {
                const input = "./test/assets/given/ana-logger.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.BROWSER,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "ana-logger.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "ana-logger.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should apply directives correctly when the target is all", async function ()
            {
                const input = "./test/assets/given/demo-test-13.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : "all",
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-13.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-13.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should apply directives correctly when the target is browser", async function ()
            {
                const input = "./test/assets/given/demo-test-13-bis.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": false,
                    "target"  : TARGET.BROWSER
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-13-bis.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-13-bis.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
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
                    "html"      : htmlPattern,
                };

                await convert(options);

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "index.html"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "actual", "index.html"), "utf8");
                expect(converted).to.equal(expectedConversion);
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
                    "html"      : htmlPattern,
                };

                await convert(options);

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "index-2.html"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "actual", "index-2.html"), "utf8");
                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should fail ./given/demo-bad-syntax.cjs into ./expected/demo-bad-syntax.mjs", async function ()
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

        it("should modify entry points in the package.json", async function ()
            {
                process.chdir("./test/assets");
                const input = "./given/demo-test-14.cjs";
                const options = {
                    input,
                    "output"    : "./actual",
                    "noheader"  : false,
                    "target"    : TARGET.ESM,
                    "entrypoint": "./given/demo-test-14.cjs",
                    "update-all": true
                };

                await convert(options);
                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "package.json"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
                process.chdir("../..");
                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should modify entry points in the package-1.json", async function ()
            {
                const packageJsonPath = path.join(rootDir, "package.json");
                if (fs.existsSync(packageJsonPath))
                {
                    fs.rmSync(packageJsonPath);
                }
                fs.copyFileSync(path.join(rootDir, "given", "package-1.json"), packageJsonPath);

                process.chdir("./test/assets");
                const input = "./given/demo-test-14.cjs";
                const options = {
                    input,
                    "output"    : "./actual",
                    "noheader"  : false,
                    "target"    : TARGET.ESM,
                    "entrypoint": "./given/demo-test-14.cjs",
                    "update-all": true
                };

                await convert(options);
                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "package-1.json"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
                process.chdir("../..");
                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should modify entry points in the package-2.json", async function ()
            {
                const packageJsonPath = path.join(rootDir, "package.json");
                if (fs.existsSync(packageJsonPath))
                {
                    fs.rmSync(packageJsonPath);
                }
                fs.copyFileSync(path.join(rootDir, "given", "package-2.json"), packageJsonPath);

                console.log(process.cwd());
                process.chdir("./test/assets");
                console.log(process.cwd());
                const input = "./given/demo-test-14.cjs";
                const options = {
                    input,
                    "output"    : "./actual",
                    "noheader"  : false,
                    "target"    : TARGET.ESM,
                    "entrypoint": "./given/demo-test-14.cjs",
                    "update-all": true
                };

                await convert(options);
                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "package-2.json"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
                process.chdir("../..");
                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should not generate headers", async function ()
            {
                const input = "./test/assets/given/demo-test-31.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": true,
                    "target"  : TARGET.BROWSER
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-31.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-31.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should replace json import", async function ()
            {
                const input = "./test/assets/given/demo-test-32.cjs";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": true,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-32.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-32.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should modify entry points in the package-3.json", async function ()
            {
                const packageJsonPath = path.join(rootDir, "package.json");
                if (fs.existsSync(packageJsonPath))
                {
                    fs.rmSync(packageJsonPath);
                }
                fs.copyFileSync(path.join(rootDir, "given", "package-3.json"), packageJsonPath);

                process.chdir("./test/assets");
                const input = "./given/demo-test-14.cjs";
                const options = {
                    input,
                    "output"    : "./actual",
                    "noheader"  : false,
                    "target"    : TARGET.ESM,
                    "entrypoint": "./given/demo-test-14.cjs",
                    "update-all": true
                };

                await convert(options);
                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "package-3.json"), "utf8");
                const converted = fs.readFileSync(path.join(rootDir, "package.json"), "utf8");
                process.chdir("../..");
                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should bundle input files", async function ()
            {
                process.chdir("./test/assets");
                const input = "./given/demo-test-14.cjs";
                const options = {
                    input,
                    "output"    : "./actual",
                    "noheader"  : false,
                    "target"    : "all",
                    "entrypoint": "./given/demo-test-14.cjs",
                    "update-all": false,
                    bundle      : "./actual/demo-test.min.mjs"
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test.min.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test.min.mjs"), "utf8");

                expect(normaliseString(converted)).to.equal(normaliseString(expectedConversion));
            }
        );

        it("should not generate anything", async function ()
            {
                const input = "";
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": true,
                    "target"  : TARGET.BROWSER
                };

                const result = await convert(options);
                expect(result).to.be.false;
            }
        );

        it("should not generate anything when given files are an array of missing .js", async function ()
            {
                const input = ["aaa.js"];
                const options = {
                    input,
                    "output"  : path.join(rootDir, "/actual"),
                    "noheader": true,
                    "target"  : TARGET.BROWSER
                };

                const result = await convert(options);
                expect(result).to.be.false;
            }
        );

        it("should not try to convert module require with non relative paths when target is esm", async function ()
            {
                const input = "./test/assets/given/demo-test-33.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: true,
                    target  : TARGET.ESM
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-33.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-33.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        // TODO: Fix trailing semi-colon
        it("should try to convert modules with non relative paths when target is browser", async function ()
            {
                const input = "./test/assets/given/demo-test-34.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: true,
                    target  : TARGET.BROWSER
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-34.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-34.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert code with regexes correctly", async function ()
            {
                const input = "./test/assets/given/demo-test-35.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: true,
                    target  : TARGET.BROWSER,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-35.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-35.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should export a function correctly despite comments", async function ()
            {
                const input = "./test/assets/given/demo-test-35.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: true,
                    target  : TARGET.BROWSER,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-35.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-35.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should export correctly despite comments", async function ()
            {
                const input = "./test/assets/given/demo-test-36.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: true,
                    target  : TARGET.BROWSER,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-36.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-36.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should export correctly with two different exports", async function ()
            {
                const input = "./test/assets/given/demo-test-37.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: true,
                    target  : TARGET.BROWSER,
                };

                const captured = capcon.captureStdio(async function ()
                {
                    await convert(options);
                });

                expect(captured.stdout).to.contain("2 default exports detected");
            }
        );

        it("should convert the Analogger code correctly", async function ()
            {
                const input = "./test/assets/given/analogger/analogger-test.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    target  : TARGET.BROWSER,
                    "useImportMaps": true
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "analogger-test.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "analogger-test.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should convert script with shebang", async function ()
            {
                const input = "./test/assets/given/demo-test-38.cjs";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: false,
                    target  : TARGET.BROWSER,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-38.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-38.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );

        it("should not try to convert an esm file", async function ()
            {
                const input = "./test/assets/given/demo-test-39.js";
                const options = {
                    input,
                    output  : path.join(rootDir, "/actual"),
                    noheader: false,
                    target  : TARGET.BROWSER,
                };

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-39.mjs"), "utf8");
                await convert(options);
                const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test-39.mjs"), "utf8");

                expect(converted).to.equal(expectedConversion);
            }
        );


    });


});