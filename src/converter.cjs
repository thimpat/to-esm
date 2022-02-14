/**
 * This file is to convert a Commonjs file into an ESM library
 * by just replacing module.exports to export default.
 * It's for very simple library, but will allow me to avoid using a bundler.
 *
 * CONVENTION: All folders must finish with a "/"
 *
 */
const packageJson = require("../package.json");
const path = require("path");
const fs = require("fs");
const glob = require("glob");
const commonDir = require("commondir");

const extractComments = require("extract-comments");
const espree = require("espree");
const estraverse = require("estraverse");

const ESM_EXTENSION = ".mjs";

const COMMENT_MASK = "❖✎🔏❉";

const nativeModules = Object.keys(process.binding("natives"));

// The whole list of files to convert
const cjsList = [];

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
        console.error(`${packageJson.name}: (1001)`, e.message);
    }

    /* istanbul ignore next */
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
 * Retrieve module entrypoint
 * @param modulePath
 * @returns {ParsedPath|null}
 */
const findPackageEntryPoint = (modulePath) =>
{
    let entryPoint;
    try
    {
        entryPoint = require.resolve(modulePath);
        return path.parse(entryPoint);
    }
    catch (e)
    {
        console.info(`${packageJson.name}: (1140) Checking [${modulePath}] package.json`);
    }

    try
    {
        const externalPackageJsonPath = path.join(modulePath, "package.json");
        if (!fs.existsSync(externalPackageJsonPath))
        {
            return null;
        }

        const externalRawPackageJson = fs.readFileSync(externalPackageJsonPath, "utf-8");
        const externalPackageJson = JSON.parse(externalRawPackageJson);

        const exports = externalPackageJson.exports;
        if (typeof exports === "string" || exports instanceof String)
        {
            entryPoint = path.join(modulePath, exports);
            entryPoint = normalisePath(entryPoint);
            return path.parse(entryPoint);
        }

        const arr = Object.values(exports);
        for (let i = 0; i < arr.length; ++i)
        {
            const entry = arr[i];
            if (!entry.import)
            {
                continue;
            }
            const imports = entry.import;
            entryPoint = path.join(modulePath, imports);
            entryPoint = normalisePath(entryPoint);
            return path.parse(entryPoint);
        }
    }
    catch (e)
    {

    }
    return null;
};

/**
 * Returns path information related to a Node module
 * @param moduleName
 * @returns {*}
 */
