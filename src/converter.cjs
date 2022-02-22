/**
 * This file is to convert a Commonjs file into an ESM one.
 */
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const commonDir = require("commondir");
const {hideText, restoreText, beforeReplace} = require("before-replace");
const {stripComments, clearStrings} = require("strip-comments-strings");
const beautify = require("js-beautify").js;

const {findPackageEntryPoint} = require("find-entry-point");

const extractComments = require("extract-comments");

const espree = require("espree");
const estraverse = require("estraverse");

const UglifyJS = require("uglify-js");

const toEsmPackageJson = require("../package.json");

const TARGET = {
    BROWSER: "browser",
    ESM    : "esm",
    CJS    : "cjs",
    ALL    : "all"
};
const ESM_EXTENSION = ".mjs";
const COMMENT_MASK = "❖✎🔏❉";

const nativeModules = Object.keys(process.binding("natives"));

// The whole list of files to convert
let cjsList = [];

const EOL = require("os").EOL;

const normaliseString = (content) =>
{
    content = content.replace(/\r\n/gm, "\n").replace(/\n/gm, EOL);
    return content;
};

/**
 * Build target directory.
 * Ignore, if the directory already exist
 * @param {string} targetDir Directory to build
 * @test Some parts are ignored for the coverage (needs to simulate conditions
 * linked to filesystem like root access or bad hard drive)
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
        /* istanbul ignore next */
        console.error(`${toEsmPackageJson.name}: (1001)`, e.message);
    }

    /* istanbul ignore next */
    return false;
};

/**
 * Execute some non-trivial transformations that require multiple passes
 * @param {string} converted String to perform transformations onto
 * @param detectedExported
 * @returns {*}
 */
const convertNonTrivialExportsWithAST = (converted, detectedExported = []) =>
{
    let converted0, subst;

    for (let i = 0; i < detectedExported.length; ++i)
    {
        const item = detectedExported[i];

        const regexSentence = `(class|function|const|var|let)\\s*\\b${item.funcname}\\b([\\S\\s]*?)(?:module\\.)?exports\\.\\b${item.namedExport}\\b\\s*=\\s*\\b${item.funcname}\\b\\s*;?`;

        const regexp =
            new RegExp(regexSentence, "gm");

        subst = `export $1 ${item.namedExport} $2`;

        converted0 = converted;
        converted = converted0.replace(regexp, subst);
    }

    return converted;
};

/**
 * Execute some non-trivial transformations that require multiple passes
 * @param {string} converted String to perform transformations onto
 * @returns {*}
 */
const convertNonTrivial = (converted) =>
{
    let converted0;
    let regex = /((?<!export\s+)(?:const|let|var)\s+)(\w+)(\s+=.*\b(?:module\.)?exports\s*=\s*{[^}]*\2\b)/sgm;
    let subst = "export $1$2$3";
    converted0 = converted;
    converted = converted0.replaceAll(regex, subst);

    regex = /(?:const|let|var)\s+([\w]+)([\s\S]*)\1\s*=\s*require\(([^)]+.js[^)])\)/sgm;
    subst = "import $1 from $3$2";
    converted0 = converted;
    converted = converted0.replaceAll(regex, subst);

    return converted;

};

/**
 * Check whether the given text has a valid JavaScript syntax
 * @param str
 * @param syntaxType
 * @returns {boolean}
 */
const validateSyntax = (str, syntaxType = "commonjs") =>
{
    try
    {
        espree.parse(
            str, {
                sourceType   : syntaxType,
                ecmaVersion  : "latest",
                allowReserved: false,
                loc          : false,
                range        : false,
                tokens       : false,
                comment      : false
            }
        );
        return true;
    }
        /* istanbul ignore next */
    catch (e)
    {
    }

    return false;
};

/**
 * If source finishes with a "/", it's a folder,
 * otherwise, it's not.
 * @returns {boolean}
 */
const isConventionalFolder = (source) =>
{
    if (!source)
    {
        return false;
    }
    return source.charAt(source.length - 1) === "/";
};

/**
 * Returns the path of a relative path relative to source.
 * @param source File that contains the require or import
 * @param requiredPath Relative path inside the require or import
 * @todo Change function name to more appropriate name
 */
const concatenatePaths = (source, requiredPath) =>
{
    source = normalisePath(source);
    const sourceDir = isConventionalFolder(source) ? source : path.parse(source).dir;
    let importPath = path.join(sourceDir, requiredPath);
    return normalisePath(importPath);
};

/**
 * Use conventions (See file top)
 * @todo Change function name to more appropriate name
 * @param source
 * @param requiredPath
 * @returns {string}
 */
const calculateRelativePath = (source, requiredPath) =>
{
    source = normalisePath(source);
    requiredPath = normalisePath(requiredPath);

    if (!isConventionalFolder(source))
    {
        source = path.parse(source).dir + "/";
    }

    const relativePath = path.relative(source, requiredPath);
    return normalisePath(relativePath);
};

/**
 * Third Party Module path starting with ./node_modules/ + relative path to the entry point
 * @param moduleName
 * @returns {string|null}
 */
const getModuleEntryPointPath = (moduleName, targetDir = "") =>
{
    try
    {
        let entryPoint;
        entryPoint = findPackageEntryPoint(moduleName, targetDir, {isCjs: false});
        entryPoint = normalisePath(entryPoint);

        const nodeModulesPos = entryPoint.indexOf("node_modules");
        if (nodeModulesPos === -1)
        {
            console.error(`${toEsmPackageJson.name}: (1381) The mode [${moduleName}] is located in a non-node_modules directory.`);
        }

        entryPoint = "./" + entryPoint.substring(nodeModulesPos);

        return entryPoint;
    }
    catch (e)
    {
        console.info(`${toEsmPackageJson.name}: (1140) Checking [${moduleName}] package.json`, e.message);
    }

    return null;
};

// ---------------------------------------------------
// NEW STUFF
// ---------------------------------------------------

/**
 * Transform a given path following some conventions.
 * @param somePath
 * @param isFolder
 * @returns {string}
 *
 * CONVENTIONS:
 * - All folders must finish with a "/"
 * - Paths must be made of forward slashes (no backward slash)
 */
const normalisePath = (somePath, {isFolder = false} = {}) =>
{
    somePath = somePath.replace(/\\/gm, "/");
    if (isFolder)
    {
        if (!isConventionalFolder(somePath))
        {
            somePath = somePath + "/";
        }
    }

    if (path.isAbsolute(somePath))
    {
        return somePath;
    }

    const firstChar = somePath.charAt(0);
    if (!somePath)
    {
        somePath = "./";
    }
    else if (somePath === ".")
    {
        somePath = "./";
    }
    else if (!([".", "/"].includes(firstChar)))
    {
        somePath = "./" + somePath;

    }
    return somePath;
};

/**
 * Convert path like:
 * C:/a/b/c/d => /a/b/c/d
 * So, they can be created as subdirectory
 * @param wholePath
 * @returns {*|string[]}
 */
const convertToSubRootDir = (wholePath) =>
{
    wholePath = normalisePath(wholePath);
    const arr = wholePath.split("/");
    arr.shift();
    return arr.join("/");
};

/**
 * Remove part of path by substracting a given directory from a whole path
 * @param wholePath File Path
 * @param pathToSubtract Subdirectory to remove from path
 * @returns {*}
 */
