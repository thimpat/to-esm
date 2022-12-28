/**
 * @typedef SourceDetail
 * @property {string} filepath Relative path to file
 * @property {string} commonSourceDir Common directory to subtract from final calculation
 */


const {constants, existsSync, mkdirSync, readFileSync, lstatSync, createWriteStream, createReadStream} = require("fs");
/** to-esm-esm: remove **/
// @note copyFileSync is not part of fs-extra
const {copyFileSync} = require("fs-extra");
const method = copyFileSync ? "new" : "stream";
/** to-esm-esm: end-remove **/

/** to-esm-esm: add
 import { copyFileSync } from "fs-extra";
 const method = copyFileSync ? "new" : "stream";
 **/

const path = require("path");

const glob = require("glob");
const cliProgress = require("cli-progress");

const toAnsi = require("to-ansi");
const {showHelp} = require("pageterm");
const {
    joinPath,
    calculateCommon,
    resolvePath,
    isConventionalFolder,
    normalisePath,
    normaliseRealPathV2
} = require("@thimpat/libutils");

const {EOL} = require("os");

const packageJson = require("../package.json");
const {LIMIT_FILES, SKIP_MESSAGE} = require("../constants.cjs");


let errorFounds = 0;

const displayLog = (message, {fg = "yellow", silent = false} = {}) =>
{
    if (silent)
    {
        return;
    }
    console.log(toAnsi.getTextFromColor(message, {fg}));
};

const displayHelpFile = async function ()
{
    const helpPath = joinPath(__dirname, "help.md");
    const content = readFileSync(helpPath, "utf-8");
    await showHelp(content, {
        windowTitle    : `${packageJson.name} v${packageJson.version} - Help ❔`,
        topText        : "Press CTRL + C or Q to Quit | Page Down or Any key to scroll down",
        topTextBg      : "",
        topTextReversed: true,
        colorify       : true
    });
};

const displayError = (message, style = {fg: "red"}) =>
{
    if (message instanceof Error)
    {
        message = message.message || "Unexpected error";
    }
    console.error(toAnsi.getTextFromColor("Error: " + message, style));
};

/**
 * Copy a file
 * @param source
 * @param dest
 * @param isRecursive
 * @param silent
 * @param progressBar
 * @param dry
 * @returns {{success: boolean}|{success: boolean, dest}|boolean}
 */
const copyFile = (source, dest, {
    isRecursive = true,
    silent = false,
    progressBar = null,
    dry = false,
} = {}) =>
{
    try
    {
        const dir = path.parse(dest).dir;
        if (dir && !existsSync(dir) && isRecursive)
        {
            mkdirSync(dir, {recursive: true});
        }

        if (!dry)
        {
            if (method === "stream")
            {
                createReadStream(source).pipe(createWriteStream(dest));
            }
            else
            {
                copyFileSync(source, dest, constants.F_OK);
            }
        }

        if (progressBar)
        {
            progressBar.update({filename: source, dest});
            return true;
        }

        displayLog(`${source} => ${dest}`, {fg: "yellow", silent});
        return {dest, success: true};
    }
    catch (e)
    {
        displayError(e.message);
    }
    return {success: false};
};

/**
 * Tells whether the provided path exists on disk, is a directory or a file
 * @param filepath
 * @returns {*}
 */
const getEntityStatus = (filepath) =>
{
    const res = {};

    if (existsSync(filepath))
    {
        res.exists = true;
        const stats = lstatSync(filepath);
        if (!stats.isFile() && !stats.isDirectory())
        {
            res.unhandledType = true;
            throw new Error(`Unknown entify type for ${filepath}`);
        }
        res.isFile = stats.isFile();
    }
    else
    {
        res.exists = false;
        if (isConventionalFolder(filepath))
        {
            res.isFile = false;
        }
        else
        {
            const filename = filepath.split("/").pop();

            // We are going to assume that a file with no dot character in it is a folder
            res.isFile = filename.indexOf(".") > -1;
        }
    }

    res.isDir = !res.isFile;

    if (res.isFile)
    {
        res.filePath = normalisePath(filepath);
        res.dirPath = path.parse(filepath).dir;
        res.dirPath = normalisePath(res.dirPath, {isFolder: true});
    }

    if (res.isDir)
    {
        res.filePath = normalisePath(filepath, {isFolder: true});
    }

    return res;
};