const getNodeModuleProperties = (moduleName) =>
{
    let modulePath;

    try
    {
        modulePath = path.join("node_modules", moduleName);
        if (!fs.existsSync(modulePath))
        {
            console.info(`${packageJson.name}: (1100) Failed to locate module [${moduleName}]. Skipped.`);
            return null;
        }

        const entryPointInfo = findPackageEntryPoint(modulePath);

        if (!entryPointInfo)
        {
            console.info(`${packageJson.name}: (1145) Failed to locate module [${moduleName}]. Skipped.`);
            return null;
        }

        return entryPointInfo;
    }
    catch (e)
    {
        console.info(`${packageJson.name}: (1002) Failed to locate module [${moduleName}]. Skipped.`);
    }

    return null;
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
 * @param source
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
    try
    {
        source = normalisePath(source);
        const sourceDir = isConventionalFolder(source) ? source : path.parse(source).dir;
        let importPath = path.join(sourceDir, requiredPath);
        return normalisePath(importPath);
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1125)`, e.message);
    }
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

const getModuleEntryPointPath = (moduleName, outputDir) =>
{
    const module = getNodeModuleProperties(moduleName);

    if (!module)
    {
        return null;
    }

    // current file's absolute path
    // const sourcePath = path.resolve(outputDir);

    const modulePath = path.join(module.dir, module.base);
    return normalisePath(modulePath);

    // // The node_modules directory package
    // let relativeNodeModulesDir = path.relative(sourcePath, module.dir);
    //
    // // We add .. to point to the node_modules parent
    // // let relativePath = path.join("../..", relativeNodeModulesDir, module.base);
    // let relativePath = path.join(relativeNodeModulesDir, module.base);
    //
    // relativePath = relativePath.replace(/\\/g, "/");
    // return relativePath;
};

// ---------------------------------------------------
// NEW STUFF
// ---------------------------------------------------

/**
 *
 * @param somePath
 * @returns {string}
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
    // if (wholePath.indexOf(workingDir) > -1)
    // {
    //     substractPath(wholePath, workingDir);
    // }
    const arr = wholePath.split("/");
    arr.shift();
    return arr.join("/");
};

/**
 * Remove part of path by substracting a given directory from a whole path
 * @param wholePath File Path
 * @param pathToSubstract Subdirectory to remove from path
 * @returns {*}
 */
const substractPath = (wholePath, pathToSubstract) =>
{
    let subPath, subDir;
    // Get mapped path by substracting rootDir
    wholePath = wholePath.replace(/\\/gm, "/");
    pathToSubstract = pathToSubstract.replace(/\\/gm, "/");

    if (wholePath.length < pathToSubstract.length)
    {
        console.error(`${packageJson.name}: (1123)` + "Path substraction will not work here. " +
            "The substracting path bigger than the whole path");
        return {
            subPath: wholePath
        };
    }

    if (pathToSubstract === "./")
    {
        subPath = convertToSubRootDir(wholePath);
        subDir = path.parse(subPath).dir;
        subDir = normalisePath(subDir, {isFolder: true});

        return {
            subDir, subPath
        };
    }
    else if (wholePath.indexOf(pathToSubstract) === -1)
    {
        console.error(`${packageJson.name}: (1125)` + "Path substraction will not work here. " +
            "The substracting path is not part of the whole path");
        return {
            subPath: wholePath
        };
    }

    if (pathToSubstract.charAt(pathToSubstract.length - 1) !== "/")
    {
        pathToSubstract = pathToSubstract + "/";
    }

    let subPaths = wholePath.split(pathToSubstract);
    subPath = subPaths[1];
    subPath = normalisePath(subPath);

    subDir = path.parse(subPath).dir;
    subDir = normalisePath(subDir);

    return {
        subDir, subPath
    };
};

const getTranslatedPath = (requiredPath, list) =>
{
    try
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
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1127)`, e.message);
    }
    return {};
};

const getProjectedPathAll = ({source, rootDir, outputDir}) =>
{
    try
    {
        const sourcePath = path.resolve(source);
        rootDir = path.resolve(rootDir);

        // Get mapped path by substracting rootDir
        let {subPath, subDir} = substractPath(sourcePath, rootDir);

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
        console.error(`${packageJson.name}: (1120)`, e.message);
    }

};

const changeExtensionToESM = (filepath) =>
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
 * @param workingDir
 * @param outputDir
 * @returns {string}
 */
