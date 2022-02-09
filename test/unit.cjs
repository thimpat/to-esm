const chai = require("chai");
const expect = chai.expect;

const {convertRequireToImport} = require("../tools/converter.cjs");

describe('converter.cjs', function() {
    describe('#stripComments()', function() {
        it('should convert require cjs into esm export', function() {

            // Arrange
            const input = `const INFO1 = require("./dep-1.cjs");`

            // Act
            const result = convertRequireToImport(input)

            expect(result).to.contain('import INFO1  from "./dep-1.mjs";');
        });
    });

    describe('#convertRequireToImport()', function() {
        it('should convert require cjs into esm export', function() {

            // Arrange
            const input = `const INFO1 = require("./dep-1.cjs");`

            // Act
            const result = convertRequireToImport(input)

            expect(result).to.contain('import INFO1  from "./dep-1.mjs";');
        });
    });
});