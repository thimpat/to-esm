module.exports = {
    replaceStart: [
        {
            search : "const ansiEscapes = require(\"ansi-escapes-cjs\");",
            replace: "// *** ansiEscapes ***"
        }],
    replaceEnd: [
        {
            search : "// *** ansiEscapes ***",
            replace: "import ansiEscapes from \"ansi-escapes\";"
        }
    ],
}