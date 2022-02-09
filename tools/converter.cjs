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

const extractComments = require('extract-comments');
const esprima = require("esprima");
const estraverse = require("estraverse");

const ESM_EXTENSION = ".mjs";
const COMMENT_MASK = "❖✎🔏❉";

const nativeModules = Object.keys(process.binding('natives'));

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
            return true;
        }

        fs.mkdirSync(targetDir, {recursive: true});
        return true;
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1001)`, e.message)
    }

    return false;
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


const getNodeModuleProp = (moduleName) =>
{
    let modulePath

    try
    {
        modulePath = require.resolve(moduleName);
    }
    catch (e)
    {
        console.info(`${packageJson.name}: (1002) Failed to locate module [${moduleName}]. Skipped.`)
        return
    }

    return path.parse(modulePath)
}

const reviewExternalImport = (text, list, fileProp) =>
{
    // Locate third party
    const re = /\bfrom\s+["']([^.\/~@][^"']+)["'];?/gmu;

    return text.replace(re, function (match, moduleName, char)
    {
        if (moduleName === undefined)
        {
            return match;
        }

        if (/require\s*\(/.test(moduleName))
        {
            return match
        }

        if (~nativeModules.indexOf(moduleName))
        {
            console.info(`${packageJson.name}: (1017) ${moduleName} is a built-in NodeJs module.`);
            return match
        }

        const module = getNodeModuleProp(moduleName)

        if (!module)
        {
            return match
        }

        // current file's absolute path
        const sourcePath = path.resolve(fileProp.outputDir)

        // The node_modules directory package
        let relativeNodeModulesDir = path.relative(sourcePath, module.dir)

        // We add .. to point to the node_modules parent
        let relativePath = path.join("../..", relativeNodeModulesDir, module.base)

        relativePath = relativePath.replace(/\\/g, "/")

        return match.replace(moduleName, relativePath)

    });

}

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

const applyReplace = (converted, replace) =>
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
 * Remove comments from code
 * @param code
 * @param {[]} extracted If not null, comments are replaced instead of removed.
 * @returns {*}
 */
const stripComments = (code, extracted = null) =>
{
    const commentProps = extractComments(code, {}, null);

    if (!commentProps.length)
    {
        return code
    }

    let commentIndexer = 0
    for (let i = commentProps.length - 1; i >= 0; --i)
    {
        const commentProp = commentProps[i]
        const indexCommentStart = commentProp.range[0]
        const indexCommentEnd = commentProp.range[1]
        if (!extracted)
        {
            code = code.substring(0, indexCommentStart) + code.substring(indexCommentEnd)
            continue;
        }

        extracted[commentIndexer] = code.substring(indexCommentStart, indexCommentEnd)
        code =
            code.substring(0, indexCommentStart) +
            COMMENT_MASK + commentIndexer + COMMENT_MASK +
            code.substring(indexCommentEnd)

        ++commentIndexer
    }

    return code
}

const convertModuleExportsToExport = (converted) =>
{
    try
    {
        // Convert module.exports to export default
        converted = converted.replace(/(?:module\.)?exports\s*=/gm, "export default");

        // Convert module.exports.something to export something
        converted = converted.replace(/(?:module\.)?exports\./gm, "export const ");
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1003)`, e.message);
    }

    return converted
}

const convertRequireToImport = (converted) =>
{
    try
    {
        converted = stripComments(converted)

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
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1004)`, e.message);
    }

    return converted;
}

const applyTransformations = (converted, extracted, list, {source, outputDir, rootDir}) =>
{
    try
    {
        if (!extracted.length)
        {
            return converted;
        }

        for (let i = extracted.length - 1; i >= 0; --i)
        {
            const prop = extracted[i];
            try
            {
                let transformedLines = stripComments(prop.text);
                transformedLines = convertRequireToImport(transformedLines);

                transformedLines = reviewExternalImport(transformedLines, list, {source, outputDir, rootDir});

                converted = converted.substring(0, prop.start) + transformedLines + converted.substring(prop.end)
            }
            catch (e)
            {
                console.error(`${packageJson.name}: (1006)`, e.message);
            }
        }
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1007)`, e.message);
    }

    return converted
}

