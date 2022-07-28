/**
 * Colorizer for terminals
 * @author Patrice Thimothee
 * @licence MIT
 */

// ----------------------------------------
// Types
// ----------------------------------------
/**
 * @typedef {Object} RGBType
 * @property {number} red
 * @property {number} green
 * @property {number} blue
 */

/**
 * @typedef {Object} HSLType
 * @property {number} hue
 * @property {number} lightness
 * @property {number} saturation
 */

/**
 * Return colorized text based on given value
 * @typedef {Object} ColorPropType
 * @property {string|RGBType|HSLType} [fg] colourName Actual name color (i.e. orange, yellow), color code (#00F00F), or
 * color object
 * (rgb, hsl)
 * @property {string|RGBType|HSLType} [bg] colourName Actual name color (i.e. orange, yellow) or color code (#00F00F)
 * @property {boolean|null} [isUnderline]
 * @property {boolean|null} [isBold]
 * @property {boolean|null} [isReversed]
 */

// ----------------------------------------
// Constants
// ----------------------------------------
const COLOR_TYPE = {
    Foreground: 38,
    Background: 48,
};

const backward = "\u001b[1D"
const RESET = "\x1b[0m" + backward;

const FONT_STYLE = {
    Bold     : "\x1b[1m" + backward,
    Underline: "\x1b[4m" + backward,
    Reversed : "\x1b[7m" + backward,
}

const STYLE = {
    Bold     : "\x1b[1m" + backward,
    Underline: "\x1b[4m" + backward,
    Reversed : "\x1b[7m" + backward,
}

