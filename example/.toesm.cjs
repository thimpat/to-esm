module.exports = {
    replaceStart  : [
        {
            search : /const\s+ttt\s*=\s*require\(.mama-magnimus.\);/g,
            replace: "// ***"
        }
    ],
    replaceEnd    : [
        {
            search : `// ***`,
            replace: "// --------- mama-magnimus was replaced ----------------"
        }
    ],
    replaceModules:
        {
            "rgb-hex": {
                cjs: {
                    name   : "rgb-hex-cjs",
                    version: "@^3.0.0"
                },
                esm: {
                    version: "@latest"
                }
            }
        },
    html          :
        {
            importmap       : {
                "ttt": "http://somewhere"
            },
            importmapReplace: [{
                search : "./node_modules",
                replace: `/node_modules`,
                regex: false
            }],
        }

}