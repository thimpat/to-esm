import fs  from "fs";
import Module  from "module";

export const hijackFs = () =>
{
    Module.prototype.require = new Proxy(Module.prototype.require, {
        apply(target, thisArg, argumentsList)
        {

            let name = argumentsList[0];

            if (/fs/g.test(name))
            {
                name = "memfs";
            }

            return Reflect.apply(target, thisArg, argumentsList);
        }
    });
};

export const takeScreenshot = async function takeScreenshot(driver, name)
{
    await driver.takeScreenshot().then((data) =>
    {
        fs.writeFileSync(name + ".png", data, "base64");
    });
};

export const isJson = (str) =>
{
    try
    {
        return !!JSON.parse(str);
    }
    catch (e)
    {

    }
    return false;
};

/**
 * Returns file content
 * @param filepath
 * @returns {string|any}
 */
export const getContent = (filepath) =>
{
    try
    {
        const str = fs.readFileSync(filepath, "utf-8");
        try
        {
            return JSON.parse(str);
        }
        catch (e)
        {

        }
        return str;
    }
    catch (e)
    {
        console.error(`E56446556231131: `, e);
    }
};

/**
 * When the cli returns a string like {"path: "/path/to/some/file"},
 * this function will extract the "/path/to/some/file" and return it.
 * @param stdout
 * @param key
 */
export const getPathStdout  = (stdout, key = "path") =>
{
    try
    {
        const json = JSON.parse(stdout);
        if (!json)
        {
            return null;
        }

        return json[key];
    }
    catch (e)
    {
        console.error(`E56446556231133: `, e);
    }

    return null;
};


/**
 * When the cli returns a string like this: {"path: "/path/to/some/file"},
 * this function will extract the "/path/to/some/file" value by converting the output into an object,
 * and returns the content.
 * @param stdout
 * @param key
 */
export const getJsonStdout  = (stdout, key = "path") =>
{
    try
    {
        const filepath = getPathStdout(stdout, key);
        if (!filepath)
        {
            return null;
        }

        const content = fs.readFileSync(filepath, "utf-8");
        const jsonContent = JSON.parse(content);
        if (!jsonContent)
        {
            return null;
        }

        return jsonContent;
    }
    catch (e)
    {
        console.error(`E56446556231133: `, e);
    }

    return null;
};

/**
 * Wait for the driver to be ready before starting the tests
 * @type {function(): Promise<unknown>}
 */
export const waitForDriverCaptured = (monitor) =>
{
    return new Promise((resolve) =>
    {
        setInterval(() =>
        {
            if (!monitor.driver)
            {
                return;
            }

            resolve(monitor.driver);
        }, 500);
    });
};

export const replaceTextInFile = (filepath, regex, replacement) =>
{
    const text = fs.readFileSync(filepath, "utf-8");
    const result = text.replace(regex, replacement);
    fs.writeFileSync(filepath, result, "utf-8",);
};

/**
 * Delay code execution for a number of milliseconds
 * @param {number} ms Number of milliseconds to delay the code
 * @returns {Promise<unknown>}
 */
export const sleep = function sleep(ms)
{
    return new Promise((resolve) =>
    {
        setTimeout(resolve, ms);
    });
};




