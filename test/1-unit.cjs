/**
 * We keep the number of unit tests low. Most of the functions will be exported
 * during the integration tests.
 * Having a rigid approach on testing would require tests more complicated
 * and longer to develop than the code itself due to the many system calls
 * (require, package installations, ...).
 * @type {Chai.ChaiStatic}
 */
const chai = require("chai");
const expect = chai.expect;

const {
    convertRequireToImport,
    stripCodeComments,
    validateSyntax,
    isConventionalFolder,
    concatenatePaths,
    convertToSubRootDir,
    subtractPath,
    getTranslatedPath,
    getProjectedPathAll,
    calculateRequiredPath,
    putBackComments,
    regexifySearchList,
} = require("../src/converter.cjs");

const {anaLogger} = require("analogger");

describe("converter.cjs", function ()
{

    beforeEach(function ()
    {
        anaLogger.setOptions({silent: false, hideError: false, hideHookMessage: true, lidLenMax: 4});
        anaLogger.overrideConsole();
        anaLogger.overrideError();
    });

    /**
     * @link stripCodeComments
     */
    describe("#stripCodeComments()", function ()
    {

        it("should strip comments from strings", function ()
        {
            // Arrange
            const input = `const cc = /* tttk k[gr */ \`var QuickLog3 = require("../../src/cjs/quick-log.cjs")\`;       // -------------
// const aa = "let QuickLog2 = require(\\"../../src/cjs/quick-log.cjs\\")";`;

            // Act
            const result = stripCodeComments(input);

            expect(result).to.equal("const cc =  `var QuickLog3 = require(\"../../src/cjs/quick-log.cjs\")`;       \n");
        });

        it("should extract comments from strings", function() {

            // Arrange
            const input = `const cc = /* tttk k[gr */ \`var QuickLog3 = require("../../src/cjs/quick-log.cjs")\`;       // -------------
// const aa = "let QuickLog2 = require(\\"../../src/cjs/quick-log.cjs\\")";`;
            const extracted = [];

            // Act
            stripCodeComments(input, extracted);

            expect(extracted.length).to.equal(3);
        });
    });

    /**
     * @link validateSyntax
     */
    describe("#validateSyntax()", function ()
    {
        it("should return true when the input is ESM compatible", function ()
        {

            // Arrange
            const input = "import a from \"my.file\"";

            // Act
            const result = validateSyntax(input, "module");

            expect(result).to.be.true;
        });

        it("should return true when the input is CJS compatible", function ()
        {
            // Arrange
            const input = "require(\"my.file\")";

            // Act
            const result = validateSyntax(input, "commonjs");

            expect(result).to.be.true;
        });

        /**
         * @link validateSyntax
         */
        it("should return false when the input is not ESM valid", function ()
        {

            // Arrange
            const input = "import this.log;";

            // Act
            const result = validateSyntax(input, "module");

            expect(result).to.be.false;
        });
    });

    describe("#convertRequireToImport()", function() {
        it("should convert require cjs into esm export", function() {

            // Arrange
            const input = "const INFO1 = require(\"./dep-1.cjs\");";

            // Act
            const result = convertRequireToImport(input);

            expect(result).to.contain("import INFO1  from \"./dep-1.cjs\";");
        });
    });

    /**
     * @link isConventionalFolder
     */
    describe("#isConventionalFolder()", function ()
    {
        it("should check that a given path is a directory by checking that it ends with a forward slash", function ()
        {
            const input = "my-folder/";
            const result = isConventionalFolder(input);
            expect(result).to.be.true;
        });

        it("should return false when no directory is passed", function ()
        {
            const input = "";

            const result = isConventionalFolder(input);

            expect(result).to.be.false;
        });
    });

    /**
     * @link concatenatePaths
     */
    describe("#concatenatePaths()", function ()
    {
        it("should combine two paths", function ()
        {
            const sourcePath = "./generated/browser/";
            const requiredPath = "./src/cjs/ana-logger.cjs";
            const result = concatenatePaths(sourcePath, requiredPath);
            expect(result).to.equal("./generated/browser/src/cjs/ana-logger.cjs");
        });
    });

    /**
     * @link convertToSubRootDir
     */
    describe("#convertToSubRootDir()", function ()
    {
        it("should combine two paths", function ()
        {
            const sourcePath = "C:\\projects/fake1/fake2";
            const result = convertToSubRootDir(sourcePath);
            expect(result).to.equal("projects/fake1/fake2");
        });
    });
    /**
     * @link subtractPath
     */
    describe("#subtractPath()", function ()
    {
        it("should subtract one path from another", function ()
        {
            const wholePath = "C:\\projects/analogger/example/cjs/demo.cjs";
            const pathToSubstract = "C:/projects\\analogger\\example";
            const result = subtractPath(wholePath, pathToSubstract);
            expect(result).to.deep.equal({
                "subDir" : "./cjs/",
                "subPath": "./cjs/demo.cjs"
            });
        });

        it("should fail subtracting one path from another when the path to subtract is the longer one", function ()
        {
            const wholePath = "C:/projects\\analogger\\example/demo.cjs";
            const pathToSubstract = "C:\\projects/analogger/example/cjs/demo.cjs";
            const result = subtractPath(wholePath, pathToSubstract);
            expect(result).to.deep.equal({
                "subPath": "C:/projects/analogger/example/demo.cjs"
            });
        });

        it("should subtract and return paths following conventions", function ()
        {
            const wholePath = "C:/projects\\analogger\\example/demo.cjs";
            const pathToSubstract = "./";
            const result = subtractPath(wholePath, pathToSubstract);
            expect(result).to.deep.equal({
                "subDir" : "./projects/analogger/example/",
                "subPath": "projects/analogger/example/demo.cjs"
            });
        });

        it("should return the whole path" +
            " when the path to subtract is not part of the whole path", function ()
        {
            const wholePath = "C:/projects\\analogger\\example/demo.cjs";
            const pathToSubstract = "./unrelated";
            const result = subtractPath(wholePath, pathToSubstract);
            expect(result).to.deep.equal({
                "subPath": "C:/projects/analogger/example/demo.cjs"
            });
        });


    });

    /**
     * @link getProjectedPathAll
     */
    describe("#getProjectedPathAll()", function ()
    {
        it("should return the location of the given path related to the targeted path", function ()
        {
            const source = "./example/cjs/demo.cjs";
            const outputDir = "./generated/browser/";
            const {projectedPath} = getProjectedPathAll({source, outputDir});
            expect(projectedPath).to.equal("./generated/browser/example/cjs/demo.cjs");
        });
    });

    /**
     * @link convertToSubRootDir
     */
    describe("#getTranslatedPath()", function ()
    {
        it("should find the corresponding object of a given path", function ()
        {
            const sourcePath = "./example/cjs/demo.cjs";
            const list = [{
                "source": "./example/cjs/demo.cjs",
                "sourceAbs": "C:/projects/analogger/example/cjs/demo.cjs",
                "sourceNoExt": "./example/cjs/demo",
            }];
            const result = getTranslatedPath(sourcePath, list);
            expect(result).to.deep.equal({
                "source": "./example/cjs/demo.cjs",
                "sourceAbs": "C:/projects/analogger/example/cjs/demo.cjs",
                "sourceNoExt": "./example/cjs/demo"
            });
        });

        it("should return an empty object when path is not in the list", function ()
        {
            const sourcePath = "./example/cjs/some.cjs";
            const list = [{
                "source": "./example/cjs/demo.cjs",
                "sourceAbs": "C:/projects/analogger/example/cjs/demo.cjs",
                "sourceNoExt": "./example/cjs/demo",
            }];
            const result = getTranslatedPath(sourcePath, list);
            expect(result).to.deep.equal({});
        });
    });

    /**
     * @link convertToSubRootDir
     */
    describe("#calculateRequiredPath()", function ()
    {
        it("should return the path of an imported path related to the source", function ()
        {
            const sourcePath = "./generated/browser/demo.cjs";
            const requiredPath = "./src/cjs/ana-logger.cjs";
            const list = [];
            const followlinked = true;
            const outputDir = "./generated/browser/";

            const result = calculateRequiredPath({sourcePath, requiredPath, list, followlinked, outputDir});
            expect(result).to.equal("./src/cjs/ana-logger.mjs");
        });

        it("should return the path of an imported path related to the project root directory", function ()
        {
            const sourcePath = "./generated/browser/demo.cjs";
            const requiredPath = "./unrelated/deep1/deep2/t7-cjs.cjs";
            const list = [];
            const followlinked = true;
            const outputDir = "./generated/browser/";

            const result = calculateRequiredPath({sourcePath, requiredPath, list, followlinked, outputDir});
            expect(result).to.equal("./unrelated/deep1/deep2/t7-cjs.mjs");
        });
    });

    /**
     * @link convertToSubRootDir
     */
    describe.skip("#calculateRelativePath()", function ()
    {
        it("should return something valid", function ()
        {
            expect("").to.equal("1");
        });
    });

    /**
     * @link convertToSubRootDir
     */
    describe.skip("#resolveReqPath()", function ()
    {
        it("should return something valid", function ()
        {
            expect("").to.equal("1");
        });
    });

    /**
     * @link addFileToIndex
     */
    describe.skip("#addFileToIndex()", function ()
    {
        it("should return something valid", function ()
        {
            expect("").to.equal("1");
        });
    });

    /**
     * @link addFileToIndex
     */
    describe.skip("#formatIndexEntry()", function ()
    {
        it("should return something valid", function ()
        {
            expect("").to.equal("1");
        });
    });

    /**
     * @link putBackComments
     */
    describe("#putBackComments()", function ()
    {
        it("should insert temporary removed comments to source", function ()
        {
            const src = "export default function rgbHex(red, green, blue, alpha) {\n" +
                "\t❖✎🔏❉1❖✎🔏❉\n" +
                "\t❖✎🔏❉0❖✎🔏❉\n" +
                "}\n";
            const comments = [
                "// eslint-disable-next-line no-mixed-operators",
                "// TODO: Remove this ignore comment.",
            ];
            const result = putBackComments(src, comments);
            expect(result).to.equal("export default function rgbHex(red, green, blue, alpha) {\n" +
                "\t// TODO: Remove this ignore comment.\n" +
                "\t// eslint-disable-next-line no-mixed-operators\n" +
                "}\n");
        });
    });

    /**
     * @link regexifySearchList
     */
    describe("#regexifySearchList()", function ()
    {
        it("should convert string into regex when necessary", function ()
        {
            const replace = [
                {
                    search: /abc/,
                    replace: "const colorConvert = null;"
                },
                {
                    search: "abc",
                    replace: "const colorConvert = null;",
                    regex: true
                }
            ];

            const result = regexifySearchList(replace);
            expect(result[1].search).to.be.an.instanceOf(RegExp);
        });
    });


});