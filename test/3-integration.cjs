const chai = require("chai");
const expect = chai.expect;

const fs = require("fs");
const path = require("path");

const {CaptureConsole} = require("@aoberoi/capture-console");

const {compareDir, switchToTestDirectory} = require("@thimpat/testutils");
const {setupConsole, buildTargetDir, normaliseString, transpileFiles, TARGET} = require("../src/converter.cjs");


switchToTestDirectory();
const testDir = path.join(__dirname, "assets");


/**
 * The absolute paths on the project against paths on the CI when they are
 * absolute, will not be the same.
 * So, we need to add these absolutely referenced files into the CI system
 */
const generateFilesInAbsolutePaths = () =>
{
    fs.copyFileSync("./assets/given/my-test-class-0.cjs", "/projects/to-esm/test/assets/given/my-test-class.cjs");
};

const generateHTML = (number = 1) =>
{
    // fs.copyFileSync(path.join(rootDir, "index.html"), path.join(rootDir, "actual", "index.html"));
    // fs.copyFileSync(path.join(rootDir, "index-2.html"), path.join(rootDir, "actual", "index-2.html"));
    // fs.copyFileSync(path.join(rootDir, "other.html"), path.join(rootDir, "actual", "other.html"));

    // Regenerate .html files on every test
    if (number === 1)
    {
        const index1 = path.join(testDir, "actual/index.html");
        fs.rmSync(index1, {force: true});
        fs.copyFileSync(path.join(testDir, "index.html"), index1);
    }
    else if (number === 2)
    {
        const index2 = path.join(testDir, "actual/index-2.html");
        fs.rmSync(index2, {force: true});
        fs.copyFileSync(path.join(testDir, "index-2.html"), index2);
    }
    else if (number === 3)
    {
        const index3 = path.join(testDir, "actual/other.html");
        fs.rmSync(index3, {force: true});
        fs.copyFileSync(path.join(testDir, "index-2.html"), index3);
    }

};

/**
 * Copy the package.json in the given/ folder to the folder up
 */
const generatePackageJson = (id = 1, targetDir = "") =>
{
    try
    {
        let rootDir = process.cwd();
        if (targetDir)
        {
            rootDir = path.join(__dirname, targetDir);
            process.chdir(rootDir);
        }

        console.log({lid: 1502, color: "yellow"}, `Current working directory: ${rootDir}`);

        // Regenerate package.json
        fs.copyFileSync(path.join(__dirname, "assets/given", `package-json/package-${id}.json`), path.resolve("package.json"));
    }
    catch (e)
    {
        console.error(e);
    }

};