/**
 * Retrieve targets from command line
 * @param argv
 * @returns {*|*[]}
 */
function determineTargets({targets = [], argvTarget = null, argvTargets = null} = {})
{
    if (argvTarget)
    {
        const targetList = Array.isArray(argvTarget) ? argvTarget : [argvTarget];
        targets.push(...targetList);
    }

    if (argvTargets)
    {
        const targetList = Array.isArray(argvTargets) ? argvTargets : [argvTargets];
        targets.push(...targetList);
    }

    if (!targets.length)
    {
        displayError(`No detected targets in arguments (You can use --target to explicitly specify some)`);
        return [];
    }

    return targets;
}

/**
 * Returns more detailed info source file related
 * @param src
 * @returns {{filepath: (string|*), commonSourceDir: (string|*)}|undefined}
 */
function getDetailedSource(src)
{
    try
    {
        const {success, filepath, error} = normaliseRealPathV2(src);
        if (!success)
        {
            if (error)
            {
                displayError(error.message);
            }
            displayError(`The source file "${src}" does not exist, is inaccessible or is invalid`);
            return;
        }

        return {
            filepath,
        };
    }
    catch (e)
    {
        console.error({lid: 4281}, e.message);
    }

}

/**
 *
 * @returns {SourceDetail[]}
 */
function determineSourcesFromGlobs(patterns, {commonDir = "", silent = false, force = false, noLimit = false} = {})
{
    const sources = [];

    try
    {
        if (patterns)
        {
            if (!Array.isArray(patterns))
            {
                patterns = [patterns];
            }

            for (let i = 0; i < patterns.length; ++i)
            {
                let commonSourceDir = commonDir;
                const pattern = patterns[i] || "";
                if (!pattern)
                {
                    displayLog(`Empty pattern detected`, {silent});
                    continue;
                }

                let srcs = glob.sync(pattern, {
                    dot: true,
                });

                if (!srcs.length)
                {
                    displayLog(`The pattern "${pattern}" does not match any file or directory`, {silent});
                    continue;
                }

                if (!noLimit && srcs.length > LIMIT_FILES)
                {
                    displayError(`More than ${LIMIT_FILES} files find in glob patterns => ${pattern} . Use --no-limit options to allow the process`);
                    return [];
                }

                srcs = [...new Set(srcs)];

                commonSourceDir = commonSourceDir || calculateCommon(srcs);
                commonSourceDir = normaliseRealPathV2(commonSourceDir).filepath;

                srcs = srcs
                    .map(src =>
                    {
                        const res = getDetailedSource(src);
                        if (!res)
                        {
                            console.error({lid: 4111}, `Failed to copy [${src}]`);
                            return null;
                        }
                        res.commonSourceDir = commonSourceDir;
                        return res;
                    })
                    // Remove undefined
                    .filter(element => !!element)
                    // Remove directory (Do not use nodir on
                    // glob as it would be too soon to calculate the common dir)
                    .filter(element =>
                    {
                        return lstatSync(element.filepath).isFile();
                    });
                sources.push(...srcs);
            }

            if (sources.length > LIMIT_FILES)
            {
                if (!force)
                {
                    displayError(`More than ${LIMIT_FILES} files find in all glob patterns combined. Use --force to allow the process`);
                    return [];
                }
            }
        }
    }
    catch (e)
    {
        console.error({lid: 4113}, e.message);
    }

    return sources;
}

/**
 * Determine sources from the source argument that can be a single file
 * or an array
 * @param sourceArray
 * @param silent
 * @param force
 * @param noLimit
 * @returns {*[]}
 */
