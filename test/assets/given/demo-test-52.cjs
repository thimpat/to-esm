/**
 *
 * @param serverUrl
 * @param delay
 * @param {"firefox"|"google chrome"|""} browserName
 * @param args
 * @returns {Promise<boolean>}
 */
async function openUrl(serverUrl, {delay = 1000, browserName = "", args = []} = {})
{
    try
    {
        let options = {};

        if (browserName)
        {
            options.app = {name: browserName};
        }

        if (args && args.length)
        {
            options.arguments = args;
        }

        await open(serverUrl, options);
        await sleep(delay);

        return true;
    }
    catch (e)
    {
        console.error({lid: 3361}, e.message);
    }

    return false;
}


module.exports.openUrl = openUrl;