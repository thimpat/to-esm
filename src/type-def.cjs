

/**
 * Object containing information related to the source to convert.
 *
 * @typedef CjsInfoType
 *
 * @property {string} pkgImportPath
 * @property {string} sourceAbs Source absolute path
 * @property {string} subDir Source relative directory against rootDir
 * @property {string} rootDir Root directory absolute path
 * @property {number} weight Require depth level
 * @property {string} source Source relative path against rootDir
 * @property {string} subPath Target (.mjs) related path against rootDir
 * @property {string} mjsTarget Target (.mjs) related path against rootDir
 * @property {string} mjsTargetAbs Target (.mjs) absolute path
 * @property {string} id Source unique id
 * @property {boolean} [notOnDisk=false] Whether the converted source will be written on disk or only parsed
 * @property {boolean} [isEntryPoint=false] Whether the source is the entry path
 * @property {string[]} [referrers] List of sources that use this one
 *
 */

/**
 * Options that users do not control to pass over transformation functions
 *
 * @typedef EngineOptionType
 *
 * minify: boolean, onlyBundle: boolean, sourcemap: boolean, useImportMaps: (boolean|*),
 *      prefixpath: (string|*), target: *, nm: (string), useImportMaps: boolean
 *
 * @property {boolean} minify
 * @property {boolean} onlyBundle
 * @property {boolean} sourcemap
 * @property {boolean} [useImportMaps]
 * @property {string} rootDir Root directory absolute path
 * @property {string} outputDir Target directory absolute path
 * @property {string} workingDir Application working directory
 * @property {string} entryPointPath Entry point absolute path
 * @property {string} prefixpath
 * @property {string} nm
 * @property {*} target
 * @property {*} extras
 */