const colors = {
    "aliceblue"           : "#f0f8ff",
    "antiquewhite"        : "#faebd7",
    "aqua"                : "#00ffff",
    "aquamarine"          : "#7fffd4",
    "azure"               : "#f0ffff",
    "beige"               : "#f5f5dc",
    "bisque"              : "#ffe4c4",
    "black"               : "#000000",
    "blanchedalmond"      : "#ffebcd",
    "blue"                : "#0000ff",
    "blueviolet"          : "#8a2be2",
    "brown"               : "#a52a2a",
    "burlywood"           : "#deb887",
    "cadetblue"           : "#5f9ea0",
    "chartreuse"          : "#7fff00",
    "chocolate"           : "#d2691e",
    "coral"               : "#ff7f50",
    "cornflowerblue"      : "#6495ed",
    "cornsilk"            : "#fff8dc",
    "crimson"             : "#dc143c",
    "cyan"                : "#00ffff",
    "darkblue"            : "#00008b",
    "darkcyan"            : "#008b8b",
    "darkgoldenrod"       : "#b8860b",
    "darkgray"            : "#a9a9a9",
    "darkgreen"           : "#006400",
    "darkkhaki"           : "#bdb76b",
    "darkmagenta"         : "#8b008b",
    "darkolivegreen"      : "#556b2f",
    "darkorange"          : "#ff8c00",
    "darkorchid"          : "#9932cc",
    "darkred"             : "#8b0000",
    "darksalmon"          : "#e9967a",
    "darkseagreen"        : "#8fbc8f",
    "darkslateblue"       : "#483d8b",
    "darkslategray"       : "#2f4f4f",
    "darkturquoise"       : "#00ced1",
    "darkviolet"          : "#9400d3",
    "deeppink"            : "#ff1493",
    "deepskyblue"         : "#00bfff",
    "dimgray"             : "#696969",
    "dodgerblue"          : "#1e90ff",
    "firebrick"           : "#b22222",
    "floralwhite"         : "#fffaf0",
    "forestgreen"         : "#228b22",
    "fuchsia"             : "#ff00ff",
    "gainsboro"           : "#dcdcdc",
    "ghostwhite"          : "#f8f8ff",
    "gold"                : "#ffd700",
    "goldenrod"           : "#daa520",
    "gray"                : "#808080",
    "green"               : "#008000",
    "greenyellow"         : "#adff2f",
    "honeydew"            : "#f0fff0",
    "hotpink"             : "#ff69b4",
    "indianred "          : "#cd5c5c",
    "indigo"              : "#4b0082",
    "ivory"               : "#fffff0",
    "khaki"               : "#f0e68c",
    "lavender"            : "#e6e6fa",
    "lavenderblush"       : "#fff0f5",
    "lawngreen"           : "#7cfc00",
    "lemonchiffon"        : "#fffacd",
    "lightblue"           : "#add8e6",
    "lightcoral"          : "#f08080",
    "lightcyan"           : "#e0ffff",
    "lightgoldenrodyellow": "#fafad2",
    "lightgrey"           : "#d3d3d3",
    "lightgreen"          : "#90ee90",
    "lightpink"           : "#ffb6c1",
    "lightsalmon"         : "#ffa07a",
    "lightseagreen"       : "#20b2aa",
    "lightskyblue"        : "#87cefa",
    "lightslategray"      : "#778899",
    "lightsteelblue"      : "#b0c4de",
    "lightyellow"         : "#ffffe0",
    "lime"                : "#00ff00",
    "limegreen"           : "#32cd32",
    "linen"               : "#faf0e6",
    "magenta"             : "#ff00ff",
    "maroon"              : "#800000",
    "mediumaquamarine"    : "#66cdaa",
    "mediumblue"          : "#0000cd",
    "mediumorchid"        : "#ba55d3",
    "mediumpurple"        : "#9370d8",
    "mediumseagreen"      : "#3cb371",
    "mediumslateblue"     : "#7b68ee",
    "mediumspringgreen"   : "#00fa9a",
    "mediumturquoise"     : "#48d1cc",
    "mediumvioletred"     : "#c71585",
    "midnightblue"        : "#191970",
    "mintcream"           : "#f5fffa",
    "mistyrose"           : "#ffe4e1",
    "moccasin"            : "#ffe4b5",
    "navajowhite"         : "#ffdead",
    "navy"                : "#000080",
    "oldlace"             : "#fdf5e6",
    "olive"               : "#808000",
    "olivedrab"           : "#6b8e23",
    "orange"              : "#ffa500",
    "orangered"           : "#ff4500",
    "orchid"              : "#da70d6",
    "palegoldenrod"       : "#eee8aa",
    "palegreen"           : "#98fb98",
    "paleturquoise"       : "#afeeee",
    "palevioletred"       : "#d87093",
    "papayawhip"          : "#ffefd5",
    "peachpuff"           : "#ffdab9",
    "peru"                : "#cd853f",
    "pink"                : "#ffc0cb",
    "plum"                : "#dda0dd",
    "powderblue"          : "#b0e0e6",
    "purple"              : "#800080",
    "rebeccapurple"       : "#663399",
    "red"                 : "#ff0000",
    "rosybrown"           : "#bc8f8f",
    "royalblue"           : "#4169e1",
    "saddlebrown"         : "#8b4513",
    "salmon"              : "#fa8072",
    "sandybrown"          : "#f4a460",
    "seagreen"            : "#2e8b57",
    "seashell"            : "#fff5ee",
    "sienna"              : "#a0522d",
    "silver"              : "#c0c0c0",
    "skyblue"             : "#87ceeb",
    "slateblue"           : "#6a5acd",
    "slategray"           : "#708090",
    "snow"                : "#fffafa",
    "springgreen"         : "#00ff7f",
    "steelblue"           : "#4682b4",
    "tan"                 : "#d2b48c",
    "teal"                : "#008080",
    "thistle"             : "#d8bfd8",
    "tomato"              : "#ff6347",
    "turquoise"           : "#40e0d0",
    "violet"              : "#ee82ee",
    "wheat"               : "#f5deb3",
    "white"               : "#ffffff",
    "whitesmoke"          : "#f5f5f5",
    "yellow"              : "#ffff00",
    "yellowgreen"         : "#9acd32"
};

// ----------------------------------------
// Functions
// ----------------------------------------
/**
 * Returns whether a color name is supported
 * @param colourName
 * @returns {boolean}
 */
function isLiteralColor(colourName)
{
    return !!colors[colourName]
}

/**
 * @see [Code and original author]
 *     {@link https://stackoverflow.com/questions/15682537/ansi-color-specific-rgb-sequence-bash}
 * @param {number} red
 * @param {number} green
 * @param {number} blue
 * @returns {number}
 */
const rgbToAnsi256 = (red, green, blue) =>
{
    if (red === green && green === blue)
    {
        if (red < 8)
        {
            return 16;
        }

        if (red > 248)
        {
            return 231;
        }

        return Math.round(((red - 8) / 247) * 24) + 232;
    }

    return 16
        + (36 * Math.round(red / 255 * 5))
        + (6 * Math.round(green / 255 * 5))
        + Math.round(blue / 255 * 5);
};

/**
 * @see [Code and original author]
 *     {@link https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb/5624139#5624139}
 * @param hex
 * @returns {{red: number, green: number, blue: number}|null}
 */
const hexToRgb = (hex) =>
{
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function (m, r, g, b)
    {
        return r + r + g + g + b + b;
    });

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        red  : parseInt(result[1], 16),
        blue : parseInt(result[2], 16),
        green: parseInt(result[3], 16)
    } : {};
};

