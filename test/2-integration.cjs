const chai = require("chai");
const expect = chai.expect;
const sinon = require("sinon");

const fs = require("fs")
const path = require("path")

let rootDir = path.join(__dirname, "virtual")

const {buildTargetDir, convert} = require("../tools/converter.cjs");

describe('The converter tool', function ()
{
    after(function ()
    {
        // fs.rmdirSync(path.join(rootDir, "/esm"))
        fs.rmdirSync(path.join(rootDir, "/esm2"))
        fs.rmdirSync(path.join(rootDir, "/esm3"))
    })

    describe("from the file system", function ()
    {
        it('should create a directory to host esm files', function ()
        {
            const res = buildTargetDir(path.join(rootDir, "/esm"));
            expect(res).to.be.true
        });

        it('should accept a directory to host esm files even when this directory already exists', function ()
        {
            let targetDir2 = path.join(rootDir, "/esm2")
            fs.mkdirSync(targetDir2, {recursive: true})
            const res = buildTargetDir(targetDir2);
            expect(res).to.be.true
        });

        it('should reject an non-existent directory', function ()
        {
            let targetDir3 = path.join(rootDir, "/esm3")
            if (fs.existsSync(targetDir3))
            {
                fs.rmdirSync(targetDir3)
            }
            const res = buildTargetDir(targetDir3);
            expect(res).to.be.true
        });

        it("should convert ./cjs/demo-test.cjs into ./expected/demo-test.esm", async function ()
        {
            const input = "./test/virtual/cjs/demo-test.cjs";
            const options = {
                input,
                "output": path.join(rootDir, "/esm"),
                "noHeader": true,
                "withreport": true
            }

            const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test.mjs"), "utf8")

            const success = await convert(options)
            const converted = success["./test/virtual/cjs/demo-test.cjs"]

            expect(converted).to.equal(expectedConversion)
        })

        it("should convert ./cjs/demo-test-2.cjs into ./expected/demo-test-2.esm", async function ()
            {
                const input = "./test/virtual/cjs/demo-test-2.cjs";
                const options = {
                    input,
                    "output": path.join(rootDir, "/esm"),
                    "config": path.join(__dirname, ".toesm.json"),
                    "noheader": true,
                    "withreport": true
                }

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-2.mjs"), "utf8")

                const success = await convert(options)
                const converted = success["./test/virtual/cjs/demo-test-2.cjs"]

                expect(expectedConversion).to.equal(converted)
            }
        )

        it("should convert ./cjs/demo-test-3.cjs into ./expected/demo-test-3.esm", async function ()
            {
                const input = "./test/virtual/cjs/demo-test-3.cjs";
                const options = {
                    input,
                    "output": path.join(rootDir, "/esm"),
                    "config": path.join(__dirname, ".toesm.json"),
                    "noheader": true,
                    "withreport": true
                }

                const expectedConversion = fs.readFileSync(path.join(rootDir, "expected", "demo-test-3.mjs"), "utf8")

                const success = await convert(options)
                const converted = success["./test/virtual/cjs/demo-test-3.cjs"]

                expect(expectedConversion).to.equal(converted)
            }
        )
    });


});