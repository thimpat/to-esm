module.exports = {
    replaceStart: [
        {
            search : /const\s+chalk\s*=\s*require\(.chalk.\);/g,
            replace: "// ***"
        }
    ],
    replaceEnd  : [
        {
            search : `// ***`,
            replace: "// --------- chalk was replaced ----------------"
        }
    ]
}