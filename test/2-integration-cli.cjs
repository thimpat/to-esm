const chai = require("chai");
const fs = require("fs");

const expect = chai.expect;
const shell = require("shelljs");
const packageJson = require("../package.json");

const {switchToTestDirectory} = require("@thimpat/testutils");

describe("In the Terminal", function ()
{
    describe("to-esm", function ()
    {
        before(async ()=>
        {
            fs.rmSync("./test/assets/actual", {recursive: true, force: true});
            switchToTestDirectory();
            fs.mkdirSync("./assets/actual", {recursive: true});
        });

        it("should display the version", function ()
        {
            let code = shell.exec("node ./../index.cjs --version");
            expect(code.stdout).to.contain(packageJson.version);
        });

        it("should display the version with -v", function ()
        {
            let code = shell.exec("node ./../index.cjs -v");
            expect(code.stdout).to.contain(packageJson.version);
        });

        it("should display the help with --help option", function ()
        {
            let code = shell.exec("node ./../index.cjs --help");
            expect(code.stdout)
                .to.contain("Usage:")
                .to.contain("to-esm <filepath> [--output <dirpath>] [--html <filepath>]")
                .to.contain("to-esm should run from the project root folder");
        });

        it("should display the help with --h option", function ()
        {
            let code = shell.exec("node ./../index.cjs -h");
            expect(code.stdout)
                .to.contain("Usage:")
                .to.contain("to-esm <filepath> [--output <dirpath>] [--html <filepath>]")
                .to.contain("to-esm should run from the project root folder");
        });

        it("should generate a bundle only", function ()
        {
            const {stdout} = shell.exec(`node ../index.cjs ./assets/given/demo-generic.js --bundle-esm ./assets/actual/demo-generic.min.mjs`);
            expect(stdout)
                .to.contain("Bundle generated")
                .to.contain("actual/demo-generic.min.mjs")
                .not.to.contain("/demo-generic.mjs");
        });

    });
});