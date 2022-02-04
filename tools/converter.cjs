/**
 * This file is to convert a Commonjs file into an ESM library
 * by just replacing module.exports to export default.
 * It's for very simple library, but will allow me to avoid using a bundler.
 */
const packageJson = require("../package.json");
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const commonDir = require("commondir");
const ESM_EXTENSION = ".mjs";

/**
 * Build target directory.
 * Ignore, if the directory already exist
 * @param {string} targetDir Directory to build
 */
const buildTargetDir = (targetDir) =>
{
    try
    {
        if (fs.existsSync(targetDir))
        {
            return;
        }
        fs.mkdirSync(targetDir, {recursive: true});
    }
    catch (e)
    {
        console.error(`${packageJson.name}:`, e.message)
    }
};

/**
 * Execute some non-trivial transformations that require multiple passes
 * @param {string} converted String to perform transformations onto
 * @returns {*}
 */
const convertNonTrivial = (converted) =>
{
    let converted0;
    do
    {
        const regex = /((?<!export\s+)(?:const|let)\s+)(\w+)(\s+=.*\bmodule\.exports\s*=\s*{[^}]*\2\b)/sgm;
        const subst = "export $1$2$3";
        converted0 = converted;
        converted = converted0.replace(regex, subst);
    }
    while (converted0.length !== converted.length);

    return converted;

};


const parseImport = (text, list, currentFile, workingDir) =>
{
    const parsedFilePath = path.join(workingDir, currentFile);
    const parsedFileDir = path.dirname(parsedFilePath);

    // All your regexps combined into one:
    const re = /require\(["'`]([./][^)]+)["'`]\)/gmu;

    return text.replace(re, function (match, group, char)
    {
        if (group === undefined)
        {
            return match;
        }

        if (/require\s*\(/.test(group))
        {
            return match
        }

        const target = path.join(parsedFileDir, group)
        const extension = path.extname(target)

        const targets = []
        if (!extension)
        {
            targets.push(target + ".cjs")
            targets.push(target + ".js")
        }
        else if (![".js", ".cjs"].includes(extension))
        {
            return match
        }
        else
        {
            targets.push(target)
        }

        const found = list.some(function (filepath)
        {
            const possibleFilePath = path.join(workingDir, filepath)
            return (targets.includes(possibleFilePath))
        })

        if (!found)
        {
            return match
        }

        if (!extension)
        {
            return match.replace(group, group + ESM_EXTENSION)
        }

        const filename = group.split(".").slice(0, -1).join(".") + ESM_EXTENSION
        return match.replace(group, filename)

    });
}

/**
 * Convert cjs file into esm
 * @param {string[]} list File list to convert
 * @param {string} outputDir Target directory to put converted file
 * @param {boolean} noHeader Whether to add extra info on top of converted file
 */
const convertListFiles = (list, outputDir, {noHeader = false} = {}) =>
{
    if (!list || !list.length)
    {
        console.info(`${packageJson.name}: No file to convert.`);
        return
    }

    const workingDir = process.cwd()
    const rootDir = list && list.length > 1 ? commonDir(workingDir, list) : path.join(workingDir, path.dirname(list[0]))

    list.forEach((filepath) =>
    {
        let converted = fs.readFileSync(filepath, "utf-8");

        converted = parseImport(converted, list, filepath, workingDir)

        converted = convertNonTrivial(converted);

        // Convert module.exports to export default
        converted = converted.replace(/module\.exports\s*=/gm, "export default");

        // Convert module.exports.something to export something
        converted = converted.replace(/module\.exports\./gm, "export const ");

        // convert require with .json file to import
        converted = converted.replace(/const\s+([^=]+)\s*=\s*require\(([^)]+.json[^)])\)/gm, "import $1 from $2 assert {type: \"json\"}");

        // convert require with .cjs extension to import with .mjs extension (esm can't parse .cjs anyway)
        converted = converted.replace(/const\s+([^=]+)\s*=\s*require\(([^)]+)\.cjs([^)])\)/gm, "import $1 from" +
            ` $2${ESM_EXTENSION}$3`);

        // convert require with .js extension to import
        converted = converted.replace(/const\s+([^=]+)\s*=\s*require\(([^)]+.js[^)])\)/gm, "import $1 from $2");

        // convert require without extension to import .mjs extension
        converted = converted.replace(/const\s+([^=]+)\s*=\s*require\(["'`]([./\\][^"'`]+)["'`]\)/gm, `import $1 from "$2${ESM_EXTENSION}"`);

        // convert require without extension to import
        converted = converted.replace(/const\s+([^=]+)\s*=\s*require\(["'`]([^"'`]+)["'`]\)/gm, `import $1 from "$2"`);

        if (!noHeader)
        {
            converted = `/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [${filepath}]
 * 
 **/    
` + converted;
        }


        const targetFile = path.basename(filepath, path.extname(filepath));

        let destinationDir
        if (outputDir)
        {
            const fileDir = path.join(path.dirname(filepath));
            const relativeDir = path.relative( rootDir, fileDir );
            destinationDir = path.join(outputDir, relativeDir)

            buildTargetDir(destinationDir)
        }
        else
        {
            destinationDir = path.join(path.dirname(filepath));
        }

        const targetFilepath = path.join(destinationDir, targetFile + ESM_EXTENSION);

        fs.writeFileSync(targetFilepath, converted, "utf-8");

        console.log(`Converted [${filepath}] => [${targetFilepath}]`);

    });
};

/**
 * Use command line arguments to apply conversion
 * @param {*} cliOptions Options to pass to converter
 */
const convert = (cliOptions) =>
{
    try
    {
        // Input Files
        const inputFileMask = cliOptions.input;
        const list = glob.sync(inputFileMask);

        // Output Files
        const outputDir = cliOptions.output;

        if (outputDir)
        {
            buildTargetDir(outputDir);
        }

        // No header
        const noheader = !!cliOptions.noheader;
        convertListFiles(list, outputDir, {noheader});
    }
    catch (e)
    {
        console.error(`${packageJson.name}:`, e.message)
    }

};

module.exports = convert
