const fs = require("fs");
const path = require("path");

const {sleep} = require("@thimpat/libutils");
const toAnsi = require("to-ansi");

const {marked} = require("marked");
const TerminalRenderer = require("marked-terminal");


const terminalSize = require("term-size-cjs");
const getTerminalHeight = () =>
{
    return terminalSize().rows
};

const getTerminalWidth = () =>
{
    return terminalSize().cols
};


let helpLines = [];

let indexLine = 0;
let maxLines = 0;
let consoleTitle;
let progressBar;
let smoothScrolling = true;
let smoothScrollingLatency = 10;

let viewPort = {
    start: 0,
    end  : 0
};

let someColors = []

/**
 * Wrap text
 * https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
 * @param str
 * @param maxChars
 * @returns {*}
 */
const wrap = (str, maxChars) => str.replace(
    new RegExp(`(?![^\\n]{1,${maxChars}}$)([^\\n]{1,${maxChars}})\\s`, 'g'), '$1\n'
);

const closeHelp = () =>
{
    process.stdout.write("\n\n");
    process.exit();
};

function setTerminalTitle(title)
{
    process.stdout.write(
        String.fromCharCode(27) + "]0;" + title + String.fromCharCode(7)
    );
}

const displayProgressBar = (percent, showProgressBar = progressBar) =>
{
    if (!showProgressBar)
    {
        return
    }
    const nb = Math.floor(percent / 10);
    const bar = Array.from(Array(nb).fill("◼")).join("");
    const box = "     [" + bar.padEnd(11, "◾") + "]";
    setTerminalTitle(consoleTitle + " " + box + percent.toString().padStart(3, " ") + "%");
};

const setIndexLine = (index) =>
{
    const terminalHeight = getTerminalHeight();

    if (index < 0)
    {
        return;
    }

    if (index < viewPort.start - 1)
    {
        viewPort.start = index;
        viewPort.end = viewPort.start + terminalHeight;
    }
    else if (index > viewPort.end)
    {
        viewPort.end = index;
        viewPort.start = viewPort.end - terminalHeight;
    }

    indexLine = index + 1;
};

const displayLineIndex = (index = indexLine, {lineNumber = false, update = true} = {}) =>
{
    if (index < 0)
    {
        return;
    }

    if (index >= helpLines.length - 1)
    {
        closeHelp()
        return;
    }

    const text = helpLines[index];
    if (text === undefined)
    {
        closeHelp()
        return;
    }

    const nLine = lineNumber ? index + ": " : "";
    // process.stdout.write(nLine + text + toAnsi.RESET);
    // process.stdout.write(toAnsi.RESET + nLine + text);
    process.stdout.write(nLine + text);
    // process.stdout.write(index + ": " + text);

    update && setIndexLine(index);

    const percent = Math.ceil(index / maxLines * 100);
    displayProgressBar(percent);

    return index;
};

const displayTextRangeSmooth = async (start, end, {smooth = smoothScrolling, lineNumber = false} = {}) =>
{
    let isEnd = false;
    let limit = indexLine + end;
    if (limit >= maxLines)
    {
        limit = maxLines;
        isEnd = true;
    }

    for (let i = start; i < limit; ++i)
    {
        smooth && await sleep(smoothScrollingLatency);
        process.stdout.write("\n");

        displayLineIndex(i, {lineNumber});
    }

    if (isEnd)
    {
        closeHelp();
    }

    return limit - 1;
};

/**
 * @see https://stackoverflow.com/questions/5006821/nodejs-how-to-read-keystrokes-from-stdin
 * @returns {boolean}
 */
const grabKey = () =>
{
    try
    {
        const stdin = process.stdin;

        stdin.setRawMode(true);
        stdin.resume();
        stdin.setEncoding("utf8");

        stdin.on("data", async function (key)
        {
            const keyname = "" + key;
            const terminalHeight = getTerminalHeight()

            // CTRL-C
            if (keyname === "\u0003")
            {
                closeHelp();
            }
            // ESC
            else if (keyname === "\u001B")
            {
                closeHelp();
            }
            // Q
            else if (keyname.toLowerCase() === "q")
            {
                closeHelp();
            }
            // PAGE DOWN
            else if (keyname === "\u001B\u005B\u0036\u007E")
            {
                await displayTextRangeSmooth(indexLine + 1, terminalHeight);
                return;
            }

            if (indexLine <= 0)
            {
                return;
            }

            process.stdout.write("\n");
            displayLineIndex();

        });

        return true;
    }
    catch (e)
    {
        console.error({lid: 4321}, e.message);
    }

    return false;
};

