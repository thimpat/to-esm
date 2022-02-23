const chai = require("chai");
const shell = require("shelljs");
const expect = chai.expect;
const path = require("path");

let rootDir = __dirname;

describe("In the sandbox folder", function ()
{
    this.timeout(60000);

    before(function ()
    {
        const assetsFolder = path.join(rootDir, "/sandbox");
        process.chdir(assetsFolder);
    });

    describe("The sandbox project", function ()
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

        it("should successfully generate ESM files", function ()
        {
            const code = shell.exec("npm run build:esm:terminal").code;
            expect(code).to.equal(0);
        });

        // ...

    });


});