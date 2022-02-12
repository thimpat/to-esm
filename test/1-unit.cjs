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

const {convertRequireToImport, stripComments, validateSyntax} = require("../src/converter.cjs");

describe("converter.cjs", function ()
{

    describe("#stripComments()", function ()
    {
 
        it("should strip comments from strings", function ()
        {

            // Arrange
            const input = `const cc = /* tttk k[gr */ \`var QuickLog3 = require("../../src/cjs/quick-log.cjs")\`;       // -------------
// const aa = "let QuickLog2 = require(\\"../../src/cjs/quick-log.cjs\\")";`;

            // Act
            const result = stripComments(input);

            expect(result).to.equal("const cc =  `var QuickLog3 = require(\"../../src/cjs/quick-log.cjs\")`;       \n");
        });

        it("should extract comments from strings", function() {

            // Arrange
            const input = `const cc = /* tttk k[gr */ \`var QuickLog3 = require("../../src/cjs/quick-log.cjs")\`;       // -------------
// const aa = "let QuickLog2 = require(\\"../../src/cjs/quick-log.cjs\\")";`;
            const extracted = [];

            // Act
            stripComments(input, extracted);

            expect(extracted.length).to.equal(3);
        });
    });

    describe("#validateSyntax()", function() {
        it("should return true when the input is js compatible", function() {

            // Arrange
            const input = "import a from \"my.file\"";

            // Act
            const result = validateSyntax(input, "module");

            expect(result).to.be.true;
        });

        it("should return false when the input is not js compatible", function() {

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

            expect(result).to.contain("import INFO1  from \"./dep-1.mjs\";");
        });
    });

});