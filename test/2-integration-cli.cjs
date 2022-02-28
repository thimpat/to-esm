const chai = require("chai");
const expect = chai.expect;
const shell = require("shelljs");
const packageJson = require("../package.json");

describe("In the Terminal", function ()
{
    describe("to-esm", function ()
    {
        it("should display the version", function ()
        {
            let code = shell.exec("node ./index.js --version");
            expect(code.stdout).to.contain(packageJson.version);
        });

        it("should display the version", function ()
        {
            let code = shell.exec("node ./index.js -v");
            expect(code.stdout).to.contain(packageJson.version);
        });

        it("should display the help with --help option", function ()
        {
            let code = shell.exec("node ./index.js --help");
            expect(code.stdout).to.contain("to-esm <filepath> [--output <dirpath>] [--html <filepath>] [--noheader] [--target < browser|esm >] [--bundle <filepath>] [--update-all]");
        });

        it("should display the help with --h option", function ()
        {
            let code = shell.exec("node ./index.js -h");
            expect(code.stdout).to.contain("to-esm <filepath> [--output <dirpath>] [--html <filepath>] [--noheader] [--target < browser|esm >] [--bundle <filepath>] [--update-all]");
        });

    });
});