const os =require("os");

const {getAppDataDir, joinPath, getPackageJson} = require("@thimpat/libutils");
const packjson = getPackageJson({projectName: "genserve"});

/** to-esm-all: remove **/
const fs = require("fs");
/** to-esm-all: end-remove **/

const getAppShortName = () =>
{
    return packjson.name;
};

const getAppVersion = () =>
{
    return packjson.version;
};

const getAppName = () =>
{
    return getAppShortName() + " " + getAppVersion();
};

/**
 * Returns OS data dir for the application
 * @returns {string}
 */
const getApplicationDataDir = () =>
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

const createAppTempDir = (subDir = "") =>
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
const getAppFilePath = (filepath) =>
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
const getCriticalFolderRootDir = (folderName = "") =>
{
    const appDataDir = getApplicationDataDir();
    if (!folderName)
    {
        return appDataDir;
    }
    return joinPath(appDataDir, folderName);
};

module.exports.getApplicationDataDir = getApplicationDataDir;
module.exports.getAppName = getAppName;
module.exports.getAppFilePath = getAppFilePath;

module.exports.getCriticalFolderRootDir = getCriticalFolderRootDir;
module.exports.createAppTempDir = createAppTempDir;

module.exports.getAppShortName = getAppShortName;
module.exports.getAppVersion = getAppVersion;
module.exports.getAppName = getAppName;
