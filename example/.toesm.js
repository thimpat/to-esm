module.exports = {
    replaceStart: [
        {
            search : /const\s+ttt\s*=\s*require\(.mama-magnimus.\);/g,
            replace: "// ***"
        }
    ],
    replaceEnd  : [
        {
            search : `// ***`,
            replace: "// --------- mama-magnimus was replaced ----------------"
        }
    ],
    replaceModules:
        {
            chalk: {
                cjs: {
                    name: "chalk-cjs",
                    version: "@^4.1.2",
                },
                esm: {
                    version: "@latest"
                }
            },
            "color-convert": {
                cjs: {
                    name: "color-convert-cjs",
                    version: "@^2.0.1"
                },
                esm: {
                    version: "@latest"
                }
            }
        }
}