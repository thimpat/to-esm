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
        const regex = /((?<!export\s+)(?:const|let|var)\s+)(\w+)(\s+=.*\b(?:module\.)?exports\s*=\s*{[^}]*\2\b)/sgm;
        const subst = "export $1$2$3";
        converted0 = converted;
        converted = converted0.replace(regex, subst);
    }
    while (converted0.length !== converted.length);

    return converted;

};


const parseImport = (text, list, fileProp, workingDir) =>
{
    const parsedFilePath = path.join(workingDir, fileProp.source);
    const parsedFileDir = path.dirname(parsedFilePath);

    // All your regexps combined into one:
    const re = /require\(["'`]([.\/][^)]+)["'`]\)/gmu;

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

        const index = list.findIndex(function ({source, outputDir, rootDir})
        {
            const possibleFilePath = path.join(workingDir, source)
            return (targets.includes(possibleFilePath))
        })

        if (index < 0)
        {
            return match
        }

        // current file's absolute path
        const sourcePath = path.resolve(fileProp.outputDir)

        const {source, outputDir, rootDir} = list[index]
        const basename = path.parse(source).name

        // Absolute path in the require
        const destinationPath = path.resolve(outputDir)

        let relativePath = path.relative(sourcePath, destinationPath)
        relativePath = path.join(relativePath, basename + ESM_EXTENSION)
        relativePath = relativePath.replace(/\\/g,"/")
        if (!([".", "/"].includes(relativePath.charAt(0))))
        {
            relativePath = "./" + relativePath
        }

        return match.replace(group, relativePath)

    });
}

const applyReplace = (replace, converted) =>
{
    replace.forEach((item)=>
    {
        if (item.regex)
        {
            converted = converted.replace(item.search, item.replace)
        }
        else
        {
            converted = converted.split(item.search).join(item.replace)
        }
    })
    return converted
}

/**
 * Convert cjs file into esm
 * @param {string[]} list File list to convert
 * @param {string} outputDir Target directory to put converted file
 * @param {boolean} noHeader Whether to add extra info on top of converted file
 */
const convertListFiles = (list, {replaceStart = [], replaceEnd = [], noHeader = false} = {}) =>
{
    if (!list || !list.length)
    {
        console.info(`${packageJson.name}: No file to convert.`);
        return
    }

    const workingDir = process.cwd()

    list.forEach(({source, outputDir, rootDir}) =>
    {
        let converted = fs.readFileSync(source, "utf-8");

        converted = applyReplace(replaceStart, converted)

        converted = parseImport(converted, list, {source, outputDir, rootDir}, workingDir)

        converted = convertNonTrivial(converted);

        // Convert module.exports to export default
        converted = converted.replace(/(?:module\.)?exports\s*=/gm, "export default");

        // Convert module.exports.something to export something
        converted = converted.replace(/(?:module\.)?exports\./gm, "export const ");

        // convert require with .json file to import
        converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(([^)]+.json[^)])\)/gm, "import $1 from $2 assert {type: \"json\"}");

        // convert require with .cjs extension to import with .mjs extension (esm can't parse .cjs anyway)
        converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(([^)]+)\.cjs([^)])\)/gm, "import $1 from" +
            ` $2${ESM_EXTENSION}$3`);

        // convert require with .js extension to import
        converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(([^)]+.js[^)])\)/gm, "import $1 from $2");

        // convert require without extension to import .mjs extension
        converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(["'`]([./\\][^"'`]+)["'`]\)/gm, `import $1 from "$2${ESM_EXTENSION}"`);

        // convert require without extension to import (Third Party libraries)
        converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(["'`]([^"'`]+)["'`]\)/gm, `import $1 from "$2"`);

        if (!noHeader)
        {
            converted = `/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [${source}]
 * 
 **/    
` + converted;
        }

        converted = applyReplace(replaceEnd, converted)

        const targetFile = path.basename(source, path.extname(source));

        let destinationDir
        if (outputDir)
        {
            const fileDir = path.join(path.dirname(source));
            const relativeDir = path.relative(rootDir, fileDir);
            destinationDir = path.join(outputDir, relativeDir)

            buildTargetDir(destinationDir)
        }
        else
        {
            destinationDir = path.join(path.dirname(source));
        }

        const targetFilepath = path.join(destinationDir, targetFile + ESM_EXTENSION);

        fs.writeFileSync(targetFilepath, converted, "utf-8");

        console.log(`Converted [${source}] => [${targetFilepath}]`);

    });
};

const getOptionsConfigFile = async (configPath) =>
{
    let confFileOptions = {}

    configPath = path.resolve(configPath)
    if (fs.existsSync(configPath))
    {
        const extension = path.parse(configPath).ext

        if ([".js", ".cjs"].includes(extension))
        {
            confFileOptions = require(configPath)
        }
        else if ([".mjs"].includes(extension))
        {
            const {default: options} = await import(configPath)
            confFileOptions = options
        }
        else
        {
            const contents = fs.readFileSync(configPath, {encoding: "utf8"})
            try
            {
                confFileOptions = JSON.parse(contents.toString())
            }
            catch (e)
            {
                console.error(`${packageJson.name}:`, e.message);
                console.info(`Skipping config file options`)
            }
        }
    }

    return confFileOptions
}

