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
            "rgb-hex": {
                cjs: {
                    name: "rgb-hex-cjs",
                    version: "@^3.0.0"
                },
                esm: {
                    version: "@latest"
                }
            }
        }
}