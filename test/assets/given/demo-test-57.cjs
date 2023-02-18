const {
    AnyClass
} = require('anylib');

/**
 *
 * @returns {boolean}
 */
const add10 = function ()
{
    try
    {

        return 10;
    }
    catch (e)
    {
        console.error({lid: 1235}, e.message);
    }

    return false;
};

const cc = () =>
{
    const {
        AnyClass
    } = require('anylib');

    return add10() * 20;
}

module.exports.ff001 = add10;
