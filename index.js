#!/usr/bin/env node
const packageJson = require("./package.json");
const minimist = require("minimist");
const {convert} = require("./src/converter.cjs");

(async () =>
{
    const cliOptions = minimist(process.argv.slice(2));
    await convert(cliOptions);

})().catch(err =>
{
    console.error(`${packageJson.name}:`, err);
});