/**
 * @see [Code and original author {@link https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb]
 * @param red
 * @param green
 * @param blue
 * @returns {string}
 */
const rgbToHex = function ({red, green, blue})
{
    const rgb = (red << 16) | (green << 8) | (blue << 0);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
};

const rgbStringToRgb = function (rgbString)
{
    const matches = rgbString.matchAll(/\d+/g);
    const rgbArray = [];
    for (const match of matches)
    {
        const color = parseInt(match[0]);
        if (color > 255)
        {
            return null;
        }
        rgbArray.push(color);
    }

    if (rgbArray.length !== 3)
    {
        return null;
    }

    return {red: rgbArray[0], green: rgbArray[1],  blue: rgbArray[2]}
};

const rgbStringToHex = function (rgbString)
{
    const rgb = rgbStringToRgb(rgbString);
    if (!rgb)
    {
        return rgb;
    }

    return rgbToHex(rgb);
};

const hue2rgb = function hue2rgb(p, q, t)
{
    if (t < 0)
    {
        t += 1;
    }
    if (t > 1)
    {
        t -= 1;
    }
    if (t < 1 / 6)
    {
        return p + (q - p) * 6 * t;
    }
    if (t < 1 / 2)
    {
        return q;
    }
    if (t < 2 / 3)
    {
        return p + (q - p) * (2 / 3 - t) * 6;
    }
    return p;
};

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 * @see [Original code and author] {@link https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion}
 * @param {HSLType}
 * @return {Array}           The RGB representation
 */
const hslToRgb = ({hue, saturation, lightness}) =>
{
    let r, g, b;

    if (saturation === 0)
    {
        r = g = b = lightness; // achromatic
    }
    else
    {
        const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
        const p = 2 * lightness - q;
        r = hue2rgb(p, q, hue + 1 / 3);
        g = hue2rgb(p, q, hue);
        b = hue2rgb(p, q, hue - 1 / 3);
    }

    return {
        red  : Math.round(r * 255),
        blue : Math.round(b * 255),
        green: Math.round(g * 255)
    };
};

/**
 * @see https://stackoverflow.com/questions/1573053/javascript-function-to-convert-color-names-to-hex-codes
 * @param {string} colour
 * @returns {boolean|*}
 */
const colorNameToHex = (colour) =>
{
    const colorName = colour.toLowerCase()
    if (typeof colors[colorName] != 'undefined')
    {
        return colors[colorName];
    }

    return "";
}

/**
 * Returns ANSI code for given RGB color
 * @param {RGBType}
 * @param {boolean} isForeground
 * @returns {string}
 */
function fromRgb({red, blue, green}, isForeground = true)
{
    if (red === undefined || blue === undefined || green === undefined)
    {
        return "";
    }

    const code = rgbToAnsi256(red, blue, green);

    let ground = isForeground ? COLOR_TYPE.Foreground : COLOR_TYPE.Background;
    return `\x1b[${ground};5;` + code + "m " + backward;
}

/**
 * Returns ANSI code for given hexadecimal color
 * @param {string} hexa
 * @param {boolean} isForeground
 * @returns {string}
 */
function fromHexa(hexa, isForeground = true)
{
    const {red, green, blue} = hexToRgb(hexa);
    return fromRgb({red, green, blue}, isForeground);
}

/**
 * Returns ANSI code for given HSL color
 * @param {HSLType}
 * @param {boolean} isForeground
 * @returns {string}
 */
function fromHsl({hue, saturation, lightness}, isForeground)
{
    const {red, green, blue} = hslToRgb({hue, saturation, lightness});
    return fromRgb({red, green, blue}, isForeground);
}

/**
 * Return ANSI code color for a given value
 * @param {string|Object} okayColor Actual name color (i.e. orange, yellow) or color code (#00F00F)
 * @param isForeground
 * @returns {string}
 */
function fromColor(okayColor, isForeground = true)
{
    try
    {
        let hexa;
        okayColor = okayColor || ""

        if (!okayColor)
        {
            return "";
        }

        if (typeof okayColor === 'string' || okayColor instanceof String)
        {
            okayColor = okayColor.trim()
        }

        // Color name
        if (isLiteralColor(okayColor))
        {
            hexa = colorNameToHex(okayColor);
            return fromHexa(hexa, isForeground);
        }
        // RGB
        else if (
            typeof okayColor === 'object' && !!okayColor.red && !!okayColor.blue && !!okayColor.green
        )
        {
            return fromRgb(okayColor, isForeground);
        }
        // HSL
        else if (
            typeof okayColor === 'object' && !!okayColor.hue && !!okayColor.saturation && !!okayColor.lightness
        )
        {
            return fromHsl(okayColor, isForeground);
        }
        else if (okayColor.startsWith("#"))
        {
            return fromHexa(okayColor, isForeground);
        }

        okayColor = okayColor.toString()
        if (!/^[\da-fA-F]+$/.test(okayColor))
        {
            return ""
        }

        return fromHexa("#" + okayColor, isForeground);
    }
    catch (e)
    {
        /* istanbul ignore next */
        console.error("TO_ANSI_INVALID_ARGUMENT_ERROR", e.message)
    }
}