describe("The converter tool", function ()
{
    this.timeout(30000);

    before(async function ()
    {
        setupConsole();

        // Prepare actual folder
        const actualFolder = path.join(testDir, "/actual");
        if (fs.existsSync(actualFolder))
        {
            fs.rmSync(actualFolder, {recursive: true});
        }

        fs.mkdirSync(actualFolder, {recursive: true});
    });

    beforeEach(function ()
    {
        const dir = path.join(__dirname, "assets/actual");
        fs.rmSync(dir, {recursive: true, force: true});
        buildTargetDir(path.join(testDir, "/actual"));
    });

    after(function ()
    {
        // Delete test noises
        if (fs.existsSync(path.join(testDir, "/esm2")))
        {
            // fs.rmSync(path.join(rootDir, "/esm"))
            fs.rmSync(path.join(testDir, "esm2"), {recursive: true});
        }

        if (fs.existsSync(path.join(testDir, "/esm2")))
        {
            fs.rmSync(path.join(testDir, "esm3"), {recursive: true});
        }
    });

    describe("from the file system", function ()
    {
        beforeEach(() =>
        {
            switchToTestDirectory();
        });

        describe("on initialising the test", function ()
        {
            it("should work in the test directory", function ()
            {
                const cwd = process.cwd().replace(/\\/g, "/");
                expect(cwd).to.contain("to-esm/test");
            });

            it("should create a directory to host esm files", function ()
            {
                const res = buildTargetDir(path.join(testDir, "/actual"));
                expect(res).to.be.true;
            });

            it("should accept a directory to host esm files even when this directory already exists", function ()
            {
                let targetDir2 = path.join(testDir, "/esm2");
                fs.mkdirSync(targetDir2, {recursive: true});
                const res = buildTargetDir(targetDir2);
                expect(res).to.be.true;
            });

            it("should reject an invalid directory name", function ()
            {
                let targetDir3 = path.join(testDir, "/esm3><");
                const res = buildTargetDir(targetDir3);
                expect(res).to.be.false;
            });
        });

        /**
         * NOTE: During the session, the package.json is in the assets/ folder
         * The working directory also uses the same folder
         */
        describe("on package.json", function ()
        {
            it("should modify entry points (package-1.json)", async function ()
                {
                    generatePackageJson(1, "./assets");

                    const input = "./given/demo-test-14.cjs";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        noheader    : false,
                        target      : TARGET.ESM,
                        entrypoint  : "./given/demo-test-14.cjs",
                        "update-all": true
                    };

                    await transpileFiles(options);

                    const actualConversion = fs.readFileSync(path.join(testDir, "package.json"), "utf8");
                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "package-json", "package-1.json"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should modify entry points (package-2.json)", async function ()
                {
                    generatePackageJson(2, "./assets");

                    const input = "./given/demo-test-14.cjs";
                    const options = {
                        input,
                        output      : "./actual",
                        noheader    : false,
                        target      : TARGET.ESM,
                        entrypoint  : "./given/demo-test-14.cjs",
                        "update-all": true
                    };

                    await transpileFiles(options);

                    const actualConversion = fs.readFileSync(path.join(testDir, "package.json"), "utf8");
                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "package-json", "package-2.json"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should modify entry points (package-3.json)", async function ()
                {
                    generatePackageJson(3, "./assets");

                    const input = "./given/demo-test-14.cjs";
                    const options = {
                        input,
                        output      : "./actual",
                        noheader    : false,
                        target      : TARGET.ESM,
                        entrypoint  : "./given/demo-test-14.cjs",
                        "update-all": true
                    };

                    await transpileFiles(options);

                    const actualConversion = fs.readFileSync(path.join(testDir, "package.json"), "utf8");
                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "package-json", "package-3.json"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should add the entry points (package-4.json)", async function ()
                {
                    generatePackageJson(4, "./assets");

                    const input = "./given/demo-test-14.cjs";
                    const options = {
                        input,
                        output      : "./actual",
                        noheader    : false,
                        target      : TARGET.ESM,
                        entrypoint  : "./given/demo-test-14.cjs",
                        "update-all": true
                    };

                    await transpileFiles(options);

                    const actualConversion = fs.readFileSync(path.join(testDir, "package.json"), "utf8");
                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "package-json", "package-4.json"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );
        });

        describe("on bundling", function ()
        {
            it("should bundle correctly", async function ()
                {
                    const input = "./assets/given/demo-test-29.cjs";
                    const options = {
                        input,
                        output          : path.join(testDir, "/actual"),
                        noheader        : false,
                        target          : TARGET.BROWSER,
                        "bundle-browser": path.join(testDir, "/actual/demo-test-29.min.mjs"),
                    };

                    await transpileFiles(options);

                    let expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-29.min.mjs"), "utf8");
                    expectConversion = normaliseString(expectConversion);

                    let actualConversion = fs.readFileSync(path.join(testDir, "actual", "demo-test-29.min.mjs"), "utf8");
                    actualConversion = normaliseString(actualConversion);

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should bundle input files", async function ()
                {
                    const input = "./given/demo-test-14.cjs";
                    const options = {
                        input,
                        output      : "./assets/actual",
                        noheader    : false,
                        target      : "all",
                        entrypoint  : "./assets/given/demo-test-14.cjs",
                        "update-all": false,
                        bundle      : "./assets/actual/demo-test.min.mjs"
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test.min.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "demo-test.min.mjs"), "utf8");

                    expect(normaliseString(actualConversion)).to.equal(normaliseString(expectConversion));
                }
            );
        });

        describe("on converting", function ()
        {

            it("should convert ./given/demo-test.cjs into ./expect/demo-test.mjs", async function ()
            {
                const input = path.resolve("./assets/given/demo-test.cjs");
                const output = path.join(testDir, "/actual");
                const options = {
                    input,
                    output,
                    noHeader: false,
                    rootDir : path.resolve("./assets/given")
                };

                await transpileFiles(options);

                // Assertions
                const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test.mjs"), "utf8");
                const actualConversion = fs.readFileSync(path.join(testDir, "actual", "demo-test.mjs"), "utf8");

                expect(actualConversion).to.equal(expectConversion);
            });

            it("should convert ./given/demo-test-2.cjs into ./expect/demo-test-2.mjs", async function ()
                {
                    const input = "./assets/given/demo-test-2.cjs";
                    const output = path.join(testDir, "/actual");
                    const options = {
                        input,
                        output,
                        config      : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                        noheader    : false,
                        "withreport": true
                    };

                    await transpileFiles(options);

                    // Assertions
                    const actualConversion = fs.readFileSync("./assets/actual/assets/given/demo-test-2.mjs", "utf8");
                    const expectConversion = fs.readFileSync("./assets/expect/demo-test-2.mjs", "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert ./given/demo-test-3.cjs into ./expect/demo-test-3.mjs", async function ()
                {
                    const input = "./assets/given/demo-test-3.cjs";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                        target      : TARGET.BROWSER,
                        noheader    : false,
                        "withreport": true
                    };

                    await transpileFiles(options);

                    // Assertions
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-3.mjs"), "utf8");
                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-3.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert ./given/demo-test-4.cjs into ./expect/demo-test-4.mjs", async function ()
                {
                    const input = "./assets/given/demo-test-4.cjs";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
                        noheader    : false,
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

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-4.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-4.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should parse with regex and convert ./given/demo-test-6.cjs into ./expect/demo-test-6.mjs", async function ()
                {
                    const input = "./assets/given/demo-test-6.cjs";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
                        noheader    : false,
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

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-6.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-6.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            /**
             * Testing:
             * $> toesm --input="assets/given/demo-test-7.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
             */
            it("should update the link in demo-test-7.cjs", async function ()
                {
                    const input = "./assets/given/demo-test-7.cjs";
                    /**
                     * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport:
                     *     boolean, config: string}}
                     */
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
                        noheader    : false,
                        "withreport": true,
                    };

                    // Conversion Link
                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-7.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-7.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            /**
             * Testing:
             * $> toesm --input="assets/given/demo-test-8.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
             */
            it("should convert the rgb-hex(rgb-hex) module entry point", async function ()
                {
                    const input = "./assets/given/demo-test-8.cjs";
                    /**
                     * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport:
                     *     boolean, config: string}}
                     */
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm-nohtml-pattern.json"),
                        noheader    : false,
                        "withreport": true,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect/", "rgb-hex-cjs-index.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual/node_modules/rgb-hex-cjs/", "index.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            /**
             * Testing:
             * $> toesm --input="assets/given/demo-test-9.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
             */
            it("should solve rgb-hex-cjs into rgb-hex when specified with a replaceModules key in the config file", async function ()
                {
                    const input = "./assets/given/demo-test-9.cjs";
                    /**
                     * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport:
                     *     boolean, config: string}}
                     */
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm.json"),
                        noheader    : false,
                        "withreport": true,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-9.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-9.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            /**
             * Testing:
             * $> toesm --input="assets/given/demo-test-10.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
             */
            it("should solve rgb-hex-cjs into /rgb-hex when specified on the replaceModules key in the config file",
                async function ()
                {
                    const input = "./assets/given/demo-test-10.cjs";
                    /**
                     * @type {{output: string, input: string, importmaps: boolean, noheader: boolean, withreport:
                     *     boolean, config: string}}
                     */
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm-replace-modules.json"),
                        noheader    : false,
                        "withreport": true,
                        target      : TARGET.BROWSER
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-10.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-10.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should apply directives correctly when the target is the browser", async function ()
                {
                    const input = "./assets/given/demo-test-12.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.BROWSER
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-12.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-12.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert file with ambiguous names", async function ()
                {
                    const input = "./assets/given/demo-test-16.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-16.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-16.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should not have duplicated imports", async function ()
                {
                    const input = "./assets/given/demo-test-17.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-17.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-17.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should transform require with .dot", async function ()
                {
                    const input = "./assets/given/demo-test-18.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-18.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-18.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert indirect requires", async function ()
                {
                    const input = "./assets/given/demo-test-19.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-19.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-19.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should not convert some special cases of exports", async function ()
                {
                    const input = "./assets/given/demo-test-20.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-20.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-20.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should move imports to top level - 1", async function ()
                {
                    const input = "./assets/given/demo-test-21.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-21.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-21.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should move imports to top level - 2", async function ()
                {
                    const input = "./assets/given/demo-test-22.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-22.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-22.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert source when comments or strings contain dollar signs", async function ()
                {
                    const input = "./assets/given/demo-test-23.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-23.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-23.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should have debug mode information", async function ()
                {
                    const input = "./assets/given/demo-test-24.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                        debug   : true
                    };

                    await transpileFiles(options);
                    expect(fs.existsSync("debug/dump-0001-demo-test-24--read-file.js")).to.be.true;
                }
            );

            it("should no broken exports", async function ()
                {
                    const input = "./assets/given/demo-test-25.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-25.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-25.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert string with regexes correctly", async function ()
                {
                    const input = "./assets/given/demo-test-26.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-26.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-26.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert exports = module.exports correctly", async function ()
                {
                    const input = "./assets/given/demo-test-27.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-27.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-27.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert the to-ansi module", async function ()
                {
                    const input = "./assets/given/demo-test-28.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-28.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-28.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );
        });

        describe("on the AnaLogger module", function ()
        {
            it("should convert anaLogger", async function ()
                {
                    const input = "./assets/given/ana-logger.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.BROWSER,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "ana-logger.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "ana-logger.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert the Analogger code correctly", async function ()
                {
                    const input = "./assets/given/analogger/analogger-test.cjs";
                    const options = {
                        input,
                        output       : path.join(testDir, "/actual"),
                        target       : TARGET.BROWSER,
                        noHeader     : true,
                        useImportMaps: true
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "analogger-test.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "analogger/analogger-test.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

        });

        describe("on directives", function ()
        {
            it("should apply directives correctly when the target is all", async function ()
                {
                    const input = "./assets/given/demo-test-13.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : "all",
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-13.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-13.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should apply directives correctly when the target is browser", async function ()
                {
                    const input = "./assets/given/demo-test-13-bis.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.BROWSER
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-13-bis.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-13-bis.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );
        });

        describe("on anything", function ()
        {
            before(() =>
            {
                generateFilesInAbsolutePaths();
            });

            beforeEach(async () =>
            {
                generatePackageJson("cases");
            });

            /**
             * Testing:
             * $> toesm --input="assets/given/demo-test-x.cjs" --output=assets/actual/ --config="assets/.toesm.cjs"
             * --html="assets/*.html
             */
            it("should generate an import maps into the parsed html files", async function ()
                {
                    const input = "./assets/given/demo-test-x.cjs";
                    const htmlPattern = "./assets/actual/*.html";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm.json"),
                        noheader    : false,
                        "withreport": true,
                        "html"      : htmlPattern,
                    };

                    generateHTML(1);

                    await transpileFiles(options);

                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "index.html"), "utf8");
                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "html-1", "index.html"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should handle weird conditions", async function ()
                {
                    const input = "./assets/given/demo-test-11.cjs";
                    const htmlPattern = "./assets/actual/index-2.html";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "assets/given/.toesm-invalid.json"),
                        noheader    : false,
                        "withreport": true,
                        "html"      : htmlPattern,
                    };

                    generateHTML(2);
                    await transpileFiles(options);

                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "index-2.html"), "utf8");
                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "index-2.html"), "utf8");
                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should fail ./given/demo-bad-syntax.cjs into ./expect/demo-bad-syntax.mjs", async function ()
                {
                    const input = "./assets/given/demo-bad-syntax.cjs";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        config      : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                        noheader    : false,
                        "withreport": false,
                    };

                    const success = (await transpileFiles(options)).success;

                    chai.expect(success).to.be.false;
                }
            );

            it("should fail ./given/demo-test-5.cjs when a glob is passed", async function ()
                {
                    const input = "./assets/given/multi/**/*.cjs";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual/multi"),
                        config      : path.join(__dirname, "given/.toesm-nohtml-pattern.json"),
                        noheader    : false,
                        "withreport": false,
                    };

                    const success = (await transpileFiles(options)).success;

                    chai.expect(success).to.be.false;
                }
            );

            it("should do nothing when the list of files is empty", async function ()
                {
                    const {success} = await transpileFiles();
                    chai.expect(success).to.be.false;
                }
            );

            it("should not generate headers", async function ()
                {
                    const input = "./assets/given/demo-test-31.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-31.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-31.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should replace json import", async function ()
                {
                    const input = "./assets/given/demo-test-32.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-32.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-32.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should not generate anything", async function ()
                {
                    const input = "";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER
                    };

                    const {success} = await transpileFiles(options);
                    expect(success).to.be.false;
                }
            );

            it("should not generate anything when given files are an array of missing .js", async function ()
                {
                    const input = ["aaa.js"];
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER
                    };

                    const {success} = await transpileFiles(options);
                    expect(success).to.be.false;
                }
            );

            it("should not try to convert module require with non relative paths when target is esm", async function ()
                {
                    const input = "./assets/given/demo-test-33.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-33.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-33.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should try to convert modules with non relative paths when target is browser", async function ()
                {
                    const input = "./assets/given/demo-test-34.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-34.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-34.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should convert code with regexes correctly", async function ()
                {
                    const input = "./assets/given/demo-test-35.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-35.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-35.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should export a function correctly despite comments", async function ()
                {
                    const input = "./assets/given/demo-test-35.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-35.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-35.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should export correctly despite comments", async function ()
                {
                    const input = "./assets/given/demo-test-36.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-36.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-36.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should export correctly with two different exports", async function ()
                {
                    const captureConsole = new CaptureConsole();
                    captureConsole.startCapture();

                    const input = "./assets/given/demo-test-37.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER,
                    };
                    await transpileFiles(options);

                    captureConsole.stopCapture();
                    const output = captureConsole.getCapturedText();

                    console.rawLog(output);
                    expect(output.join("\n")).to.contain("2 default exports detected");
                }
            );


            it("should convert script with shebang", async function ()
                {
                    const input = "./assets/given/demo-test-38.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.BROWSER,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-38.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-38.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should not try to convert an esm file", async function ()
                {
                    const input = "./assets/given/demo-test-39.js";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-39.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-39.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should remove code from the remove directive", async function ()
                {
                    const input = "./assets/given/demo-test-40.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-40.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-40.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should apply correctly directives", async function ()
                {
                    const input = "./assets/given/demo-test-41.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-41.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-41.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should apply correctly multiple time same directives", async function ()
                {
                    const input = "./assets/given/demo-test-42.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-42.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-42.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should correctly convert file requiring absolute path", async function ()
                {
                    const input = "./assets/given/demo-test-43.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                    };

                    if (!fs.existsSync("/projects/to-esm/test/assets/given/my-test-class.cjs"))
                    {
                        fs.copyFileSync("./assets/given/my-test-class.cjs", "/projects/to-esm/test/assets/given/my-test-class.cjs");
                    }

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-43.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-43.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should not break the $$ sign", async function ()
                {
                    const input = "./assets/given/demo-test-44.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-44.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-44.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should not take into account comments when converting .mjs files", async function ()
                {
                    const input = "./assets/given/demo-test-45.mjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-45.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-45.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

            it("should resolve absolute paths in .mjs files", async function ()
                {
                    const input = "./assets/given/demo-test-46.mjs";
                    const options = {
                        input,
                        output      : path.join(testDir, "/actual"),
                        noheader    : true,
                        target      : TARGET.ESM,
                        keepExternal: true,
                        resolveAbsolute: ["./node_modules"]
                    };

                    await transpileFiles(options);

                    const expectConversion = fs.readFileSync(path.join(testDir, "expect", "demo-test-46.mjs"), "utf8");
                    const actualConversion = fs.readFileSync(path.join(testDir, "actual", "assets/given", "demo-test-46.mjs"), "utf8");

                    expect(actualConversion).to.equal(expectConversion);
                }
            );

        });

        describe("on a directory", () =>
        {
            beforeEach(async () =>
            {
                generateFilesInAbsolutePaths();
                generatePackageJson("cases");
            });

            it("should correctly solve all requires from case-1", async function ()
                {
                    const input = path.resolve("./assets/given/case-1/deep1/deep2/deep3/models/example-1/more/demo.cjs");
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        target  : TARGET.ESM,
                        rootDir : path.resolve("./assets/given/case-1"),
                        noHeader: true
                    };

                    await transpileFiles(options);

                    const diff = compareDir("./assets/expect/case-1", "./assets/actual/");

                    expect(diff.leftContent).to.equal(diff.rightContent);
                }
            );

            it("should correctly solve all requires from case-2", async function ()
                {
                    const input = path.resolve("./assets/given/case-2/plan-1/models/example-1/more/demo.cjs");
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        target  : TARGET.ESM,
                        rootDir : path.resolve("./assets/given/case-2"),
                        noHeader: true
                    };

                    await transpileFiles(options);

                    const diff = compareDir("./assets/expect/case-2", "./assets/actual/");

                    expect(diff.leftContent).to.equal(diff.rightContent);
                }
            );

            it("should try to convert modules with non relative paths when target is browser from case-3", async function ()
                {
                    const input = "./assets/given/demo-test-34.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: true,
                        target  : TARGET.BROWSER
                    };

                    await transpileFiles(options);

                    const diff = compareDir("./assets/expect/case-3", "./assets/actual/");

                    expect(diff.leftContent).to.equal(diff.rightContent);
                }
            );

            it("should correctly convert file requiring absolute path from case-4", async function ()
                {
                    const input = "./assets/given/demo-test-43.cjs";
                    const options = {
                        input,
                        output  : path.join(testDir, "/actual"),
                        noheader: false,
                        target  : TARGET.ESM,
                    };

                    await transpileFiles(options);

                    const diff = compareDir("./assets/expect/case-4", "./assets/actual/");

                    expect(diff.leftContent).to.equal(diff.rightContent);
                }
            );
        });

    });


});