import os  from "os";
import {getAppDataDir, joinPath, getPackageJson}  from "@thimpat/libutils";


const packjson = getPackageJson({projectName: "genserve"});



export const getAppShortName  = () =>
{
    return packjson.name;
};

export const getAppVersion  = () =>
{
    return packjson.version;
};

export const getAppName  = () =>
{
    return getAppShortName() + " " + getAppVersion();
};

/**
 * Returns OS data dir for the application
 * @returns {string}
 */
export const getApplicationDataDir  = () =>
{
    const appName = getAppShortName();
    return getAppDataDir(appName);
};

/**
 * Do not call directly. Call createAppTempDir instead
 * @param subDir
 * @returns {*}
 */
const getAppTempDir = (subDir = "") =>
{
    const tmpDir = os.tmpdir();
    const appName = getAppShortName();
    return joinPath(tmpDir, appName, subDir);
};

export const createAppTempDir  = (subDir = "") =>
{
    const tempDir = getAppTempDir(subDir);
    fs.mkdirSync(tempDir, {recursive: true, mode: "0777"});
    return tempDir;
};

/**
 * Returns filepath related to the application data directory
 * @param filepath
 * @returns {*}
 */
export const getAppFilePath  = (filepath) =>
{
    const appDataDir = getApplicationDataDir();
    return joinPath(appDataDir, filepath);
};

/**
 * Returns path to a critical folder
 * A critical folder is a directory that must exist for the application to work correctly
 * @param {string|CRITICAL_FOLDER_NAMES} [folderName = "]
 * @returns {string|boolean|*}
 */
export const getCriticalFolderRootDir  = (folderName = "") =>
{
    const appDataDir = getApplicationDataDir();
    if (!folderName)
    {
        return appDataDir;
    }
    return joinPath(appDataDir, folderName);
};