const parseReplace = (replace = []) =>
{
    replace.forEach((item)=>
    {
        if (item.search instanceof RegExp)
        {
            item.regex = true
        }
        else if (item.regex)
        {
            item.replace = new RegExp(item.replace)
        }
    })

    return replace || []
}

const installPackage =
    ({name, version, isDevDependencies, moduleName, isCjs, packageJson} = {}) =>
    {
        const devOption = isDevDependencies ? " -D" : ""

        const child_process = require('child_process');

        const environment = isCjs ? "CommonJs modules" : "ES Modules"

        console.info(`${packageJson.name}: Installing (${environment}) package [${moduleName}${version}] as [${name}]`)
        child_process.execSync(`npm install ${name}@npm:${moduleName}${version} ${devOption}`, {stdio: []});
        console.info(`${packageJson.name}: ✔ Success`)
    }

/**
 * Install two modules versions for each specified package
 * @param config
 * @param packageJsonPath
 * @returns {Promise<void>}
 */
const parseReplaceModules = async (config = [], packageJsonPath = "./package.json") =>
{
    const replaceModules = config.replaceModules
    const replaceStart = config.replaceStart

    packageJsonPath = path.resolve(packageJsonPath)
    if (!fs.existsSync(packageJsonPath))
    {
        console.error(`${packageJson.name}: Could not locate package Json. To use the replaceModules options, you must run this process from your root module directory.`)
        return
    }

    const packageJson = require(packageJsonPath)
    const moduleList = Object.keys(replaceModules)

    for (const moduleName of moduleList)
    {
        try
        {
            const moduleItem = replaceModules[moduleName]

            moduleItem.cjs = moduleItem.cjs || {}
            moduleItem.esm = moduleItem.esm || {}

            let version = moduleItem.cjs.version || "@latest"
            let name = moduleItem.cjs.name || moduleName
            let isDevDependencies = !!moduleItem.cjs.devDependencies

            installPackage({version, name, isDevDependencies, moduleName, isCjs: true, packageJson})

            const addReplaceStart = {
                search: new RegExp(`(?:const|let|var)\\s+([^=]+)\\s*=\\s*require\\(["'\`]([^"'\`]+)["'\`]\\)`),
            }

            version = moduleItem.esm.version || "@latest"
            name = moduleItem.esm.name || moduleName
            isDevDependencies = !!moduleItem.esm.devDependencies

            installPackage({version, name, isDevDependencies, moduleName, isCjs: false, packageJson})

            addReplaceStart.replace = `import $1 from "${name}"`
            addReplaceStart.regex = true

            replaceStart.push(addReplaceStart)
        }
        catch (e)
        {
            console.error(`${packageJson.name}:`, e.message)
        }


    }

    // moduleList.forEach( (moduleName)=>
    // {
    // })
}

/**
 * Use command line arguments to apply conversion
 * @param {*} cliOptions Options to pass to converter
 */
const convert = async (cliOptions) =>
{
    try
    {
        let confFileOptions = {replace: []}

        // Config Files
        let configPath = cliOptions.config
        if (configPath)
        {
            confFileOptions = await getOptionsConfigFile(configPath)

            // Replacement
            confFileOptions.replaceStart = parseReplace(confFileOptions.replaceStart)
            confFileOptions.replaceEnd = parseReplace(confFileOptions.replaceEnd)

            // Module Install
            await parseReplaceModules(confFileOptions)
        }

        // Input Files
        const inputFileMaskArr = Array.isArray(cliOptions.input) ? cliOptions.input : [cliOptions.input];

        // Output Files
        const outputDirArr = Array.isArray(cliOptions.output) ? cliOptions.output : [cliOptions.output];

        const workingDir = process.cwd()

        const newList = []
        for (let i = 0; i < inputFileMaskArr.length; ++i)
        {
            const inputFileMask = inputFileMaskArr[i]
            const outputDir = outputDirArr[i]

            if (outputDir)
            {
                buildTargetDir(outputDir);
            }

            const list = glob.sync(inputFileMask);

            const rootDir = list && list.length > 1 ? commonDir(workingDir, list) : path.join(workingDir, path.dirname(list[0]))

            list.forEach((item)=>
            {
                newList.push({
                    source: item,
                    outputDir,
                    rootDir
                })
            })
        }

        // No header
        const noheader = !!cliOptions.noheader;
        convertListFiles(newList, {replaceStart: confFileOptions.replaceStart,replaceEnd: confFileOptions.replaceEnd, noheader});

    }
    catch (e)
    {
        console.error(`${packageJson.name}:`, e.message)
    }

};

module.exports = convert