function getTextFromAnsi(text, {
    fg,
    bg,
    isUnderline = false,
    isBold = false,
    isReversed = false
})
{
    let modified = false;

    let prefix = ""
    if (fg)
    {
        modified = true;
        prefix = prefix + fg;
    }

    if (bg)
    {
        modified = true;
        prefix = prefix + bg;
    }

    if (isUnderline)
    {
        modified = true;
        prefix = prefix + FONT_STYLE.Underline;
    }

    if (isBold)
    {
        modified = true;
        prefix = prefix + FONT_STYLE.Bold;
    }

    if (isReversed)
    {
        modified = true;
        prefix = prefix + FONT_STYLE.Reversed;
    }

    if (!modified)
    {
        return text;
    }

    return prefix + text + RESET;
}


function getTextFromRgb(text, {
    fg = {},
    bg = {},
    isUnderline = false,
    isBold = false,
    isReversed = false
})
{
    if (fg)
    {
        fg = fromRgb({...fg});
    }

    if (bg)
    {
        bg = fromRgb({...bg}, false);
    }

    return getTextFromAnsi(text, {fg, bg, isUnderline, isBold, isReversed});
}

function getTextFromHsl(text, {
    fg = "",
    bg = "",
    isUnderline = false,
    isBold = false,
    isReversed = false
})
{
    if (fg)
    {
        fg = fromHsl({...fg});
    }

    if (bg)
    {
        bg = fromHsl({...bg}, false);
    }

    return getTextFromAnsi(text, {fg, bg, isUnderline, isBold, isReversed});
}

function getTextFromHex(text, {
    fg = "",
    bg = "",
    isUnderline = false,
    isBold = false,
    isReversed = false
})
{
    if (fg)
    {
        fg = fromHexa(fg);
    }

    if (bg)
    {
        bg = fromHexa(bg, false);
    }

    return getTextFromAnsi(text, {fg, bg, isUnderline, isBold, isReversed});
}

/**
 * Return colorized text based on given value
 * @param text
 * @param {ColorPropType} props
 * @returns {string}
 */
function getTextFromColor(text, props = null)
{
    if (!props)
    {
        return text;
    }

    let {
        fg = "",
        bg = "",
        isUnderline = false,
        isBold = false,
        isReversed = false
    } = props;

    if (fg)
    {
        fg = fromColor(fg);
    }

    if (bg)
    {
        bg = fromColor(bg, false);
    }

    return getTextFromAnsi(text, {fg, bg, isUnderline, isBold, isReversed});
}

// ----------------------------------------
// Exports
// ----------------------------------------
module.exports = {
    fromRgb, fromHexa, fromHsl, fromColor,
    getTextFromRgb, getTextFromHsl, getTextFromHex, getTextFromColor,
    colorNameToHex, hslToRgb, hexToRgb, rgbToHex, rgbToAnsi256, rgbStringToRgb, rgbStringToHex, hue2rgb, RESET, FONT_STYLE, STYLE
}

/**
 * For the conversion with to-esm, the named export and the function to export must use the same identifier.
 * Otherwise, the conversion will fail.
 */
module.exports.fromRgb = fromRgb
module.exports.fromHexa = fromHexa;
module.exports.fromHsl = fromHsl;
module.exports.fromColor = fromColor;

module.exports.getTextFromRgb = getTextFromRgb;
module.exports.getTextFromHsl = getTextFromHsl;
module.exports.getTextFromHex = getTextFromHex;
module.exports.getTextFromColor = getTextFromColor;
module.exports.colorNameToHex = colorNameToHex

module.exports.hexToRgb = hexToRgb;
module.exports.rgbToHex = rgbToHex;
module.exports.rgbToAnsi256 = rgbToAnsi256;
module.exports.hue2rgb = hue2rgb;
module.exports.hslToRgb = hslToRgb;

module.exports.rgbStringToRgb = rgbStringToRgb;
module.exports.rgbStringToHex = rgbStringToHex;

module.exports.RESET = RESET;

module.exports.FONT_STYLE = FONT_STYLE;
module.exports.STYLE = STYLE;