const colorText = (arr) =>
{
    let emptyLineCounter = 0;
    let counter = 0
    for (let i = 0; i < arr.length; ++i)
    {
        counter = counter % someColors.length
        const fg = someColors[counter]

        const textLine = arr[i]

        if (!textLine.trim())
        {
            ++emptyLineCounter
        }
        else
        {
            emptyLineCounter = 0
        }

        if (emptyLineCounter >= 1)
        {
            ++counter
            emptyLineCounter = 0
        }

        arr[i] = toAnsi.getTextFromHex(textLine, {
            fg,
        });

    }

    return arr
}

const customMarkdown = (text) =>
{
    try
    {
        text = text.replace(/## /gm, "");
        text = text.replaceAll("\n\n\n", "\n");
        text = text.replace(/---[ -]+/gm, "-".padEnd(20, "-"));
        text = text.replaceAll(/<br.>/g, "\n");
    }
    catch (e)
    {
    }

    return text;
}

const colorMarkdown = (content, {fg = "yellow"} = {}) =>
{
    const helpOptions = {
        code             : (text) => toAnsi.getTextFromColor(text, {fg: "yellow"}),
        showSectionPrefix: true,
        unescape         : true,
        emoji            : true,
        tableOptions     : {},
        tab              : 2
    };
    marked.setOptions({
        // Define custom renderer
        renderer: new TerminalRenderer(helpOptions)
    });

    content = customMarkdown(content);
    content = marked(content);

    return content
}

/**
 *
 * @returns {Promise<boolean>}
 *
 * @example
 * $> genserve help
 * $> genserve -h
 * $> genserve --help
 */
const showHelp = async (content, {
    windowTitle = "❔" + " Help ",
    markdownTextColor = "yellow",
    topText = "",
    topTextBg = "#00FF00",
    topTextFg = "#006655",
    topTextBold = true,
    topTextUnderline = false,
    topTextReversed = false,
    colorify = false,
    markdown = true,
    progress = true,
    smooth = true,
    latencyScroll = 10,
    filepath = "",
    colors = [
        "#3A01DF",
        "#40FF00",
        "#1a6981",
        "#8d8a43",
    ]

} = {}) =>
{
    progressBar = progress
    smoothScrolling = smooth;
    smoothScrollingLatency = latencyScroll;

    consoleTitle = windowTitle;
    setTerminalTitle(consoleTitle);

    if (!content)
    {
        if (!filepath)
        {
            console.error(`No content to display`)
            return false;
        }

        content = fs.readFileSync(filepath, {encoding: "utf-8"})

        const extension = path.extname(filepath)

        if (markdown && !["md", "markdown"].includes(extension))
        {
            markdown = false;
        }
    }

    if (topText)
    {
        topText = toAnsi.getTextFromHex(topText, {
            bg         : topTextBg,
            fg         : topTextFg,
            isBold     : topTextBold,
            isUnderline: topTextUnderline,
            isReversed : topTextReversed
        });

        content = topText + "\n" + content;
    }

    const terminalHeight = getTerminalHeight() || 20;
    const terminalWidth = getTerminalWidth() || 80;

    if (markdown)
    {
        content = colorMarkdown(content, {fg: markdownTextColor})
    }

    content = wrap(content, terminalWidth);

    helpLines = content.split("\n");
    maxLines = helpLines.length;

    if (colorify)
    {
        someColors = colors
        colorText(helpLines)
    }

    process.stdout.write(toAnsi.RESET);
    await displayTextRangeSmooth(0, terminalHeight, {smooth: false});

    grabKey();
};


// -------------------------------------------
//
// -------------------------------------------
// const toUnicode = function (str)
// {
//     let unicodeString = "";
//     for (let i = 0; i < str.length; i++)
//     {
//         let theUnicode = str.charCodeAt(i).toString(16).toUpperCase();
//         while (theUnicode.length < 4)
//         {
//             theUnicode = "0" + theUnicode;
//         }
//         theUnicode = "\\u" + theUnicode;
//         unicodeString += theUnicode;
//     }
//     return unicodeString;
// };

// function moveUp(nb = 1)
// {
//     for (let i = 0; i < nb; ++i)
//     {
//         process.stdout.write("\033[<1>A");
//     }
// }
//
// function moveDown(nb = 1)
// {
//     for (let i = 0; i < nb; ++i)
//     {
//         process.stdout.write("\033[<1>B");
//     }
// }


module.exports.showHelp = showHelp;