const calculateRequiredPath = ({sourcePath, requiredPath, list, followlinked, workingDir, outputDir}) =>
{
    try
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
                addFileToConverting({
                    source : requiredPath,
                    rootDir: workingDir,
                    outputDir,
                    workingDir,
                    followlinked
                });
                const newPath = concatenatePaths(outputDir, requiredPath);
                projectedRequiredPath = calculateRelativePath(sourcePath, newPath);
                projectedRequiredPath = changeExtensionToESM(projectedRequiredPath);
            }
            else
            {
                projectedRequiredPath = calculateRelativePath(sourcePath, requiredPath);
            }
        }

        return projectedRequiredPath;
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1151)`, e.message);
    }
};

/**
 * Parse imported libraries (the ones that don't have a relative or absolute path)
 * @param text
 * @param list
 * @param fileProp
 * @returns {*}
 */
const reviewExternalImport = (text, list, {
    source,
    rootDir,
    outputDir,
    importMaps,
    nonHybridModuleMap,
    workingDir,
    followlinked
}) =>
{
    // Locate third party
    // const re = /\bfrom\s+["']([^.\/~@][^"']+)["'];?/gmu;
    const re = /\bfrom\s+["']([^"']+?)["'];?/gmu;

    return text.replace(re, function (match, regexRequiredPath)
    {
        try
        {
            if (/require\s*\(/.test(regexRequiredPath))
            {
                return match;
            }

            if (~nativeModules.indexOf(regexRequiredPath))
            {
                console.info(`${packageJson.name}: (1017) ${regexRequiredPath} is a built-in NodeJs module.`);
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

                const requiredPath = getModuleEntryPointPath(moduleName, outputDir);

                if (requiredPath === null)
                {
                    console.warn(`${packageJson.name}: (1099) The module [${moduleName}] was not found in your node_modules directory. `
                        + "It won't be part of the importmaps.");
                    return match;
                }

                // Source path of projected original source (the .cjs)
                let {projectedPath} = getProjectedPathAll({source, rootDir, outputDir});

                let projectedRequiredPath = calculateRequiredPath(
                    {sourcePath: projectedPath, requiredPath, list,
                        followlinked, workingDir, outputDir});

                importMaps[moduleName] = requiredPath;

                // return match.replace(moduleName, relativePath);
                return match.replace(regexRequiredPath, projectedRequiredPath);
            }

            if (regexRequiredPath.startsWith("./") || regexRequiredPath.startsWith("..") || translated)
            {
                // Source path of projected original source (the .cjs)
                let {projectedPath} = getProjectedPathAll({source, rootDir, outputDir});

                // The required path from the source path above
                let requiredPath = concatenatePaths(source, regexRequiredPath);

                let projectedRequiredPath = calculateRequiredPath(
                    {sourcePath: projectedPath, requiredPath, outputDir,
                        list, followlinked, workingDir});

                return match.replace(regexRequiredPath, projectedRequiredPath);
            }

            return match;
        }
        catch (e)
        {
            console.error(`${packageJson.name}: (1108)`, e.message);
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

/**
 * Apply replacements from user config file or modules parsing
 * @param converted
 * @param replace
 * @returns {*}
 */
const applyReplace = (converted, replace) =>
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

const convertModuleExportsToExport = (converted) =>
{
    // Convert module.exports to export default
    converted = converted.replace(/(?:module\.)?exports\s*=/gm, "export default");

    // Convert module.exports.something to export something
    converted = converted.replace(/(?:module\.)?exports\./gm, "export const ");

    return converted;
};

/**
 * Use regex to do the transformation into imports.
 * @note This function is used with both parser (AST or Regex)
 * @param converted
 * @returns {*}
 */
const convertRequireToImport = (converted) =>
{
    converted = stripComments(converted);

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
 * Covert require and move imports to the top
 * @param converted
 * @param extracted
 * @param list
 * @param source
 * @param outputDir
 * @param rootDir
 * @param importMaps
 * @returns {string|*}
 */
const applyRequireToImportTransformationsForAST = (converted, extracted, list, {source, outputDir, rootDir, importMaps}) =>
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

                let transformedLines = stripComments(prop.text);
                transformedLines = convertRequireToImport(transformedLines);

                const valid = validateSyntax(transformedLines, "module");
                if (!valid)
                {
                    continue;
                }

                transformedLines = reviewExternalImport(transformedLines, list,
                    {source, outputDir, rootDir, importMaps});

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
                console.error(`${packageJson.name}: (1006)`, e.message);
            }
        }

        const EOL = require("os").EOL;
        converted = importList.reverse().join(EOL) + converted;
    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1007)`, e.message);
    }

    return converted;
};

const convertRequireToImportWithAST = (converted, list, {source, outputDir, rootDir, importMaps}) =>
{
    let success = true;
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
            console.warn(`${packageJson.name}: (1052) ------- CJS: Syntax issues found on [${source}]`);
            console.info("                  ➔ ➔ ➔ ➔ ➔ ➔ ", e.message);
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

                    previouses.push({
                        parent,
                        node
                    });
                }
                catch (e)
                {
                    console.error(`${packageJson.name}: (1008)`, e.message);
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
                    console.error(`${packageJson.name}: (1057)`, e.message);
                }
            }
        });

        converted = applyRequireToImportTransformationsForAST(converted, extracted, list, {source, outputDir, rootDir, importMaps});
        converted = removeDeclarationForAST(converted, extracted);
    }
    catch (e)
    {
        success = false;
        console.error(`${packageJson.name}: (1009) [${source}] ->`, e.message);
        console.info(`${packageJson.name}: (1056) The parsing failed on [${source}]. ` +
            "Conversion mode falling back to --extended.");
    }

    return {converted, success};
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
 * Convert cjs file into esm
 * @param {string[]} list File list to convert
 * @param {string} outputDir Target directory to put converted file
 * @param {boolean} noheader Whether to add extra info on top of converted file
 */