const subtractPath = (wholePath, pathToSubtract) =>
{
    let subPath, subDir;

    // Get mapped path by subtracting rootDir
    wholePath = wholePath.replace(/\\/gm, "/");
    pathToSubtract = pathToSubtract.replace(/\\/gm, "/");

    if (wholePath.length < pathToSubtract.length)
    {
        console.error(`${toEsmPackageJson.name}: (1123)` + "Path subtraction will not work here. " +
            "The subtracting path is bigger than the whole path");
        return {
            subPath: wholePath
        };
    }

    if (pathToSubtract === "./")
    {
        subPath = convertToSubRootDir(wholePath);
        subDir = path.parse(subPath).dir;
        subDir = normalisePath(subDir, {isFolder: true});

        return {
            subDir, subPath
        };
    }
    else if (wholePath.indexOf(pathToSubtract) === -1)
    {
        console.error(`${toEsmPackageJson.name}: (1125)` + "Path subtraction will not work here. " +
            "The subtracting path is not part of the whole path");
        return {
            subPath: wholePath
        };
    }

    if (pathToSubtract.charAt(pathToSubtract.length - 1) !== "/")
    {
        pathToSubtract = pathToSubtract + "/";
    }

    let subPaths = wholePath.split(pathToSubtract);
    subPath = subPaths[1];
    subPath = normalisePath(subPath);

    subDir = path.parse(subPath).dir;
    subDir = normalisePath(subDir);

    return {
        subDir, subPath
    };
};

/**
 * Look up for a path in the glob list
 * @param requiredPath
 * @param list
 * @returns {{}|*}
 */
const getTranslatedPath = (requiredPath, list) =>
{
    requiredPath = normalisePath(requiredPath);
    for (let i = 0; i < list.length; ++i)
    {
        const item = list[i];

        const source = normalisePath(item.source);
        if (requiredPath === source)
        {
            return item;
        }
    }
    return {};
};

const getProjectedPathAll = ({source, rootDir, outputDir}) =>
{
    try
    {
        const sourcePath = path.resolve(source);
        rootDir = path.resolve(rootDir);

        // Get mapped path by subtracting rootDir
        let {subPath, subDir} = subtractPath(sourcePath, rootDir);

        let projectedDir = path.join(outputDir, subDir);
        projectedDir = normalisePath(projectedDir);

        let projectedPath = path.join(outputDir, subPath);
        projectedPath = normalisePath(projectedPath);

        return {
            sourcePath,
            subPath,
            subDir,
            projectedPath,
            projectedDir
        };
    }
    catch (e)
    {
        console.error(`${toEsmPackageJson.name}: (1120)`, e.message);
    }

    return {};
};

/**
 * Change the given path extension to .mjs
 * @param filepath
 * @returns {string}
 */
const changePathExtensionToESM = (filepath) =>
{
    const parsed = path.parse(filepath);
    const renamed = path.join(parsed.dir, parsed.name + ESM_EXTENSION);
    return normalisePath(renamed);
};

/**
 *
 * @param sourcePath
 * @param requiredPath
 * @param list
 * @param followlinked
 * @param outputDir
 * @returns {string}
 */
const calculateRequiredPath = ({sourcePath, requiredPath, list, followlinked, outputDir}) =>
{
    let projectedRequiredPath;

    // Projected path of required path
    const requiredPathProperties = getTranslatedPath(requiredPath, list);
    const target = requiredPathProperties.target;

    if (target)
    {
        // The relative path of the two projected paths above (projectedPath + target)
        projectedRequiredPath = calculateRelativePath(sourcePath, target);
    }
    else
    {
        if (followlinked)
        {
            const newPath = concatenatePaths(outputDir, requiredPath);
            projectedRequiredPath = calculateRelativePath(sourcePath, newPath);
            projectedRequiredPath = changePathExtensionToESM(projectedRequiredPath);
        }
        else
        {
            projectedRequiredPath = calculateRelativePath(sourcePath, requiredPath);
            projectedRequiredPath = changePathExtensionToESM(projectedRequiredPath);
        }
    }

    return projectedRequiredPath;
};

/**
 * Parse imported libraries (the ones that don't have a relative or absolute path)
 * @param text
 * @param list
 * @param fileProp
 * @returns {*}
 */
const reviewEsmImports = (text, list, {
    source,
    rootDir,
    outputDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    followlinked,
    moreOptions
}) =>
{
    // Locate third party
    // const re = /\bfrom\s+["']([^.\/~@][^"']+)["'];?/gmu;
    const re = /\bfrom\s+["']([^"']+?)["'];?/gmu;

    return text.replace(re, function (match, regexRequiredPath)
    {
        try
        {
            if (~nativeModules.indexOf(regexRequiredPath))
            {
                console.info(`${toEsmPackageJson.name}: (1017) ${regexRequiredPath} is a built-in NodeJs module.`);
                return match;
            }

            // Third party libraries
            if (!regexRequiredPath.startsWith("."))
            {
                let moduleName = regexRequiredPath;
                if (nonHybridModuleMap[moduleName])
                {
                    moduleName = nonHybridModuleMap[moduleName];
                }

                let requiredPath = getModuleEntryPointPath( moduleName, workingDir );
                if (!requiredPath)
                {
                    console.warn(`${toEsmPackageJson.name}: (1099) The module [${moduleName}] was not found in your node_modules directory. `
                        + "Skipping.");
                    return match;
                }

                // Source path of projected original source (the .cjs)
                let {projectedPath} = getProjectedPathAll({source, rootDir, outputDir});

                let projectedRequiredPath = calculateRequiredPath(
                    {
                        sourcePath: projectedPath, requiredPath, list,
                        followlinked, workingDir, outputDir
                    });

                if (followlinked)
                {
                    addFileToConvertingList({
                        source   : requiredPath,
                        rootDir  : workingDir,
                        outputDir,
                        workingDir,
                        followlinked,
                        notOnDisk: moreOptions.useImportMaps,
                        referrer : source
                    });
                }

                importMaps[moduleName] = requiredPath;
                if (moreOptions.useImportMaps)
                {
                    projectedRequiredPath = moduleName;
                    if (requiredPath.indexOf("node_modules") > -1)
                    {
                        requiredPath = "./node_modules" + requiredPath.split("node_modules")[1];
                    }
                    importMaps[moduleName] = requiredPath;
                }

                return match.replace(regexRequiredPath, projectedRequiredPath);
            }

            if (regexRequiredPath.startsWith("./") || regexRequiredPath.startsWith(".."))
            {
                // Source path of projected original source (the .cjs)
                let {projectedPath} = getProjectedPathAll({source, rootDir, outputDir});

                // The required path from the source path above
                let requiredPath = concatenatePaths(source, regexRequiredPath);

                let projectedRequiredPath = calculateRequiredPath(
                    {
                        sourcePath: projectedPath, requiredPath, outputDir,
                        list, followlinked, workingDir
                    });

                if (followlinked)
                {
                    addFileToConvertingList({
                        source  : requiredPath,
                        rootDir : workingDir,
                        outputDir,
                        workingDir,
                        followlinked,
                        referrer: source
                    });
                }

                return match.replace(regexRequiredPath, projectedRequiredPath);
            }

            return match;
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error(`${toEsmPackageJson.name}: (1108)`, e.message);
        }

    });

};

/**
 * Parse the string within "requires" to evaluate given paths
 * @param text
 * @param list
 * @param fileProp
 * @param workingDir
 * @returns {*}
 */
