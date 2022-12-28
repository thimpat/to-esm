const chai = require("chai");
const shell = require("shelljs");
const expect = chai.expect;
const path = require("path");
const fs = require("fs");

let rootDir = __dirname;

const packageJson = require("../package.json");
const tgzName = `${packageJson.name}-${packageJson.version}.tgz`;
const tgzDestination = "../../" + tgzName;
const cwd = process.cwd();

describe("In the sandbox folder", function ()
{
    this.timeout(60000);

    before(function ()
    {
        const assetsFolder = path.join(rootDir, "/sandbox");
        process.chdir(assetsFolder);

        // fs.existsSync("../../" + tgzName) && fs.unlinkSync(tgzDestination);
    });

    describe("The Sandbox project", function ()
    {
        it("should successfully install to-esm", function ()
        {
            const code = shell.exec("npm install ../../../to-esm").code;
            expect(code).to.equal(0);
        });

        it("should successfully install AnaLogger", function ()
        {
            const code = shell.exec("npm install analogger").code;
            expect(code).to.equal(0);
        });

        it("should pack to-esm", function ()
        {
            shell.exec("cd ../.. && npm pack").code;

            const exists = fs.existsSync(tgzDestination);
            expect(exists).to.be.true;
        });

        it("should install to-esm from the package", function ()
        {
            shell.exec(`cd ${cwd}`).code;
            const code = shell.exec(`npm install ${tgzDestination}`).code;
            expect(code).to.equal(0);
        });

        // it("should successfully generate ESM files", function ()
        // {
        //     const code = shell.exec("npm run build:esm:terminal").code;
        //     expect(code).to.equal(0);
        // });

        // ...

    });


});