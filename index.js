#!/usr/bin/env node

const packageJson = require("./package.json");
const minimist = require("minimist");
const {convert} = require("./src/converter.cjs");

(async () =>
{
    const cliOptions = minimist(process.argv.slice(2));
    if (cliOptions.version || cliOptions.v)
    {
        console.log(`v${packageJson.version}`);
        return;
    }
    await convert(cliOptions);
})()
    .catch(err =>
{
    /* istanbul ignore next */
    console.error(`${packageJson.name}: (1016)`, err);
});