function determineSourcesFromArrays(sourceArray, {silent = false, force = false, noLimit = false})
{
    const sources = [];
    try
    {
        if (sourceArray)
        {
            sourceArray = Array.isArray(sourceArray) ? sourceArray : [sourceArray];
            sourceArray = sourceArray.map(src =>
            {
                return getDetailedSource(src);
            }).filter(element => !!element);

            for (let i = 0; i < sourceArray.length; ++i)
            {
                const item = sourceArray[i];
                const source = item.filepath;
                if (!existsSync(source))
                {
                    displayError(`Could not find ${source}`);
                    continue;
                }

                const stats = lstatSync(source);
                if (stats.isFile())
                {
                    let dir = path.parse(source).dir;
                    dir = normaliseRealPathV2(dir).filepath;
                    item.commonSourceDir = dir;
                    sources.push(item);
                    continue;
                }

                if (!stats.isDirectory())
                {
                    // Not a directory neither
                    displayError(`The source "${source}" is neither a file nor a directory. Skipping`, {fg: "red"});
                    continue;
                }

                let results = determineSourcesFromGlobs(source + "**", {commonDir: source, silent, force, noLimit});
                results.forEach(src =>
                {
                    src.commonSourceDir = source;
                });
                sources.push(...results);
            }

        }
    }
    catch (e)
    {
        console.error({lid: 4719}, e.message);
    }

    return sources;
}

/**
 * Retrieve sources from command line
 * @returns {*[]}
 * @param argv_
 * @param argvSources
 * @param argvSource
 * @param silent
 * @param force
 * @param noLimit
 */
function determineSources({
                              argv_ = null,
                              argvSources = null,
                              argvSource = null,
                              silent = false,
                              force = false,
                              noLimit = false
                          } = {})
{
    const sources = [];
    try
    {
        let results = determineSourcesFromGlobs(argvSources, {commondDir: "", silent, force, noLimit});
        if (results.length)
        {
            sources.push(...results);
        }

        results = determineSourcesFromArrays(argvSource, {silent, force, noLimit});
        if (results.length)
        {
            sources.push(...results);
        }

        if (!argvSources && !argvSource && !sources.length)
        {
            if (!argv_ || !argv_.length)
            {
                displayError(`No detected source in arguments (You can use --source, --sources or pass at least one argument)`);
                return [];
            }

            const source = argv_.shift();
            results = determineSourcesFromArrays(source, {silent, force, noLimit});
            if (results.length)
            {
                sources.push(...results);
            }
        }

    }
    catch (e)
    {
        console.error({lid: 4573}, e.message);
    }

    return sources;
}

/**
 * Copy a file to a folder
 * @param source
 * @param target
 * @param commonSourceDir
 * @param force
 * @param silent
 * @param progressBar
 * @param dry
 * @returns {{success: boolean}|{success: boolean, dest}}
 */
function copyFileToFile(source, target, {
    force = false,
    silent = false,
    progressBar = null,
    dry = false,
} = {})
{
    try
    {
        if (!force)
        {
            if (existsSync(target))
            {
                displayError(`The destination "${target}" for the file "${source}" already exists. Use --force option to overwrite. Skipping`, {fg: "red"});
                return {success: false};
            }

            let dir = path.parse(target).dir;
            dir = normalisePath(dir, {isFolder: true});
            if (!existsSync(dir))
            {
                displayError(`The folder "${dir}" does not exist. Use --force option to allow the action. Skipping`, {fg: "red"});
                return {success: false};
            }
        }

        return copyFile(source, target, {silent, progressBar, dry});
    }
    catch (e)
    {
        console.error({lid: 4267}, e.message);
    }

    return {success: false};
}

/**
 * Copy a file to a folder
 * @param source
 * @param targetFolder
 * @param commonSourceDir
 * @param force
 * @param silent
 * @param progressBar
 * @param dry
 * @returns {{success: boolean}|{success: boolean, dest}}
 */
function copyFileToFolder(source, targetFolder, commonSourceDir, {
    force = false,
    silent = false,
    progressBar = null,
    dry = false,
} = {})
{
    try
    {
        const destinationFile = source.split(commonSourceDir)[1];
        const dest = joinPath(targetFolder, destinationFile);
        const destinationPath = resolvePath(dest);

        return copyFileToFile(source, destinationPath, {force, silent, progressBar, dry});
    }
    catch (e)
    {
        console.error({lid: 4231}, e.message);
    }

    return {success: false};
}

/**
 * Copy a file or a directory to a target directory
 * @param source
 * @param target
 * @param commonSourceDir
 * @param force
 * @param {*} targetStatus
 * @param silent
 * @param dry
 * @param {*} progressBar
 * @returns {{success: boolean}|{success: boolean}|{success: boolean, dest}}
 */
