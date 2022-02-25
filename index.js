#!/usr/bin/env node

const packageJson = require("./package.json");
const minimist = require("minimist");
const {convert} = require("./src/converter.cjs");

const getHelp = () =>
{
    return `
Usage:

    to-esm <filepath> [--output <dirpath>] [--html <filepath>] [--noheader] [--target < browser|esm >] [--bundle <filepath>] [--update-all]

Note:
    🚫: to-esm should run from the project root folder.

Examples:

    - Generate an .mjs file from a .js file:
    $> to-esm  example/cjs/input.js

    - Generate code into a dedicated directory:
    $> to-esm  example/cjs/input.cjs --output generated/esm

    - Remove automatic generated header:
    $> to-esm  example/cjs/input.cjs --output generated --noheader

    - Generate code for the browser:
    $> to-esm  example/cjs/input.cjs --output generated --target browser
    
    - Generate importmap after conversion:
    $> to-esm example/cjs/demo.cjs --html index.html
    
    For more comprehensive help, go to: 
    https://www.npmjs.com/package/to-esm
    

`;
};

(async () =>
{
    const cliOptions = minimist(process.argv.slice(2));
    if (cliOptions.version || cliOptions.v)
    {
        // Tested with integration-cli but cannot be detected
        /* istanbul ignore next */
        console.log(`v${packageJson.version}`);
        return;
    }

    if (cliOptions.help || cliOptions.h)
    {
        // Tested with integration-cli but cannot be detected
        /* istanbul ignore next */
        console.log(getHelp());
        return;
    }

    await convert(cliOptions);
})()
    .catch(err =>
{
    /* istanbul ignore next */
    console.error(`${packageJson.name}: (1016)`, err);
});