const parseImportWithRegex = (text, list, fileProp, workingDir) =>
{
    const parsedFilePath = path.join(workingDir, fileProp.source);
    const parsedFileDir = path.dirname(parsedFilePath);

    const re = /require\(["'`]([.\/][^)]+)["'`]\)/gmu;

    return text.replace(re, function (match, group)
    {
        const target = path.join(parsedFileDir, group);
        const extension = path.extname(target);

        const targets = [];
        if (!extension)
        {
            targets.push(target + ".cjs");
            targets.push(target + ".js");
        }
        else if (![".js", ".cjs"].includes(extension))
        {
            return match;
        }
        else
        {
            targets.push(target);
        }

        const index = list.findIndex(function ({source})
        {
            const possibleFilePath = path.join(workingDir, source);
            return (targets.includes(possibleFilePath));
        });

        if (index < 0)
        {
            return match;
        }

        // current file's absolute path
        const sourcePath = path.resolve(fileProp.outputDir);

        const {source, outputDir} = list[index];
        const basename = path.parse(source).name;

        // Absolute path in the require
        const destinationPath = path.resolve(outputDir);

        let relativePath = path.relative(sourcePath, destinationPath);
        relativePath = path.join(relativePath, basename + ESM_EXTENSION);
        relativePath = relativePath.replace(/\\/g, "/");
        if (!([".", "/"].includes(relativePath.charAt(0))))
        {
            relativePath = "./" + relativePath;
        }

        return match.replace(group, relativePath);
    });
};

const convertModuleExportsToExport = (converted) =>
{
    // Convert module.exports to export default
    converted = converted.replace(/(?:module\.)?exports\s*=/gm, "export default");

    // Convert module.exports.something to export something
    converted = converted.replace(/(?:module\.)?exports\./gm, "export const ");

    return converted;
};

/**
 * Parse the given test and use regex to transform requires into imports.
 * @note This function is used with both parser (AST or Regex)
 * @param converted
 * @returns {*}
 */
const convertRequiresToImport = (converted) =>
{
    converted = stripCodeComments(converted);

    // convert require with .json file to import
    converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(([^)]+.json[^)])\)/gm, "import $1 from $2 assert {type: \"json\"}");

    // convert require with .js or .cjs extension to import
    converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(([^)]+\.c?js)([^)])\)/gm, "import $1" +
        " from" +
        " $2$3");

    // convert require without extension to import without extension
    converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(["'`]([./\\][^"'`]+)["'`]\)/gm, "import $1 from \"$2\"");

    // convert require with non-relative path to import (Third Party libraries)
    converted = converted.replace(/(?:const|let|var)\s+([^=]+)\s*=\s*require\(["'`]([^"'`]+)["'`]\)/gm, "import $1 from \"$2\"");

    return converted;
};

/**
 * An import is a declaration + assignment, so we need to remove cjs
 * declarations that were not combined in the same line.
 * TODO: Needs optimisation
 * @param converted
 * @param extracted
 */
const removeDeclarationForAST = (converted, extracted) =>
{
    let regexp;
    for (let i = 0; i < extracted.length; ++i)
    {
        const prop = extracted[i];
        if (!prop.declareNotOnTheSameLine)
        {
            continue;
        }

        const identifier = prop.identifier;

        // Replace declaration of type `let something =`
        regexp = new RegExp(`(var|let|const)\\s+(${identifier}\\s+=)`);
        converted = converted.replace(regexp, "$2");

        // Remove declaration of type `let something, something2;`
        regexp = new RegExp(`(var|let|const)\\s+(${identifier}\\s*\,)`);
        converted = converted.replace(regexp, "$1");

        // Remove declaration of type `let something2, something`
        regexp = new RegExp(`(var|let|const)(.*)\\,\\s*${identifier}`);
        converted = converted.replace(regexp, "$1$2");

        // Remove declaration of type `log something;`
        regexp = new RegExp(`(?:var|let|const)\\s+${identifier}\\s*[;]`);
        converted = converted.replace(regexp, "");
    }

    return converted;
};

/**
 * Convert "requires" to imports and move them to the top of the file.
 * @param converted
 * @param extracted
 * @param list
 * @param source
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param nonHybridModuleMap
 * @param workingDir
 * @param followlinked
 * @param moreOptions
 * @returns {string|*}
 * @private
 */
const applyExtractedASTToImports = (converted, extracted, list, {
    source,
    outputDir,
    rootDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    followlinked,
    moreOptions
}) =>
{
    try
    {
        if (!extracted.length)
        {
            return converted;
        }

        const importList = [];
        for (let i = extracted.length - 1; i >= 0; --i)
        {
            const prop = extracted[i];
            try
            {
                if (prop.declareNotOnTheSameLine)
                {
                    prop.text = "let " + prop.text;
                }

                let transformedLines = stripCodeComments(prop.text);
                transformedLines = convertRequiresToImport(transformedLines);

                const valid = validateSyntax(transformedLines, "module");
                if (!valid)
                {
                    continue;
                }

                transformedLines = reviewEsmImports(transformedLines, list,
                    {
                        source, outputDir, rootDir, importMaps,
                        nonHybridModuleMap, workingDir, followlinked, moreOptions
                    });

                transformedLines = transformedLines.trim();
                if (transformedLines.charAt(transformedLines.length - 1) !== ";")
                {
                    transformedLines = transformedLines + ";";
                }
                importList.push(transformedLines);
                converted = converted.substring(0, prop.start) + converted.substring(prop.end);
            }
            catch (e)
            {
                console.error(`${toEsmPackageJson.name}: (1006)`, e.message);
            }
        }

        const EOL = require("os").EOL;
        converted = importList.reverse().join(EOL) + converted;
    }
    catch (e)
    {
        console.error(`${toEsmPackageJson.name}: (1007)`, e.message);
    }

    return converted;
};

/**
 * Extract information related to cjs imports and use them to do the transformation.
 * @param converted
 * @param list
 * @param source
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param nonHybridModuleMap
 * @param workingDir
 * @param followlinked
 * @param moreOptions
 * @returns {{converted, success: boolean}}
 */
const convertRequiresToImportsWithAST = (converted, list, {
    source,
    outputDir,
    rootDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    followlinked,
    moreOptions
}) =>
{
    let success = true;
    const detectedExported = [];

    try
    {
        const extracted = [];

        let ast;
        try
        {
            ast = espree.parse(
                converted, {
                    sourceType   : "commonjs",
                    ecmaVersion  : "latest",
                    allowReserved: false,
                    loc          : true,
                    range        : true,
                    tokens       : true,
                    comment      : true
                }
            );
        }
        catch (e)
        {
            console.warn(`${toEsmPackageJson.name}: (1052) WARNING: Syntax issues found on [${source}]`);
            console.error(`${toEsmPackageJson.name}: (1208) ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ ➔ `, e.message);
            return {converted, success: false};
        }

        let text, start, end, requirePath, identifier;

        const previouses = [];

        estraverse.traverse(ast, {
            enter: function (node, parent)
            {
                try
                {
                    const lastFound = extracted[extracted.length - 1];
                    if (lastFound)
                    {
                        if (!lastFound.wholeLine)
                        {
                            lastFound.wholeLine = true;
                            lastFound.end = node.range[0] - 1;
                            lastFound.text = converted.substring(lastFound.start, lastFound.end);
                        }
                    }

                    if (node && node.type === "Literal")
                    {
                        if (parent && parent.type === "CallExpression" && parent.callee && parent.callee.name === "require")
                        {
                            requirePath = node.value;
                            end = parent ? parent.range[0] : node.range[0];

                            previouses.pop();
                            for (let i = previouses.length - 1; i >= 0; --i)
                            {
                                let previous = previouses[i];

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
                                    previous = previouses[i];
                                    start = previous.parent.range[0];
                                    break;
                                }
                            }

                        }

                    }

                    // // parent.expression.left.object.property.name
                    // if (parent && parent.expression && parent.expression.left)
                    //     (parent.expression.left.type === "MemberExpression" &&
                    //         parent.expression.left.object.property.name === "exports" &&
                    //         parent.expression.left.object.object.name === "module" &&
                    //         parent.expression.left.property.type = "Identifier" &&
                    //         parent.expression.left.property.name === "fromRgb" &&
                    //         parent.expression.right.type === "Identifier" &&
                    //             parent.expression.right.name === "getAnsiFromRgb"
                    //     )

                    if (parent && parent.expression && parent.expression.left && parent.expression.left.type === "MemberExpression")
                    {
                        if (parent.expression.left.object && parent.expression.left.object.property && parent.expression.left.object.property.name === "exports")
                        {
                            const namedExport = parent.expression.left.property.name;
                            const funcname = parent.expression.right.name;

                            detectedExported.push({
                                namedExport, funcname, source
                            });
                        }

                    }

                    previouses.push({
                        parent,
                        node
                    });
                }
                catch (e)
                {
                    console.error(`${toEsmPackageJson.name}: (1008)`, e.message);
                }
            },
            leave: function (node, parent)
            {
                try
                {
                    if (end > 0)
                    {
                        end = parent.range[1];
                        text = converted.substring(start, end);

                        const textTrimmed = text.trim();

                        const info = {
                            start, end, text, requirePath, source, identifier
                        };

                        if (!(textTrimmed.indexOf("const") === 0 || textTrimmed.indexOf("let") === 0 || textTrimmed.indexOf("var") === 0))
                        {
                            info.declareNotOnTheSameLine = true;
                        }

                        extracted.push(info);

                        requirePath = null;
                        start = 0;
                        end = 0;
                    }

                }
                catch (e)
                {
                    console.error(`${toEsmPackageJson.name}: (1057)`, e.message);
                }
            }
        });

        converted = applyExtractedASTToImports(converted, extracted, list, {
            source,
            outputDir,
            rootDir,
            importMaps,
            nonHybridModuleMap,
            workingDir,
            followlinked,
            moreOptions
        });
        converted = removeDeclarationForAST(converted, extracted);
    }
    catch (e)
    {
        success = false;
        console.error(`${toEsmPackageJson.name}: (1009) [${source}] ->`, e.message);
    }

    return {converted, success, detectedExported};
};

/**
 * Remove comments from code
 * @param code
 * @param {[]} extracted If not null, comments are replaced instead of removed.
 * @returns {*}
 */
const stripCodeComments = (code, extracted = null) =>
{
    const commentProps = extractComments(code, {}, null);

    if (!commentProps.length)
    {
        return code;
    }

    let commentIndexer = 0;
    for (let i = commentProps.length - 1; i >= 0; --i)
    {
        const commentProp = commentProps[i];
        const indexCommentStart = commentProp.range[0];
        const indexCommentEnd = commentProp.range[1];
        if (!extracted)
        {
            code = code.substring(0, indexCommentStart) + code.substring(indexCommentEnd);
            continue;
        }

        extracted[commentIndexer] = code.substring(indexCommentStart, indexCommentEnd);
        code =
            code.substring(0, indexCommentStart) +
            COMMENT_MASK + commentIndexer + COMMENT_MASK +
            code.substring(indexCommentEnd);

        ++commentIndexer;
    }

    return code;
};

const putBackComments = (str, extracted) =>
{
    if (!extracted.length)
    {
        return str;
    }

    for (let i = 0; i < extracted.length; ++i)
    {
        str = str.replace(COMMENT_MASK + i + COMMENT_MASK, extracted[i]);
    }

    return str;
};

/**
 * Apply command found in source code comments
 * @param converted
 * @param target
 * @param saved
 */
const applyDirectives = (converted, {target = "all"} = {}) =>
{
    let regexp;

    // Hide/skip => to-esm-browser: skip
    regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*skip\\s*\\*\\*\\/([\\s\\S]*?)\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*end-skip\\s*\\*\\*\\/`, "gm");
    converted = hideText(regexp, converted);

    // Remove => to-esm-browser: remove
    regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*remove\\s*\\*\\*\\/[\\s\\S]*?\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*end-remove\\s*\\*\\*\\/`, "gm");
    converted = converted.replace(regexp, "");

    // Insert => to-esm-browser: add
    regexp = new RegExp(`\\/\\*\\*\\s*to-esm-${target}\\s*:\\s*add\\s*$([\\s\\S]*?)^.*\\*\\*\\/`, "gm");
    converted = converted.replace(regexp, "$1");

    return converted;
};