const convertRequireToImportWithAST = (converted, list, {source, outputDir, rootDir}) =>
{
    let success = true;
    try
    {
        const extracted = [];

        const ast = esprima.parse(
            converted, {
                loc    : true,
                range  : true,
                tokens : true,
                comment: true
            }
        );

        let text, start, end, requirePath, identifier;
        const previouses = []

        estraverse.traverse(ast, {
            enter: function(node, parent)
            {
                try
                {
                    if (node && node.type === "Literal")
                    {
                        if (parent && parent.type === "CallExpression" && parent.callee && parent.callee.name === "require")
                        {
                            requirePath = node.value
                            end = parent ? parent.range[0] : node.range[0]

                            previouses.pop()
                            for (let i = previouses.length - 1; i >= 0; --i)
                            {
                                let previous = previouses[i]

                                // Declaration without "kind" (=> const, let, var
                                if (previous.parent.type === "AssignmentExpression")
                                {
                                    if (previous.parent.left && previous.parent.left.type === "Identifier")
                                    {
                                        identifier = previous.parent.left.name;
                                    }
                                }

                                if (previous.parent.type === "AssignmentExpression" || previous.parent.kind === "const" || previous.parent.kind === "var" || previous.parent.kind === "let")
                                {
                                    previous = previouses[i]
                                    start = previous.parent.range[0]
                                    break
                                }
                            }

                        }
                    }

                    previouses.push({
                        parent,
                        node
                    })
                }
                catch (e)
                {
                    console.error(`${packageJson.name}: (1008)`, e.message);
                }
            },
            leave: function(node, parent)
            {
                if (end > 0)
                {
                    end = parent.range[1]
                    text = converted.substring(start, end)

                    extracted.push({
                        start, end, text, requirePath, source, identifier
                    })

                    requirePath = null
                    start = 0
                    end = 0
                }

            }
        });

        converted = applyTransformations(converted, extracted, list, {source, outputDir, rootDir});
    }
    catch (e)
    {
        success = false;
        console.error(`${packageJson.name}: (1009) [${source}] ->`, e.message);
        console.info(`The parsing failed on this file. Conversion falling back to extended.`)
    }

    return {converted, success}
}

const putBackComments = (str, extracted) =>
{
    if (!extracted.length)
    {
        return str
    }

    for (let i = 0; i < extracted.length; ++i)
    {
        str = str.replace(COMMENT_MASK + i + COMMENT_MASK, extracted[i])
    }

    return str;
}

/**
 * Convert cjs file into esm
 * @param {string[]} list File list to convert
 * @param {string} outputDir Target directory to put converted file
 * @param {boolean} noHeader Whether to add extra info on top of converted file
 */
const convertListFiles = (list, {
    replaceStart = [],
    replaceEnd = [],
    noHeader = false,
    solvedep = false,
    extended = false,
    comments = false
} = {}) =>
{
    let result = true
    if (!list || !list.length)
    {
        console.info(`${packageJson.name} (1010): No file to convert.`);
        return result
    }

    list.forEach(({source, outputDir, rootDir}) =>
    {
        try
        {
            let converted = fs.readFileSync(source, "utf-8");

            converted = applyReplace(converted, replaceStart)

            const result = convertRequireToImportWithAST(converted, list, {source, outputDir, rootDir});
            converted = result.converted

            converted = convertModuleExportsToExport(converted);

            if (extended || !result.success || comments)
            {
                converted = replaceWithRegex(converted, list, {source, outputDir, rootDir, solvedep, comments})
            }

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

            converted = applyReplace(converted, replaceEnd)

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

            const reportSuccess = result.success ? "✔ SUCCESS" : "✔ FALLBACK"
            console.log(`${reportSuccess}: Converted [${source}] to [${targetFilepath}]`);
        }
        catch (e)
        {
            console.error(`${packageJson.name}: (1011)`, e.message);
            result = false
        }
    });

    return result
};