const convertCjsFiles = (list, {
    replaceStart = [],
    replaceEnd = [],
    replaceDetectedModules = [],
    noheader = false,
    solvedep = false,
    extended = false,
    comments = false,
    withreport = false,
    importMaps = {}
} = {}) =>
{
    let report;
    report = withreport ? {} : true;

    if (!list || !list.length)
    {
        console.info(`${packageJson.name} (1010): No file to convert.`);
        return false;
    }

    const parserOtions = {
        range        : false,
        loc          : false,
        comment      : false,
        tokens       : false,
        ecmaVersion  : "latest",
        allowReserved: false,
        sourceType   : "commonjs",
        ecmaFeatures : {
            jsx          : false,
            globalReturn : false,
            impliedStrict: false
        }
    };

    list.forEach(({source, outputDir, rootDir}) =>
    {
        try
        {
            let converted = fs.readFileSync(source, "utf-8");

            converted = applyReplace(converted, replaceStart);

            const result = convertRequireToImportWithAST(converted, list, {source, outputDir, rootDir, importMaps});
            converted = result.converted;

            converted = applyReplace(converted, replaceDetectedModules);

            converted = convertModuleExportsToExport(converted);

            if (extended || !result.success || comments)
            {
                converted = replaceWithRegex(converted, list, {source, outputDir, rootDir, importMaps, solvedep, comments});
            }

            if (!noheader)
            {
                converted = `/**
 * DO NOT EDIT THIS FILE DIRECTLY.
 * This file is generated following the conversion of 
 * [${source}]
 * 
 **/    
` + converted;
            }

            converted = applyReplace(converted, replaceEnd);

            const targetFile = path.basename(source, path.extname(source));

            let destinationDir;
            if (outputDir)
            {
                const fileDir = path.join(path.dirname(source));
                const relativeDir = path.relative(rootDir, fileDir);
                destinationDir = path.join(outputDir, relativeDir);

                buildTargetDir(destinationDir);
            }
            else
            {
                destinationDir = path.join(path.dirname(source));
            }

            const targetFilepath = path.join(destinationDir, targetFile + ESM_EXTENSION);

            let reportSuccess = result.success ? "✔ SUCCESS" : "✔ SUCCESS (with fallback)";
            try
            {
                parserOtions.sourceType = "module";
                espree.parse(converted, parserOtions);
            }
            catch (e)
            {
                // Failed even with fallback
                console.error(`${packageJson.name}: (1054) FAULTY: ESM: Conversion may have failed even with fallback processing on` +
                    ` [${targetFilepath}] ------- LINE:${e.lineNumber} COLUMN:${e.column}`, e.message);
                reportSuccess = "❌ FAULTY";
                console.log(`${packageJson.name}: (1075) Note that the file is still generated to allow checking the error.`);
                result.success = false;
                if (!withreport)
                {
                    report = false;
                }
            }

            console.log(`${packageJson.name}: (1060) ${reportSuccess}: Converted [${source}] to [${targetFilepath}]`);
            fs.writeFileSync(targetFilepath, converted, "utf-8");
            if (withreport)
            {
                report[source] = converted;
            }
        }
        catch (e)
        {
            console.error(`${packageJson.name}: (1011)`, e.message);
            if (!withreport)
            {
                report = false;
            }
        }
    });

    return report;
};