/**
 * Generate an object describing a file to convert
 * @param source
 * @param rootDir
 * @param outputDir
 * @param workingDir
 * @returns {{outputDir: string, targetAbs: *, sourceAbs: string, subDir: *, sourceNoExt: string, rootDir, source:
 *     string, subPath: *, target: string}}
 */
const formatConvertItem = ({source, rootDir, outputDir, workingDir}) =>
{
    try
    {
        let sourceAbs = path.join(workingDir, source);
        sourceAbs = normalisePath(sourceAbs);

        rootDir = normalisePath(rootDir);
        let {subPath, subDir} = subtractPath(sourceAbs, rootDir);

        let targetName = path.parse(subPath).name + ESM_EXTENSION;

        let target = path.join(outputDir, subDir, targetName);
        target = normalisePath(target);

        let targetAbs = path.join(workingDir, target);

        let extra = path.parse(source);
        let sourceNoExt = path.join(extra.dir, extra.name);
        sourceNoExt = normalisePath(sourceNoExt);

        source = normalisePath(source);

        outputDir = normalisePath(outputDir, {isFolder: true});

        let id = require("crypto")
            .createHash("sha256")
            .update(target)
            .digest("hex");

        return {
            source,
            sourceAbs,
            sourceNoExt,
            outputDir,
            rootDir,
            subPath,
            subDir,
            target,
            targetAbs,
            id,
            weight: 1
        };
    }
    catch (e)
    {
        console.error(`${toEsmPackageJson.name}: (1011)`, e.message);
    }
};


const hasImportmap = (content) =>
{
    const regex = /\<script.+importmap.+\>([\s\S]+?)\<\/script>/gm;
    let match;
    match = regex.exec(content);
    return match && match.length;
};

const getImportMapFromPage = (fullHtmlPath) =>
{
    let content = fs.readFileSync(fullHtmlPath, "utf-8");

    const regex = /\<script.+importmap.+\>([\s\S]+?)\<\/script>/gm;

    let match;
    match = regex.exec(content);
    if (!match || !match.length)
    {
        return {};
    }

    let rawImportMap = match[1].trim();

    try
    {
        return JSON.parse(rawImportMap);
    }
    catch (e)
    {
        console.error(`${toEsmPackageJson.name}: (1231)`, e.message);
    }

    return {};
};

/**
 * Merge importmap from html page, importmap from parsing and importmap from configfile
 * @param newMaps
 * @param importMaps
 * @returns {{imports: any}}
 */
const combineImportMaps = (newMaps, importMaps) =>
{
    let result = Object.assign({}, newMaps.imports, importMaps);
    return {imports: result};
};

const rewriteImportMapPaths = (newMaps, htmlPath) =>
{
    for (let kk in newMaps.imports)
    {
        try
        {
            const root = path.relative(htmlPath, "./");
            const jsPath = path.join(root, newMaps.imports[kk]);
            newMaps.imports[kk] = normalisePath(jsPath);
        }
        catch (e)
        {
            console.error(`${toEsmPackageJson.name}: (1205)`, e.message);
        }
    }

    return newMaps;
};

const applyReplaceToImportMap = (newMaps, htmlOptions) =>
{
    if (!htmlOptions.importmapReplace || !htmlOptions.importmapReplace.length)
    {
        return newMaps;
    }

    regexifySearchList(htmlOptions.importmapReplace);

    for (let kk in newMaps.imports)
    {
        try
        {
            newMaps.imports[kk] = applyReplaceFromConfig(newMaps[kk], htmlOptions.importmapReplace);
        }
        catch (e)
        {
            console.error(`${toEsmPackageJson.name}: (1205)`, e.message);
        }
    }

    return newMaps;
};

