import path  from "path";
import fs  from "fs";


const logError = (e, options) =>
{
    if (!options.silent)
    {
        console.error(e);
    }
};

const findNodeModules = (folder) =>
{
    let maxDepth = 200;
    do
    {
        --maxDepth;
        if (folder.indexOf("node_modules") === -1)
        {
            folder = path.join(folder, "node_modules");
        }

        if (fs.existsSync(folder))
        {
            return folder;
        }

        folder = path.join(folder, "../..");

    }while(folder !== path.resolve("/") && maxDepth > 0);
};

/**
 * Retrieve module entrypoint.
 * Note that it's best to use the native require.resolve(moduleName, modulePath).
 * This implementation is only there because of the path returned when a library
 * has been installed with npm link.
 * @param moduleName
 * @param modulePath Module name or path
 * @param silent
 * @param exception
 * @param isCjs
 * @param useNativeResolve
 * @example
 * findPackageEntryPoint("to-esm")                  // Name
 * findPackageEntryPoint("node_modules/to-esm")     // Path
 * @returns {string|null}
 */
export const findPackageEntryPoint  = (moduleName, modulePath = "", {
    silent = false,
    exception = false,
    isCjs = false,
    useNativeResolve = false
} = {}) =>
{
    let entryPoint;

    if (!moduleName)
    {
        logError("Invalid module name. Must be a path or a name", {silent, exception});
        return null;
    }

    try
    {
        if (useNativeResolve)
        {
            entryPoint = require.resolve(moduleName, modulePath);
            if (entryPoint.indexOf("node_modules") > -1)
            {
                return entryPoint;
            }
        }
    }
    catch (e)
    {
    }

    // const testModulePath = modulePath ? path.join(modulePath, moduleName) : path.join(findNodeModules(process.cwd()), moduleName);
    const testModulePath = modulePath ? path.join(findNodeModules(modulePath), moduleName) : path.join(findNodeModules(process.cwd()), moduleName);

    if (!fs.existsSync(testModulePath))
    {
        if (!modulePath)
        {
            return null;
        }

        modulePath = path.join(modulePath, "node_modules", moduleName);
        if (!fs.existsSync(modulePath))
        {
            return null;
        }
    }

    modulePath = testModulePath;

    try
    {
        const externalPackageJsonPath = path.join(modulePath, "package.json");
        if (!fs.existsSync(externalPackageJsonPath))
        {
            logError(`package.json not found in fallback directory search: ${externalPackageJsonPath}`, {silent, exception});
            return null;
        }

        const externalRawPackageJson = fs.readFileSync(externalPackageJsonPath, "utf-8");
        const externalPackageJson = JSON.parse(externalRawPackageJson);

        // Look for entry point in the package.json exports key
        let exports = externalPackageJson.exports;
        if (typeof exports === "string" || exports instanceof String)
        {
            entryPoint = path.join(modulePath, exports);
            return entryPoint;
        }

        // Look for entry point in the package.json exports sub key
        if (exports)
        {
            exports = exports["."] || exports["./"];
            const found = isCjs ? exports["require"] : exports["import"];
            if (found)
            {
                return path.join(modulePath, found);
            }
        }

        // Look for entry point in the main key
        let main = externalPackageJson.main;
        if (main)
        {
            return path.join(modulePath, main);
        }

        const entries = ["index.js", "index.json", "index.node"];
        for (let i = 0; i < entries.length; ++i)
        {
            const entry = entries[i];
            const indexJsPath = path.join(modulePath, entry);
            if (fs.existsSync(indexJsPath))
            {
                entryPoint = indexJsPath;
                return entryPoint;
            }
        }

        logError(`Could not locate [${moduleName}] entry point`, {silent, exception});
    }
    catch (e)
    {
        logError(e, {silent, exception});
    }

    if (exception)
    {
        throw new Error(`Could not locate [${moduleName}] entry point`);
    }

    return null;
};


export default {
    findPackageEntryPoint
};