const parseHTMLFiles = (htmlPath, {importMaps = {}})=>
{
    htmlPath = path.resolve(htmlPath);
    if (!fs.existsSync(htmlPath))
    {
        console.error(`${packageJson.name}: (1080) Could not find HTML file at [${htmlPath}]`);
        return;
    }

    const content = fs.readFileSync(htmlPath, "utf-8");
    const regex = /\<script.+importmap.+\>([\s\S]+?)\<\/script>/gm;
    // const found = content.match(regex);
    // if (!found)
    // {
    //
    // }
    // else
    // {
    //     console.log( );
    // }

    let jsonImportMap = {};
    let match;
    while(match = regex.exec(content))
    {
        console.log(match);
        if (match.length > 1)
        {
            let rawImportMap = match[1].trim();
            try
            {
                jsonImportMap = JSON.parse(rawImportMap);
            }
            catch (e)
            {
                console.error(`${packageJson.name}: (1090)`, e.message);
            }
        }
    }
};

const convertHTMLFiles = (list, {importMaps = {}}) =>
    {
        list.forEach((html)=>
        {
            console.log(html);
            parseHTMLFiles(html, {importMaps});
        });
    };

const replaceWithRegex = (converted, list, {source, outputDir, rootDir, importMaps, solvedep, comments} = {}) =>
{
    const workingDir = process.cwd();

    try
    {
        const extractedComments = [];

        if (!comments)
        {
            converted = stripComments(converted, extractedComments);
        }

        converted = parseImportWithRegex(converted, list, {source, outputDir, rootDir}, workingDir);

        converted = convertNonTrivial(converted);

        converted = convertModuleExportsToExport(converted);

        converted = convertRequireToImport(converted);

        if (solvedep)
        {
            converted = reviewExternalImport(converted, list, {source, outputDir, rootDir , importMaps});
        }

        converted = putBackComments(converted, extractedComments);


    }
    catch (e)
    {
        console.error(`${packageJson.name}: (1012)`, e.message);
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
                console.error(`${packageJson.name}: (1013)`, e.message);
                console.info("Skipping config file options");
            }
        }
    }

    return confFileOptions;
};

