const chai = require("chai");
const expect = chai.expect;
const chaiString = require("chai-string");
const sinon = require("sinon");

chai.use(chaiString);

const fs = require("fs");
const path = require("path");

let rootDir = path.join(__dirname, "virtual");

const {buildTargetDir, convert} = require("../src/converter.cjs");

describe("The converter tool", function ()
{
    before(function ()
    {
        fs.rmdirSync(path.join(rootDir, "/actual"), { recursive: true });
    });

    after(function ()
    {
        // fs.rmdirSync(path.join(rootDir, "/esm"))
        fs.rmdirSync(path.join(rootDir, "/esm2"), { recursive: true });
        fs.rmdirSync(path.join(rootDir, "/esm3"), { recursive: true });
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
                fs.rmdirSync(targetDir3);
            }
            const res = buildTargetDir(targetDir3);
            expect(res).to.be.true;
        });

        it("should convert ./cjs/demo-test.cjs into ./expected/demo-test.esm", async function ()
        {
            const input = "./test/virtual/cjs/demo-test.cjs";
            const options = {
                input,
                "output": path.join(rootDir, "/actual"),
                "noHeader": true,
                "withreport": true
            };

            const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test.mjs"), "utf8");
            await convert(options);
            const converted = fs.readFileSync(path.join(rootDir, "actual", "demo-test.mjs"), "utf8");

            expect(converted).to.equalIgnoreSpaces(expectedConversion);
        });

        it("should convert ./cjs/demo-test-2.cjs into ./expected/demo-test-2.esm", async function ()
            {
                const input = "./test/virtual/cjs/demo-test-2.cjs";
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
                const input = "./test/virtual/cjs/demo-test-3.cjs";
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

                expect(converted).to.equalIgnoreSpaces(expectedConversion);
            }
        );

        it("should convert ./cjs/demo-test-4.cjs into ./expected/demo-test-4.esm", async function ()
            {
                const input = "./test/virtual/cjs/demo-test-4.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "virtual", ".toesm.json"),
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
                const input = "./test/virtual/cjs/demo-test-6.cjs";
                const options = {
                    input,
                    "output"    : path.join(rootDir, "/actual"),
                    "config"    : path.join(__dirname, "virtual", ".toesm.json"),
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

        it("should fail ./cjs/demo-bad-syntax.cjs into ./expected/demo-bad-syntax.esm", async function ()
            {
                const input = "./test/virtual/cjs/demo-bad-syntax.cjs";
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
                const input = "./test/virtual/cjs/multi/**/*.cjs";
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