function copySourceToTarget(source, target, commonSourceDir, {
    force = false,
    targetStatus = null,
    silent = false,
    dry = false,
    progressBar = null
} = {})
{
    try
    {
        targetStatus = targetStatus || getEntityStatus(target);
        if (resolvePath(source) === resolvePath(target))
        {
            ++errorFounds;
            displayError(`Cannot clone source into itself: ${target}`);
            return {success: false};
        }

        // Copying a file to a directory
        if (targetStatus.isFile)
        {
            return copyFileToFile(source, target, {force, silent, progressBar, dry});
        }
        else if (targetStatus.isDir)
        {
            return copyFileToFolder(source, target, commonSourceDir, {force, silent, progressBar, dry});
        }

        displayError(`The source "${source}" is neither a file nor a directory. Skipping`, {fg: "red"});
    }
    catch (e)
    {
        console.error({lid: 4215}, e.message);
    }

    return {success: false};
}

/**
 * Copy a file or a directory to all the specified targets
 * @param targets
 * @param source
 * @param commonSourceDir
 * @param {boolean} force
 * @param left
 * @param silent
 * @param dry
 * @param progressBar
 * @param report
 * @returns {{count: number, errorFounds: number}}
 */
function copyDetailedSourceToTargets(targets, {
    source,
    commonSourceDir,
    force,
    left = 0,
    silent = false,
    dry = false,
    progressBar = null,
    report = []
})
{
    let count = 0;
    const n = targets.length;

    for (let i = 0; i < n; ++i)
    {
        let target = targets[i];
        try
        {
            target = resolvePath(target);
            let targetStatus = getEntityStatus(target);

            const result = copySourceToTarget(source, target, commonSourceDir,
                {force, silent, targetStatus, progressBar, dry});

            report.push({...result, source, commonSourceDir});

            if (!result.success)
            {
                continue;
            }

            if (targetStatus.isFile && left > 0)
            {
                if (force)
                {
                    displayLog(`${target} is a single file with ${left} more source(s) to copy over this same file`, {
                        fg: "#da2828",
                        silent
                    });
                }
            }

            ++count;
        }
        catch (e)
        {
            displayError(`Failed to clone "${target}": ${e.message}`);
        }
    }
    return {errorFounds, count};
}

function cloneSources(sources, targets, {
    force = false,
    progress = false,
    silent = false,
    clearProgress = false,
    dry = false,
    report = []
} = {})
{
    let errorFounds = 0, count = 0, progressBar;
    try
    {
        // --------------------
        // Create progress bar
        // --------------------
        if (progress)
        {
            progressBar = new cliProgress.SingleBar({
                format           : "Copying |" + "{bar}" + "| {percentage}% | {value}/{total} Files | Speed:" +
                    " {speed} files/second {lastSeparator}{filename}{arrow}{dest}",
                barCompleteChar  : "\u2588",
                barIncompleteChar: "\u2591",
                hideCursor       : true,
                clearOnComplete  : clearProgress
            }, cliProgress.Presets.shades_classic);

            progressBar.start(sources.length, 0, {
                speed        : "N/A",
                arrow        : " => ",
                lastSeparator: "| "
            });
            silent = true;
        }

        const t1 = new Date();

        for (let i = 0; i < sources.length; ++i)
        {
            let item = sources[i];
            let counted = 0;

            ({errorFounds, count: counted} = copyDetailedSourceToTargets(targets, {
                    source         : item.filepath,
                    commonSourceDir: item.commonSourceDir,
                    force,
                    left           : sources.length - i - 1,
                    silent,
                    dry,
                    progressBar,
                    report
                })
            );

            count += counted;

            if (!count)
            {
                continue;
            }

            const t2 = new Date();

            const diffTime = t2.getTime() - t1.getTime();
            const speed = Math.floor(count * 1000 / diffTime);

            if (progressBar)
            {
                progressBar.increment();
                progressBar.update(count, {speed});
            }
        }

        if (progressBar)
        {
            progressBar.update(sources.length, {lastSeparator: "", filename: "", arrow: "", dest: ""});
            progressBar.stop();
        }

        if (errorFounds)
        {
            displayError(toAnsi.getTextFromColor(`${errorFounds} ${errorFounds === 1 ? "issue" : "issues"} detected`, {fg: "red"}));
            process.exitCode = process.exitCode || 10;
        }

    }
    catch (e)
    {
        console.error({lid: 3451}, e.message);
    }

    return {count};
}