const parseReplace = (replace = []) =>
{
    replace.forEach((item) =>
    {
        if (item.search instanceof RegExp)
        {
            item.regex = true;
        }
        else if (item.regex)
        {
            item.replace = new RegExp(item.replace);
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

        console.info(`${packageJson.name}: Installing (${environment}) package [${moduleName}${version}] as [${name}]`);
        child_process.execSync(`npm install ${name}@npm:${moduleName}${version} ${devOption}`, {stdio: []});
        console.info(`${packageJson.name}: ✔ Success`);
    };

/**
 * Install two modules versions for each specified package
 * @param config
 * @param packageJsonPath
 * @returns {Promise<void>}
 */
const parseReplaceModules = async (config = [], packageJsonPath = "./package.json") =>
{
    const replaceModules = config.replaceModules || [];
    const replaceStart = [];

    packageJsonPath = path.resolve(packageJsonPath);
    if (!fs.existsSync(packageJsonPath))
    {
        console.error(`${packageJson.name}: (1014) Could not locate package Json. To use the replaceModules options, you must run this process from your root module directory.`);
        return;
    }

    const packageJson = require(packageJsonPath);
    const moduleList = Object.keys(replaceModules);

    for (const moduleName of moduleList)
    {
        try
        {
            const moduleItem = replaceModules[moduleName];

            moduleItem.cjs = moduleItem.cjs || {};
            moduleItem.esm = moduleItem.esm || {};

            let version = moduleItem.cjs.version || "@latest";
            let name = moduleItem.cjs.name || moduleName;
            let isDevDependencies = !!moduleItem.cjs.devDependencies;

            installPackage({version, name, isDevDependencies, moduleName, isCjs: true, packageJson});

            const addReplaceStart = {
                search: new RegExp(`(?:const|let|var)\\s+([^=]+)\\s*=\\s*require\\(["'\`](${name})["'\`]\\)`),
            };

            version = moduleItem.esm.version || "@latest";
            name = moduleItem.esm.name || moduleName;
            isDevDependencies = !!moduleItem.esm.devDependencies;

            installPackage({version, name, isDevDependencies, moduleName, isCjs: false, packageJson});

            addReplaceStart.replace = `import $1 from "${name}"`;
            addReplaceStart.regex = true;

            replaceStart.push(addReplaceStart);
        }
        catch (e)
        {
            console.error(`${packageJson.name}: (1015)`, e.message);
        }

        config.replaceDetectedModules = replaceStart;
    }

};

/**
 * Use command line arguments to apply conversion
 * @param rawCliOptions
 */
const convert = async (rawCliOptions = {}) =>
{
    const cliOptions = {};
    Object.keys(rawCliOptions).forEach((key) =>
    {
        cliOptions[key.toLowerCase()] = rawCliOptions[key];
    });

    let confFileOptions = {replace: []};

    // Config Files
    let configPath = cliOptions.config;
    if (configPath)
    {
        confFileOptions = await getOptionsConfigFile(configPath);

        // Replacement
        confFileOptions.replaceStart = parseReplace(confFileOptions.replaceStart);
        confFileOptions.replaceEnd = parseReplace(confFileOptions.replaceEnd);

        // Module Install
        await parseReplaceModules(confFileOptions);
    }

    // Input Files
    let inputFileMaskArr = [];
    if (cliOptions.input)
    {
        inputFileMaskArr = Array.isArray(cliOptions.input) ? cliOptions.input : [cliOptions.input];
    }

    // Output Files
    const outputDirArr = Array.isArray(cliOptions.output) ? cliOptions.output : [cliOptions.output];

    const workingDir = process.cwd();

    const cjsList = [];
    for (let i = 0; i < inputFileMaskArr.length; ++i)
    {
        const inputFileMask = inputFileMaskArr[i];
        const outputDir = outputDirArr[i];

        if (outputDir)
        {
            buildTargetDir(outputDir);
        }

        const list = glob.sync(inputFileMask, {
            dot: true
        });

        const rootDir = list && list.length > 1 ? commonDir(workingDir, list) : path.join(workingDir, path.dirname(list[0]));

        list.forEach((item) =>
        {
            cjsList.push({
                source: item,
                outputDir,
                rootDir
            });
        });
    }

    // No header
    const noheader = !!cliOptions.noheader;
    const solvedep = !!cliOptions.solvedep;
    const extended = !!cliOptions.extended;
    const comments = !!cliOptions.comments;
    const withreport = !!cliOptions.withreport;

    const importMaps = {};

    const result = convertCjsFiles(cjsList,
        {
            replaceStart          : confFileOptions.replaceStart,
            replaceEnd            : confFileOptions.replaceEnd,
            replaceDetectedModules: confFileOptions.replaceDetectedModules,
            noheader,
            solvedep,
            extended,
            comments,
            withreport,
            importMaps
        });

    const html = cliOptions.html;
    const htmlList = glob.sync(html);

    convertHTMLFiles(htmlList, {importMaps});


};

module.exports.COMMENT_MASK = COMMENT_MASK;
module.exports.buildTargetDir = buildTargetDir;
module.exports.convertNonTrivial = convertNonTrivial;
module.exports.getNodeModuleProp = getNodeModuleProp;
module.exports.reviewExternalImport = reviewExternalImport;
module.exports.parseImport = parseImportWithRegex;
module.exports.applyReplace = applyReplace;
module.exports.stripComments = stripComments;
module.exports.convertModuleExportsToExport = convertModuleExportsToExport;
module.exports.convertRequireToImport = convertRequireToImport;
module.exports.validateSyntax = validateSyntax;
module.exports.applyTransformations = applyRequireToImportTransformationsForAST;
module.exports.convertRequireToImportWithAST = convertRequireToImportWithAST;
module.exports.putBackComments = putBackComments;
module.exports.convertListFiles = convertCjsFiles;
module.exports.replaceWithRegex = replaceWithRegex;
module.exports.getOptionsConfigFile = getOptionsConfigFile;
module.exports.parseReplace = parseReplace;
module.exports.getLibraryInfo = getLibraryInfo;
module.exports.installPackage = installPackage;
module.exports.parseReplaceModules = parseReplaceModules;

module.exports.convert = convert;
