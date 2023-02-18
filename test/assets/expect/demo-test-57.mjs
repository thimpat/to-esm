import {
    AnyClass
}  from "anylib";
import {
        AnyClass
    }  from "anylib";


/**
 *
 * @returns {boolean}
 */
export const ff001  = function ()
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
    

    return add10() * 20;
}


const add10 = ff001;
