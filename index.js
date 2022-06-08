#!/usr/bin/env node

const packageJson = require("./package.json");
const minimist = require("minimist");
const {convert, setupConsole} = require("./src/converter.cjs");
const chokidar = require("chokidar");

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

const onChange = async (savedOptions, path) =>
{
    console.log({lid: 1020, color: "green"}, `File ${path} has been changed`);
    await convert(savedOptions);
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

    setupConsole();

    const savedOptions = Object.assign({}, cliOptions);

    const list = await convert(cliOptions);

    // If triggered by the watcher, return, so we don't add another listener
    if (savedOptions.automated)
    {
        return;
    }

    if (cliOptions.watch)
    {
        savedOptions.automated = true;

        console.log({lid: 1000, color: "green"}, `---------------------------`);
        console.log({lid: 1002, color: "green"}, `Watch mode enabled`);
        console.log({lid: 1000, color: "green"}, `---------------------------`);

        const nb = list ? list.length : 0;
        const watchList = [];
        for (let i = 0; i < nb; ++i)
        {
            watchList.push(list[i].source);
        }

        if (watchList.length)
        {
            const watcher = chokidar.watch(watchList, {
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                persistent: true
            });

            watcher
                .on("change", onChange.bind(null, savedOptions))
                .on("unlink", onChange.bind(null, savedOptions));
        }
    }
})()
    .catch(err =>
{
    /* istanbul ignore next */
    console.error(`${packageJson.name}: (1016)`, err);
});