const replaceWithRegex = (converted, list, {source, outputDir, rootDir, solvedep, comments} = {}) =>
{
    const workingDir = process.cwd()

    try
    {
        const extractedComments = [];

        if (!comments)
        {
            converted = stripComments(converted, extractedComments);
        }

        converted = parseImport(converted, list, {source, outputDir, rootDir}, workingDir)

        converted = convertNonTrivial(converted);

        converted = convertModuleExportsToExport(converted);

        converted = convertRequireToImport(converted);

        if (solvedep)
        {
            converted = reviewExternalImport(converted, list, {source, outputDir, rootDir})
        }

        converted = putBackComments(converted, extractedComments)


    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1012)`, e.message);
    }
    return converted
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
                console.error(`${packageJson.name}: (1013)`, e.message);
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

const getLibraryInfo = (modulePackname) =>
{
    const info = {
        installed: false
    }
    try
    {
        const installed = require.resolve(modulePackname)
        if (installed)
        {
            info.installed = true

            const dir = path.parse(installed).dir
            const packageJsonPath = path.join(dir, "package.json")
            const packageJson = require(packageJsonPath)
            info.version = packageJson.version
        }

    }
    catch (e)
    {

    }
    return info
}

const installPackage =
    ({name, version, isDevDependencies, moduleName, isCjs, packageJson} = {}) =>
    {
        try
        {
            const info = getLibraryInfo(name)
            if (info.installed && (version.split(info.version).length === 1 || version.split(info.version).length === 2))
            {
                console.info(`${packageJson.name}: The module [${moduleName}${version}] / [${name}] is already installed.`)
                return
            }

            if (info.installed && info.version.indexOf("latest") > -1)
            {
                return
            }
        }
        catch (e)
        {

        }

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
    const replaceModules = config.replaceModules || []
    const replaceStart = config.replaceStart

    packageJsonPath = path.resolve(packageJsonPath)
    if (!fs.existsSync(packageJsonPath))
    {
        console.error(`${packageJson.name}: (1014) Could not locate package Json. To use the replaceModules options, you must run this process from your root module directory.`)
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
                search: new RegExp(`(?:const|let|var)\\s+([^=]+)\\s*=\\s*require\\(["'\`](${name})["'\`]\\)`),
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
            console.error(`${packageJson.name}: (1015)`, e.message)
        }


    }

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

            const list = glob.sync(inputFileMask, {
                dot: true
            });

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
        const solvedep = !!cliOptions.solvedep;
        const extended = !!cliOptions.extended;
        const comments = !!cliOptions.comments;

        const result = convertListFiles(newList,
            {
                replaceStart: confFileOptions.replaceStart,
                replaceEnd  : confFileOptions.replaceEnd,
                noheader,
                solvedep,
                extended,
                comments,
            });

        return result

    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1016)`, e.message)
    }

};

module.exports.COMMENT_MASK = COMMENT_MASK
module.exports.buildTargetDir = buildTargetDir
module.exports.convertNonTrivial = convertNonTrivial
module.exports.getNodeModuleProp = getNodeModuleProp
module.exports.reviewExternalImport = reviewExternalImport
module.exports.parseImport = parseImport
module.exports.applyReplace = applyReplace
module.exports.stripComments = stripComments
module.exports.convertModuleExportsToExport = convertModuleExportsToExport
module.exports.convertRequireToImport = convertRequireToImport
module.exports.applyTransformations = applyTransformations
module.exports.convertRequireToImportWithAST = convertRequireToImportWithAST
module.exports.putBackComments = putBackComments
module.exports.convertListFiles = convertListFiles
module.exports.replaceWithRegex = replaceWithRegex
module.exports.getOptionsConfigFile = getOptionsConfigFile
module.exports.parseReplace = parseReplace
module.exports.getLibraryInfo = getLibraryInfo
module.exports.installPackage = installPackage
module.exports.parseReplaceModules = parseReplaceModules

module.exports.convert = convert
