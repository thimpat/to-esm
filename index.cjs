#!/usr/bin/env node

const minimist = require("minimist");
const chokidar = require("chokidar");
const {anaLogger} = require("analogger");
const packageJson = require("./package.json");

const {
    setupConsole,
    transpileFiles,
    getIndexedItems
} = require("./src/converter.cjs");
const {showHelp} = require("pageterm");

const WATCH_DELAY = 2000;

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

let timerID = null;
let startConversion = async (moreOptions, watcher, savedOptions) =>
{
    try
    {
        const {cjsList} = await transpileFiles(savedOptions);
        const watchList = getWatchList(cjsList);
        if (Object.keys(watchList).length)
        {
            await watcher.unwatch("*");
            watcher.add(watchList);
        }
    }
    catch (e)
    {
        anaLogger.error({lid: 3000}, e);
    }

    timerID = null;
};

const triggerConversionWithDelay = ({
                                        moreOptions = {},
                                        delay = WATCH_DELAY,
                                        watcher = null,
                                        savedOptions = null,
                                        filepath = ""
                                    } = {}) =>
{
    if (!timerID)
    {
        anaLogger.log({lid: 1000, color: "green"}, `File ${filepath} has changed`);
    }

    clearTimeout(timerID);
    timerID = setTimeout(startConversion.bind(null, moreOptions, watcher, savedOptions, {filepath}), delay);
};

const getWatchList = (list) =>
{
    const nb = list ? list.length : 0;
    const watchList = [];
    for (let i = 0; i < nb; ++i)
    {
        watchList.push(list[i].source);
    }
    return watchList;
};

const onChange = async (moreOptions, savedOptions, watcher, filepath) =>
{
    try
    {
        triggerConversionWithDelay({moreOptions, savedOptions, watcher, filepath});
    }
    catch (e)
    {
        anaLogger.error({lid: 3002}, e);
    }
};

/**
 * Process version and help options
 */
const stopOnHelpOrVersion = async function (simplifiedCliOptions = [])
{
    try
    {
        if (simplifiedCliOptions.version || simplifiedCliOptions.v)
        {
            // Tested with integration-cli but cannot be detected
            /* istanbul ignore next */
            anaLogger.log({lid: 3008}, `v${packageJson.version}`);
            return true;
        }

        if (simplifiedCliOptions.help || simplifiedCliOptions.h)
        {
            /* istanbul ignore next */
            const content = getHelp();
            await showHelp(content, {
                windowTitle    : packageJson.name + " v" + packageJson.version + "❔" + " Help ",
                topText        : "Press CTRL + C or Q to Quit",
                topTextBg      : "",
                topTextReversed: true
            });
            return true;
        }

        return false;
    }
    catch (e)
    {
        anaLogger.error({lid: 1000}, e.message);
    }

    return false;
};

/**
 * Start transpiling and setup watchers
 * @param argv
 * @returns {Promise<boolean>}
 */
async function init(argv)
{
    try
    {
        // Apply minimist
        const simplifiedCliOptions = minimist(argv.slice(2));

        // Process straightforward options
        if (await stopOnHelpOrVersion(simplifiedCliOptions))
        {
            return true;
        }

        if (!simplifiedCliOptions.noConsoleOverride)
        {
            // Replace console.log
            setupConsole(anaLogger);
        }

        // Transpile sources
        const {cliOptions, originalOptions, moreOptions, success} = await transpileFiles(simplifiedCliOptions);
        if (!success)
        {
            anaLogger.error({lid: 3004}, `${packageJson.name}: Parsing failed`);
            return false;
        }

        // Enable watch mode
        if (cliOptions && cliOptions.watch)
        {
            anaLogger.log({lid: 1006, color: "green"}, `---------------------------`);
            anaLogger.log({lid: 1008, color: "green"}, `Watch mode enabled`);
            anaLogger.log({lid: 1010, color: "green"}, `---------------------------`);

            const cjsList = getIndexedItems();
            const watchList = getWatchList(cjsList);
            if (watchList.length)
            {
                const watcher = chokidar.watch(watchList, {
                    ignored   : /(^|[\/\\])\../, // ignore dotfiles
                    persistent: true
                });

                watcher
                    .on("change", onChange.bind(null, moreOptions, originalOptions, watcher))
                    .on("unlink", onChange.bind(null, moreOptions, originalOptions, watcher));
            }
        }

        return true;
    }
    catch (e)
    {
        anaLogger.error({lid: 1000}, e.message);
    }

    return false;
}

(async (argv) =>
{
    await init(argv);
})(process.argv);