const writeImportMapToHTML = (newMaps, fullHtmlPath) =>
{
    let content = fs.readFileSync(fullHtmlPath, "utf-8");
    const scriptMap = normaliseString(JSON.stringify(newMaps, null, 4));

    if (hasImportmap(content))
    {
        content = content.replace(/(\<script.+importmap.+\>)([\s\S]+?)(\<\/script>)/gm, `$1${scriptMap}$3`);
    }
    else
    {
        const ins = `<script type="importmap">
    ${scriptMap}
</script>
`;
        const EOL = require("os").EOL;
        content = content.replace(/(\<head.*?\>)/gm, `$1${EOL}${ins}`);
    }

    fs.writeFileSync(fullHtmlPath, content, "utf-8");
    return newMaps;
};

/**
 * Insert importmaps into the passed html file
 * @param fullHtmlPath
 * @param htmlPath
 * @param importMaps
 */
const parseHTMLFile = (htmlPath, {importMaps = {}, htmlOptions = {}}) =>
{
    let fullHtmlPath = path.resolve(htmlPath);
    /* istanbul ignore next */
    if (!fs.existsSync(fullHtmlPath))
    {
        console.error(`${toEsmPackageJson.name}: (1080) Could not find HTML file at [${fullHtmlPath}]`);
        return;
    }

    // Get merged version of importmap from html page and importmap from parsing
    let newMaps = getImportMapFromPage(fullHtmlPath);

    newMaps = combineImportMaps(newMaps, importMaps);

    newMaps = rewriteImportMapPaths(newMaps, htmlPath);

    newMaps = applyReplaceToImportMap(newMaps, htmlOptions);

    newMaps = combineImportMaps(newMaps, htmlOptions.importmap);

    writeImportMapToHTML(newMaps, fullHtmlPath);

};

/**
 * Browse and update all specified html files with importmaps
 * @param list
 * @param importMaps
 * @param confFileOptions
 * @param moreOptions
 * @param htmlOptions
 */
const updateHTMLFiles = (list, {importMaps = {}, confFileOptions = {}, moreOptions = {}, htmlOptions = {}}) =>
{
    list.forEach((html) =>
    {
        console.error(`${toEsmPackageJson.name}: (1200) Processing [${html}] for importing maps.`);
        parseHTMLFile(html, {importMaps, confFileOptions, moreOptions, htmlOptions});
    });
};

/**
 * Fallback conversion when parsing fails.
 * @param converted
 * @param list
 * @param source
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @param workingDir
 * @param followlinked
 * @param moreOptions
 * @returns {*}
 */
const convertToESMWithRegex = (converted, list, {
    source,
    outputDir,
    rootDir,
    importMaps,
    workingDir,
    followlinked,
    moreOptions
} = {}) =>
{
    try
    {
        const extractedComments = [];

        converted = stripCodeComments(converted, extractedComments);

        converted = parseImportWithRegex(converted, list, {source, outputDir, rootDir}, workingDir);

        converted = convertNonTrivial(converted);

        converted = convertModuleExportsToExport(converted);

        converted = convertRequiresToImport(converted);

        converted = reviewEsmImports(converted, list,
            {
                source, outputDir, rootDir,
                importMaps, workingDir, followlinked, moreOptions
            });

        converted = putBackComments(converted, extractedComments);


    }
    catch (e)
    {
        console.error(`${toEsmPackageJson.name}: (1012)`, e.message);
    }
    return converted;
};

const getOptionsConfigFile = async (configPath) =>
{
    let confFileOptions = {};

    configPath = path.resolve(configPath);
    if (fs.existsSync(configPath))
    {
        const extension = path.parse(configPath).ext;

        if ([".js", ".cjs"].includes(extension))
        {
            confFileOptions = require(configPath);
        }
        else if ([".mjs"].includes(extension))
        {
            const {default: options} = await import(configPath);
            confFileOptions = options;
        }
        else
        {
            const contents = fs.readFileSync(configPath, {encoding: "utf8"});
            try
            {
                confFileOptions = JSON.parse(contents.toString());
            }
            catch (e)
            {
                console.error(`${toEsmPackageJson.name}: (1013)`, e.message);
                console.info("Skipping config file options");
            }
        }
    }

    return confFileOptions;
};

/**
 * Parse "replace" entry list given by the user.
 * Convert all search entries into their Regex equivalent.
 * @param replace
 * @returns {*[]}
 */
const regexifySearchList = (replace = []) =>
{
    replace.forEach((item) =>
    {
        if (item.search instanceof RegExp)
        {
            item.regex = true;
        }
        else if (item.regex)
        {
            item.search = new RegExp(item.search);
        }
    });

    return replace || [];
};

const getLibraryInfo = (modulePackname) =>
{
    const info = {
        installed: false
    };
    try
    {
        const installed = require.resolve(modulePackname);
        if (installed)
        {
            info.installed = true;

            const dir = path.parse(installed).dir;
            const packageJsonPath = path.join(dir, "package.json");
            const packageJson = require(packageJsonPath);
            info.version = packageJson.version;
        }

    }
    catch (e)
    {

    }
    return info;
};

/* istanbul ignore next */

/**
 * Install npm packages on the users project.
 * Ignore for the tests as it requires some End to End testing.
 * @param name
 * @param version
 * @param isDevDependencies
 * @param moduleName
 * @param isCjs
 * @param packageJson
 */
const installPackage =
    ({name, version, isDevDependencies, moduleName, isCjs, packageJson} = {}) =>
    {
        try
        {
            const info = getLibraryInfo(name);
            if (info.installed && (version.split(info.version).length === 1 || version.split(info.version).length === 2))
            {
                return;
            }

            if (info.installed && info.version.indexOf("latest") > -1)
            {
                return;
            }
        }
        catch (e)
        {

        }

        const devOption = isDevDependencies ? " -D" : "";

        const child_process = require("child_process");

        const environment = isCjs ? "CommonJs modules" : "ES Modules";

        console.info(`${packageJson.name}: (1142) Installing (${environment}) package [${moduleName}${version}] as [${name}]`);
        child_process.execSync(`npm install ${name}@npm:${moduleName}${version} ${devOption}`, {stdio: []});
        console.info(`${packageJson.name}: (1144) ✔ Success`);
    };
/**
 * When defined in the config file, install a specific module version for commonjs
 * and a specific module version for ESM.
 * We do this to be able to keep working with both CJS and ESM.
 * The cjs working code will point to the cjs package and after applying the transformation,
 * the converted code (ESM) will know where to point at to solve the location of
 * a particular library.
 * It is specially useful for the importmaps.
 * @note Some libraries only supports ESM on their latest version.
 * @param config
 * @returns {Promise<{}>}
 */
const installNonHybridModules = async (config = []) =>
{
    const replaceModules = config.replaceModules || [];

    let packageJsonPath = path.resolve("./package.json");
    /* istanbul ignore next */
    if (!fs.existsSync(packageJsonPath))
    {
        console.error(`${toEsmPackageJson.name}: (1014) Could not locate package Json. To use the replaceModules options, you must run this process from your root module directory.`);
        return null;
    }

    // const toEsmPackageJson = require(packageJsonPath);
    const moduleList = Object.keys(replaceModules);

    const nonHybridModules = {};

    for (const moduleName of moduleList)
    {
        try
        {
            const moduleItem = replaceModules[moduleName];

            moduleItem.cjs = moduleItem.cjs || {};
            moduleItem.esm = moduleItem.esm || {};

            let version = moduleItem.cjs.version || "@latest";
            let cjsName = moduleItem.cjs.name || moduleName;
            let isDevDependencies = !!moduleItem.cjs.devDependencies;

            // Install cjs package
            installPackage({
                version,
                name       : cjsName,
                isDevDependencies,
                moduleName,
                isCjs      : true,
                packageJson: toEsmPackageJson
            });

            version = moduleItem.esm.version || "@latest";
            let esmName = moduleItem.esm.name || moduleName;
            isDevDependencies = !!moduleItem.esm.devDependencies;

            // Install esm package
            installPackage({
                version,
                name       : esmName,
                isDevDependencies,
                moduleName,
                isCjs      : false,
                packageJson: toEsmPackageJson
            });

            nonHybridModules[cjsName] = esmName;
        }
        catch (e)
        {
            /* istanbul ignore next */
            console.error(`${toEsmPackageJson.name}: (1015)`, e.message);
        }
    }

    return nonHybridModules;
};

