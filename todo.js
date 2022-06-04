
// FIX: to-esm parse comments: See draft-1. pingServer won't be exported

// FIX: When there are two different default exports, to-esm choke. For instance:
// module.exports = something
// module.exports.default = something