const cloneFromCLI = (argv) =>
{
    try
    {
        let {
            progress,
            force,
            silent,
            clearProgress,
            dry,
            list,
            "list-only": listOnly0,
            "no-limit" : noLimit0,
            listOnly,
            noLimit
        } = argv;

        listOnly = listOnly || listOnly0;
        noLimit = noLimit || noLimit0;

        // --------------------
        // Determine source folders and files
        // --------------------
        let sources = determineSources({
            argv_      : argv._,
            argvSources: argv.sources,
            argvSource : argv.source,
            force,
            silent,
            noLimit
        });

        sources = sources || [];

        const eltList = [];
        const eltListString = [];
        for (let i = 0; i < sources.length; ++i)
        {
            const elt = sources[i];
            eltList.push(elt.filepath);
            eltListString.push('"' + elt.filepath + '"');
        }

        if (list || listOnly)
        {
            let listResult = [];

            listResult.push(toAnsi.getTextFromColor("[", {fg: "#daa116"}));
            listResult.push(toAnsi.getTextFromColor(eltListString.join("," + EOL), {fg: "#377c1b"}));
            listResult.push(toAnsi.getTextFromColor("]", {fg: "#daa116"}));

            console.log(listResult.join(EOL));

            if (listOnly)
            {
                return {count: sources.length, success: true, message: SKIP_MESSAGE, list: eltList};
            }
        }

        if (!sources.length)
        {
            process.exitCode = process.exitCode || 1;
            return {count: 0, success: true, list: eltList};
        }

        // --------------------
        // Determine targets folders and files
        // --------------------
        let targets;
        targets = determineTargets({targets: argv._, argvTarget: argv.target, argvTargets: argv.targets});
        if (!targets.length)
        {
            process.exitCode = process.exitCode || 2;
            return {count: 0, success: false, list: eltList};
        }

        // --------------------
        // Start cloning
        // --------------------
        const report = [];
        const {count} = cloneSources(sources, targets, {force, progress, silent, clearProgress, dry, report});

        return {count, success: false, list: eltList, report};
    }
    catch (e)
    {
        console.error({lid: 4321}, e.message);
    }

    return {count: 0, success: false};
};

const cloneGlobs = (sources, targets, {
    silent = false,
    force = true,
    progress = false,
    clearProgress = false,
    list = false,
    listOnly = false,
    noLimit = true,
    dry = false
} = {}) =>
{
    try
    {
        const argCli = {sources, targets, silent, force, progress, clearProgress, list, dry, listOnly, noLimit};
        return cloneFromCLI(argCli);
    }
    catch (e)
    {
        console.error({lid: 4321}, e.message);
    }

    return false;
};

const clone = (source, targets, {
    silent = false,
    force = true,
    progress = false,
    clearProgress = false,
    list = false,
    listOnly = false,
    noLimit = true,
    dry = false
} = {}) =>
{
    try
    {
        const argCli = {source, targets, silent, force, progress, clearProgress, list, dry, noLimit, listOnly};
        return cloneFromCLI(argCli);
    }
    catch (e)
    {
        console.error({lid: 4321}, e.message);
    }

    return false;
};

module.exports.determineSources = determineSources;
module.exports.determineTargets = determineTargets;

module.exports.displayLog = displayLog;
module.exports.displayHelpFile = displayHelpFile;
module.exports.displayHelpFile = displayHelpFile;
module.exports.displayError = displayError;
module.exports.copyFile = copyFile;
module.exports.copyFileToFile = copyFileToFile;
module.exports.copyFileToFolder = copyFileToFolder;
module.exports.copySourceToTarget = copySourceToTarget;
module.exports.copyDetailedSourceToTargets = copyDetailedSourceToTargets;
module.exports.cloneSources = cloneSources;

module.exports.cloneFromCLI = cloneFromCLI;

module.exports.cloneGlobs = cloneGlobs;
module.exports.clone = clone;