const parseEsm = (filepath, content, {
    range = false,
    loc = false,
    comment = false,
    tokens = false,
    ecmaVersion = "latest",
    allowReserved = false,
    sourceType = "module",
    ecmaFeatures = {
        jsx          : false,
        globalReturn : false,
        impliedStrict: false
    }
} = {}) =>
{
    try
    {
        const parserOtions = {
            range,
            loc,
            comment,
            tokens,
            ecmaVersion,
            allowReserved,
            sourceType,
            ecmaFeatures
        };
        content = content || fs.readFileSync(filepath, "utf-8");

        espree.parse(content, parserOtions);
    }
    catch (error)
    {
        return {success: false, error};
    }

    return {success: true};
};


/**
 * Check whether a file is CommonJs
 * @param filepath
 * @returns {boolean}
 */
const isCjsCompatible = (filepath, content = "") =>
{
    const extension = path.extname(filepath);
    if (".mjs" === extension)
    {
        return false;
    }

    content = content || fs.readFileSync(filepath, "utf-8");
    content = stripComments(content);
    content = clearStrings(content);

    if (/\bimport\b[\s\S]*?\bfrom\b/gm.test(content) || /\bexport\b\s+\bdefault\b/gm.test(content))
    {
        return false;
    }

    if (/\brequire\b\s*\(/gm.test(content) || /(?:module\.)?\bexports\b\.?/gm.test(content))
    {
        return true;
    }

    if (/\bexport\b\s+/gm.test(content))
    {
        return false;
    }

    return true;
};

const findEntry = (source, propertyName = "source") =>
{
    if (!source)
    {
        return null;
    }

    const n = cjsList.length;
    for (let i = 0; i < n; ++i)
    {
        const item = cjsList[i] || {};
        if (item[propertyName] === source)
        {
            return item;
        }
    }
    return null;
};

/**
 * Add a file to the list of files to parse.
 * @param source
 * @param rootDir
 * @param outputDir
 * @param workingDir
 * @param notOnDisk
 * @returns {{outputDir: string, targetAbs: *, sourceAbs: string, subDir: *, sourceNoExt: string, rootDir, source:
 *     string, subPath: *, target: string}}
 */
const addFileToConvertingList = ({
                                     source,
                                     rootDir,
                                     outputDir,
                                     workingDir,
                                     notOnDisk,
                                     referrer = null,
                                     entryPoint = false
                                 }) =>
{
    if (!fs.existsSync(source))
    {
        console.error(`${toEsmPackageJson.name}: (1141) Could not find the file [${source}]`);
        return false;
    }

    const entryReferer = findEntry(referrer) || {weight: 1};
    let entry = findEntry(source);
    if (!entry)
    {
        entry = formatConvertItem({source, rootDir, outputDir, workingDir});
    }

    entry.weight = entry.weight + entryReferer.weight;
    entry.notOnDisk = !!notOnDisk;
    entry.entryPoint = entryPoint;
    entry.referrees = entry.referrees || [];
    if (referrer)
    {
        ++entry.weight;
        entry.referrees.push(referrer);
    }

    for (let i = 0; i < cjsList.length; ++i)
    {
        const item = cjsList[i];
        if (entry.source === item.source)
        {
            return entry;
        }
    }

    cjsList.push(entry);
    return entry;
};

const resetFileList = () =>
{
    cjsList = [];
};

const getIndent = async (str) =>
{
    try
    {
        const match = str.match(/([\t ]+)"name"/);
        return match[1];
    }
    catch (e)
    {
        console.error(`${toEsmPackageJson.name}: (1301)`, e.message);
    }
    return 2;
};

/**
 * Apply replacements from user config file or modules parsing
 * @param converted
 * @param replace
 * @returns {*}
 */
const applyReplaceFromConfig = (converted, replace) =>
{
    replace.forEach((item) =>
    {
        if (item.regex)
        {
            converted = converted.replace(item.search, item.replace);
        }
        else
        {
            converted = converted.split(item.search).join(item.replace);
        }
    });
    return converted;
};

/**
 * Insert header to source
 * @param converted
 * @param source
 * @param noHeader
 * @returns {string}
 */
const insertHeader = (converted, source, {noHeader = false} = {}) =>
{
    if (noHeader)
    {
        return converted;
    }

    converted = `/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [${source}]{@link ${source}}
 * 
 **/${EOL}` + converted;

    return converted;
};

/**
 *
 * @note Event though we already loaded package.json, things might have happened,
 * so, we load a fresh version than we rewrite immediately.
 * @param entryPoint
 * @param bundlePath
 * @returns {boolean}
 */
const updatePackageJson = async ({entryPoint, workingDir} = {}) =>
{
    if (!entryPoint)
    {
        console.error(`${toEsmPackageJson.name}: (1401) Can not update package.json. The option --entrypoint was not set.`);
        return false;
    }

    const packageJsonLocation = path.join(workingDir, "./package.json");

    /* istanbul ignore next */
    if (!fs.existsSync(packageJsonLocation))
    {
        console.error(`${toEsmPackageJson.name}: (1281) package.json not in [${packageJsonLocation}].`);
        return false;
    }

    let json;

    try
    {
        let content = fs.readFileSync(packageJsonLocation, "utf-8") || "";
        /* istanbul ignore next */
        if (!content.trim())
        {
            console.error(`${toEsmPackageJson.name}: (1283) package.json is empty or invalid.`);
            return false;
        }
        json = JSON.parse(content);

        const entry = {
            "require": entryPoint.source,
            "import" : entryPoint.target
        };

        json.main = entryPoint.source;
        json.module = entryPoint.target;
        json.type = "module";

        if (!json.exports)
        {
            /* istanbul ignore next */
            json.exports = {
                ".": {...entry}
            };
        }
        else if (!json.exports["."])
        {
            /* istanbul ignore next */
            json.exports["."] = entry;
        }
        else if (typeof json.exports["."] === "object" && !Array.isArray(json.exports["."]))
        {
            json.exports["."] = Object.assign({}, json.exports["."], entry);
        }
        else
        {
            /* istanbul ignore next */
            json.exports["."] = entry;
        }

        let indent = 2;
        try
        {
            indent = await getIndent(content);
        }
        catch (e)
        {
            console.info(`${toEsmPackageJson.name}: (1289) `, e.message);
        }

        let str = normaliseString(JSON.stringify(json, null, indent));
        fs.writeFileSync(packageJsonLocation, str, "utf8");

        console.log(`${toEsmPackageJson.name}: (1412) `);
        console.log(`${toEsmPackageJson.name}: (1414) ================================================================`);
        console.log(`${toEsmPackageJson.name}: (1416) package.json updated`);
        console.log(`${toEsmPackageJson.name}: (1418) ----------------------------------------------------------------`);
        console.log(`${toEsmPackageJson.name}: (1420) Your package.json has successfully been updated (--update-all option)`);
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error(`${toEsmPackageJson.name}: (1285) Could not update package.json.`);
    }

    return true;
};

const reorderImportListByWeight = (cjsList) =>
{
    cjsList.sort((entry0, entry1) =>
    {
        return entry1.weight - entry0.weight;
    });
};

const concatFiles = (files, dest) =>
{
    const writeStream = fs.createWriteStream(dest);

    const n = files.length;
    for (let i = 0; i < n; ++i)
    {
        let file = files[i];
        fs.readFileSync(file).pipe(writeStream);
    }
};

const buildExport = ({exported, id}) =>
{
    let str = "";
    if (!exported)
    {
        return str;
    }

    for (let i = 0; i < exported.length; ++i)
    {
        const current = exported[i];
        str += `ESM["${id}"]["${current.namedExport}"] = ${current.namedExport};${EOL}`;
    }
    return str;
};

const mergeCode = (codes) =>
{
    let newCode = [`
        // ====================================================================
        // Bundled with to-esm
        // --------------------------------------------------------------------
        
        const ESM = {};${EOL}    
    `];
    const n = codes.length;
    for (let i = 0; i < n; ++i)
    {
        let {content, entry} = codes[i];
        const exportTable = buildExport(entry);

        content = normaliseString(content);
        content = stripComments(content);

        content = `
        
        // ====================================================================
        // ${entry.target}$
        // --------------------------------------------------------------------
        
(function ()
{
    ESM["${entry.id}"] = {};

    ${content}
    
    ${exportTable}
        
}());
    ${EOL}${EOL}${EOL}    
        `;

        content = content.replace(/export\s+(const|let|var|function)/gm, "$1");
        content = content.replace(/export\s+default/gm, `ESM["${entry.id}"].default = `);

        content = beforeReplace(/import.*?from\s*(["']([^"']+)["'])/gi, content, function (found, wholeText, index, match)
        {
            let requiredPath = concatenatePaths(entry.target, match[2]);
            const item = findEntry(requiredPath, "target");
            if (item)
            {
                found = found.replace("import", "let");
                found = found.replace("from", "=");

                found = found.replace(match[1], `ESM["${item.id}"]`);
                if (found.indexOf("{") === -1)
                {
                    found = found + ".default";
                }

                found = found + ";";
            }

            // console.log(match[1]);
            // console.log(entry);
            // console.log(found, match, index);
            return found;
        });

        newCode.push(content);
    }

    newCode = newCode.join(EOL);
    return newCode;
};


/**
 * Bundle generated ESM code into o minified bundle
 * @param cjsList
 * @param target
 * @param bundlePath
 */
const bundleResult = (cjsList, {target = TARGET.BROWSER, bundlePath = "./"}) =>
{
    const {Readable} = require("stream");
    const code = {};
    let codes = [];

    reorderImportListByWeight(cjsList);

    if (target === TARGET.BROWSER || target === TARGET.ALL)
    {
        const minifyDir = path.parse(bundlePath).dir;
        buildTargetDir(minifyDir);

        const writeStream = fs.createWriteStream(bundlePath);

        cjsList.forEach(function (entry)
        {
            code[entry.target] = entry.converted;
            codes.push({
                entry,
                content: entry.converted
            });

        });

        let newCode = mergeCode(codes);

        newCode = beautify(newCode, {indent_size: 2, space_in_empty_paren: true});

        const options = {toplevel: true, mangle: false, compress: true, warnings: true};
        const result = UglifyJS.minify(newCode, options);
        newCode = normaliseString(result.code);

        const readable = Readable.from([newCode]);
        readable.pipe(writeStream);

        console.log(`${toEsmPackageJson.name}: (1312) `);
        console.log(`${toEsmPackageJson.name}: (1314) ================================================================`);
        console.log(`${toEsmPackageJson.name}: (1316) Bundle generated`);
        console.log(`${toEsmPackageJson.name}: (1318) ----------------------------------------------------------------`);
        console.log(`${toEsmPackageJson.name}: (1320) The bundle has been generated. Use`);
        console.log(`${toEsmPackageJson.name}: (1322) require("./node_modules/${bundlePath}")`);
        console.log(`${toEsmPackageJson.name}: (1324) or`);
        console.log(`${toEsmPackageJson.name}: (1326) <script type="module" src="./node_modules/${bundlePath}"></script>`);
        console.log(`${toEsmPackageJson.name}: (1328) from your html code to load it in the browser.`);
    }

};

/**
 * Convert cjs file into esm
 * @param {string[]} list File list to convert
 * @param {string} outputDir Target directory to put converted file
 * @param {boolean} noheader Whether to add extra info on top of converted file
 */
const convertCjsFiles = (list, {
    replaceStart = [],
    replaceEnd = [],
    nonHybridModuleMap = {},
    workingDir,
    noheader = false,
    withreport = false,
    importMaps = {},
    followlinked = true,
    moreOptions = {}
} = {}) =>
{
    let report;
    report = withreport ? {} : true;

    if (!list || !list.length)
    {
        console.info(`${toEsmPackageJson.name} (1010): No file to convert.`);
        return false;
    }

    for (let dynamicIndex = 0; dynamicIndex < list.length; ++dynamicIndex)
    {
        try
        {
            let {source, outputDir, rootDir, notOnDisk} = list[dynamicIndex];

            console.log(`${toEsmPackageJson.name}: (1130) ================================================================`);
            console.log(`${toEsmPackageJson.name}: (1132) Processing: ${source}`);
            console.log(`${toEsmPackageJson.name}: (1134) ----------------------------------------------------------------`);

            let converted = fs.readFileSync(source, "utf-8");

            converted = applyDirectives(converted, moreOptions);

            converted = applyReplaceFromConfig(converted, replaceStart);

            if (isCjsCompatible(source, converted))
            {
                let result, success;
                result = convertRequiresToImportsWithAST(converted, list,
                    {
                        source,
                        outputDir,
                        rootDir,
                        importMaps,
                        nonHybridModuleMap,
                        workingDir,
                        followlinked,
                        moreOptions
                    });

                converted = result.converted;
                success = result.success;

                list[dynamicIndex].exported = result.detectedExported;

                if (success)
                {
                    converted = convertNonTrivialExportsWithAST(converted, result.detectedExported);
                    converted = convertModuleExportsToExport(converted);
                }
                else
                {
                    // Apply fallback in case of conversion error
                    console.error(`${toEsmPackageJson.name}: (1207) Applying fallback process to convert [${source}]. The conversion may result in errors.`);
                    converted = convertToESMWithRegex(converted,
                        list,
                        {
                            source,
                            outputDir,
                            rootDir,
                            importMaps,
                            nonHybridModuleMap,
                            workingDir,
                            followlinked
                        });
                }
            }

            converted = restoreText(converted);

            converted = insertHeader(converted, source, {noHeader: noheader});

            converted = applyReplaceFromConfig(converted, replaceEnd);
            converted = normaliseString(converted);

            // ******************************************
            const targetFile = path.basename(source, path.extname(source));

            let destinationDir;
            if (outputDir)
            {
                const fileDir = path.join(path.dirname(source));
                const relativeDir = path.relative(rootDir, fileDir);
                destinationDir = path.join(outputDir, relativeDir);

                if (!notOnDisk)
                {
                    buildTargetDir(destinationDir);
                }
            }
            else
            {
                destinationDir = path.join(path.dirname(source));
            }

            const targetFilepath = path.join(destinationDir, targetFile + ESM_EXTENSION);

            const parsingResult = parseEsm(source, converted);
            let reportSuccess = parsingResult.success ? "✔ SUCCESS" : "✔ CONVERTED (with fallback)";

            if (!parsingResult.success)
            {
                let e = parsingResult.error;
                // console.error(`${toEsmPackageJson.name}: (1173) ❌ FAULTY: ESM: Parsing failed on [${filepath}]`,
                // parsingResult.error.message); Failed even with fallback
                console.error(`${toEsmPackageJson.name}: (1054) ❌ FAILED: ESM: Conversion may have failed even with fallback processing on` +
                    ` [${targetFilepath}] ------- LINE:${e.lineNumber} COLUMN:${e.column}`, e.message);
                reportSuccess = "❌ FAILED";
                console.log(`${toEsmPackageJson.name}: (1075) Note that the file is still generated to allow error checking and manual updates.`);
            }

            if (!withreport)
            {
                report = false;
            }

            console.log(`${toEsmPackageJson.name}: (1060) ${reportSuccess}: Converted [${source}] to [${targetFilepath}]`);

            list[dynamicIndex].converted = converted;

            if (!notOnDisk)
            {
                fs.writeFileSync(targetFilepath, converted, "utf-8");
            }

            if (withreport)
            {
                report[source] = converted;
            }

            console.log(`${toEsmPackageJson.name}: (1150) `);

        }
        catch (e)
        {
            console.error(`${toEsmPackageJson.name}: (1011)`, e.message);
            if (!withreport)
            {
                report = false;
            }
        }

    }

    return report;
};

/**
 * Use command line arguments to apply conversion
 * @param rawCliOptions
 */
const convert = async (rawCliOptions = {}) =>
{
    const workingDir = normalisePath(process.cwd(), {isFolder: true});

    console.log(`${toEsmPackageJson.name}: (1400) Current working directory: ${workingDir}`);

    resetFileList();

    const cliOptions = {};
    Object.keys(rawCliOptions).forEach((key) =>
    {
        cliOptions[key.toLowerCase()] = rawCliOptions[key];
    });

    let confFileOptions = {replace: []};

    // Config Files
    let configPath = cliOptions.config;
    let nonHybridModuleMap = {};
    if (configPath)
    {
        confFileOptions = await getOptionsConfigFile(configPath);

        // Convert search replacement strings to regex
        confFileOptions.replaceStart = regexifySearchList(confFileOptions.replaceStart);
        confFileOptions.replaceEnd = regexifySearchList(confFileOptions.replaceEnd);

        // Install special npm modules based on config
        nonHybridModuleMap = await installNonHybridModules(confFileOptions);
    }

    // Input Files
    let inputFileMaskArr = [];
    if (rawCliOptions._ && rawCliOptions._.length)
    {
        inputFileMaskArr.push(...rawCliOptions._);
    }

    if (cliOptions.input)
    {
        if (Array.isArray(cliOptions.input))
        {
            inputFileMaskArr.push(...cliOptions.input);
        }
        else
        {
            inputFileMaskArr.push(cliOptions.input);
        }
    }

    // Output Files
    cliOptions.output = cliOptions.output || "./";
    const outputDirArr = Array.isArray(cliOptions.output) ? cliOptions.output : [cliOptions.output];

    const firstOutputDir = outputDirArr[0];

    for (let i = 0; i < inputFileMaskArr.length; ++i)
    {
        const inputFileMask = inputFileMaskArr[i];
        const outputDir = outputDirArr[i];

        if (outputDir)
        {
            buildTargetDir(outputDir);
        }

        const list = glob.sync(inputFileMask, {
            dot  : true,
            nodir: true
        });

        /* istanbul ignore next */
        if (!list.length)
        {
            console.error(`${toEsmPackageJson.name}: (1151) The pattern did not match any file.`);
            return;
        }

        let rootDir;
        if (list && list.length > 1)
        {
            rootDir = commonDir(workingDir, list);
        }
        else
        {
            rootDir = path.join(workingDir, path.dirname(list[0]));
        }

        list.forEach((source) =>
        {
            addFileToConvertingList({source, rootDir, outputDir, workingDir});
        });

    }

    // Note: The multi directory options may complicate things. Consider making it obsolete.
    let entryPoint;
    if (cliOptions.entrypoint)
    {
        const entrypointPath = normalisePath(cliOptions.entrypoint);
        let rootDir = path.parse(entrypointPath).dir;
        rootDir = path.resolve(rootDir);
        entryPoint = addFileToConvertingList({
            source    : entrypointPath,
            rootDir,
            outputDir : firstOutputDir,
            workingDir,
            entryPoint: true
        });
    }

    // No header
    const noheader = !!cliOptions.noheader;
    const withreport = !!cliOptions.withreport;
    const fallback = !!cliOptions.fallback;

    let followlinked = !cliOptions.ignorelinked;

    const importMaps = {};

    let htmlOptions = confFileOptions.html || {};

    let html = cliOptions.html;
    if (html)
    {
        htmlOptions.pattern = html;
    }

    const moreOptions = {
        useImportMaps: !!htmlOptions.pattern,
        target       : cliOptions.target
    };

    const result = convertCjsFiles(cjsList,
        {
            replaceStart: confFileOptions.replaceStart,
            replaceEnd  : confFileOptions.replaceEnd,
            nonHybridModuleMap,
            noheader,
            followlinked,
            withreport,
            importMaps,
            workingDir,
            fallback,
            moreOptions
        });

    if (cliOptions.bundle)
    {
        bundleResult(cjsList, {target: cliOptions.target, bundlePath: cliOptions.bundle});
    }

    if (cliOptions["update-all"])
    {
        updatePackageJson({entryPoint, bundlePath: cliOptions.bundle, workingDir});
    }

    if (!htmlOptions.pattern)
    {
        return result;
    }

    if (!Object.keys(importMaps).length)
    {
        console.info(`${toEsmPackageJson.name}: (1202) No importmap entry found.`);
        return result;
    }

    const htmlList = glob.sync(htmlOptions.pattern,
        {
            root : workingDir,
            nodir: true
        });

    updateHTMLFiles(htmlList, {importMaps, moreOptions, confFileOptions, htmlOptions});

};

module.exports.COMMENT_MASK = COMMENT_MASK;
module.exports.buildTargetDir = buildTargetDir;
module.exports.convertNonTrivial = convertNonTrivial;
module.exports.reviewEsmImports = reviewEsmImports;
module.exports.parseImportWithRegex = parseImportWithRegex;
module.exports.applyReplace = applyReplaceFromConfig;
module.exports.stripComments = stripCodeComments;
module.exports.convertModuleExportsToExport = convertModuleExportsToExport;
module.exports.convertRequireToImport = convertRequiresToImport;
module.exports.validateSyntax = validateSyntax;
module.exports.convertRequireToImportWithAST = convertRequiresToImportsWithAST;
module.exports.putBackComments = putBackComments;
module.exports.convertListFiles = convertCjsFiles;
module.exports.convertToESMWithRegex = convertToESMWithRegex;
module.exports.getOptionsConfigFile = getOptionsConfigFile;
module.exports.parseReplace = regexifySearchList;
module.exports.getLibraryInfo = getLibraryInfo;
module.exports.installPackage = installPackage;
module.exports.parseReplaceModules = installNonHybridModules;
module.exports.normalisePath = normalisePath;
module.exports.convert = convert;
module.exports.isConventionalFolder = isConventionalFolder;
module.exports.concatenatePaths = concatenatePaths;
module.exports.convertToSubRootDir = convertToSubRootDir;
module.exports.subtractPath = subtractPath;
module.exports.getTranslatedPath = getTranslatedPath;
module.exports.getProjectedPathAll = getProjectedPathAll;
module.exports.calculateRequiredPath = calculateRequiredPath;
module.exports.putBackComments = putBackComments;
module.exports.regexifySearchList = regexifySearchList;
module.exports.getImportMapFromPage = getImportMapFromPage;
module.exports.resetFileList = resetFileList;
