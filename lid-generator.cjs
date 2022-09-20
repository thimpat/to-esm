// ===========================================================================
// Imports
// ---------------------------------------------------------------------------
const {getFileContent, getGlobalArguments} = require("@thimpat/libutils");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

// ===========================================================================
// Constants
// ---------------------------------------------------------------------------
const insertLids = function (content, {logCounter = 1000, errorCounter = 3000, duplicates = {}} = {})
{
    try
    {
        logCounter = parseInt(logCounter);
        errorCounter = parseInt(errorCounter);

        // Add lids to console.log and console.error
        content = content.replace(/(console.\b(log|error)\b\s*\(\s*)(?!\{?lid)(.*)/g, "$1{lid: 1000}, $3");

        // Replace lids in console.log and console.error
        content = content.replace(/console.\b(log|error)\b\s*\(\s*\{.*?\b(lid:\s*)(\d+)/g, function (substring, logType, lidText, detectedLid)
        {
            let counter;

            if (duplicates[detectedLid] < 0)
            {
                return substring;
            }

            --duplicates[detectedLid];
            if (logType === "log")
            {
                counter = logCounter;
                logCounter += 2;
            }
            else
            {
                counter = errorCounter;
                errorCounter += 2;
            }

            return substring.replace(lidText + detectedLid, `lid: ${counter}`);
        });

        return {content, logCounter, errorCounter};
    }
    catch (e)
    {
        console.error({lid: 9000}, e.message);
    }

    return null;
};

function writeResults(filepath, content, {same} = {})
{
    try
    {
        if (same)
        {
            fs.writeFileSync(filepath, content, {encoding: "utf-8"});
        }
        else
        {
            // Write result to backup file
            const infoFile = path.parse(filepath);
            const modifiedFilepath = path.join(process.cwd(), infoFile.name + ".bak" + infoFile.ext);
            fs.writeFileSync(modifiedFilepath, content, {encoding: "utf-8"});

            console.log(`File generated to: ${modifiedFilepath}.`);
        }

        return true;
    }
    catch (e)
    {
        console.error({lid: 9002}, e.message);
    }

    return false;
}

/**
 * Modify lids in one file
 * @param filepath
 * @param logidstart
 * @param erroridstart
 * @param overwrite
 * @param duplicates
 * @returns {boolean|{errorCounter: number, logCounter: number}}
 */
const writeLidsToFile = function (filepath, {logidstart, erroridstart, overwrite = true, duplicates} = {})
{
    try
    {
        // -----------
        const content = getFileContent(filepath);
        if (!content)
        {
            return false;
        }

        // -----------
        let {content: modifiedContent, logCounter, errorCounter} = insertLids(content,
            {logCounter: logidstart, errorCounter: erroridstart, duplicates});

        if (modifiedContent === null)
        {
            return false;
        }

        // -----------
        writeResults(filepath, modifiedContent, {same: overwrite});

        console.log({lid: 9000}, `Successfully modified: ${filepath}`);

        return {logCounter, errorCounter};
    }
    catch (e)
    {
        console.error({lid: 9004}, e.message);
    }

    return false;
};

/**
 * Parse file list and gather all duplicated lids
 * @param fileList
 * @returns {null|*[]}
 */
const getAllDuplicateLids = function (fileList)
{
    let duplicatedLids = [];
    try
    {
        for (let i = 0; i < fileList.length; i++)
        {
            const filepath = fileList[i];
            let content = getFileContent(filepath);

            let matches = content.matchAll(/\blid:\s*(\d+)/g);
            for (let match of matches)
            {
                let lid = match[1];
                duplicatedLids.push(lid);
            }
        }

        duplicatedLids = duplicatedLids.sort();
        duplicatedLids = duplicatedLids.filter((e, i, a) => a.indexOf(e) !== i);

        const dupLids = {};
        duplicatedLids.forEach(function (lid)
        {
            dupLids[lid] = dupLids[lid] || 0;
            ++dupLids[lid];
        });

        return duplicatedLids;
    }
    catch (e)
    {
        console.error({lid: 9006}, e.message);
    }

    return null;
};

function writeLidsToList(fileList, {logidstart, erroridstart, overwrite})
{
    try
    {
        const duplicates = getAllDuplicateLids(fileList);

        for (let i = 0; i < fileList.length; i++)
        {
            const filepath = fileList[i];
            const {logCounter, errorCounter} = writeLidsToFile(filepath,
                {logidstart, erroridstart, overwrite, duplicates});
            logidstart = logCounter;
            erroridstart = errorCounter;
        }

        return true;
    }
    catch (e)
    {
        console.error({lid: 9008}, e.message);
    }

    return false;
}

function getFileList(dirpath)
{
    try
    {
        if (!dirpath)
        {
            return [];
        }

        let filepaths;
        if (fs.lstatSync(dirpath).isFile())
        {
            filepaths = [dirpath];
        }
        else if (fs.lstatSync(dirpath).isDirectory())
        {
            filepaths = glob.sync("**/*.*[c]js", {
                dot     : false,
                nodir   : true,
                cwd     : dirpath,
                ignore  : ["node_modules/**/*.*[cm]js"],
                realpath: true
            });
        }

        return filepaths;
    }
    catch (e)
    {
        console.error({lid: 9010}, e.message);
    }

    return [];
}

// ===========================================================================
// Initialisation
// ---------------------------------------------------------------------------
// ---
const init = async function ()
{
    try
    {
        // ------------------------------------
        // Get filepath to apply transformation
        // ------------------------------------
        const {filepaths, dir} = getGlobalArguments();

        // ------------------------------------
        // Get file list
        // ------------------------------------
        const fileList = getFileList(dir);

        // Combine all filepath
        fileList.push(...filepaths);
        if (!fileList.length)
        {
            console.error({lid: 9012}, `No sources found in [${filepath}]`);
            return false;
        }

        // ------------------------------------
        // Apply transformations
        // ------------------------------------
        const {overwrite, logidstart, erroridstart} = getGlobalArguments();
        writeLidsToList(fileList, {overwrite, logidstart, erroridstart});

        return true;
    }
    catch (e)
    {
        console.error({lid: 9014}, e.message);
    }

    return false;
};

(async function ()
{
    try
    {
        await init();
        return true;
    }
    catch (e)
    {
        console.error({lid: 9016}, e.message);
    }

    process.exit(1);

}());