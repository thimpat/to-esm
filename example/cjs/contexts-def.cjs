const constants = {
    LOG_CONTEXT: {STANDARD: {}, TEST: {color: "red"}, C1: null, C2: null, C3: null, DEFAULT: {}},
    LOG_TARGETS: {DEV: {}, USER: {user: true}}
}

module.exports.LOG_CONTEXT = constants.LOG_CONTEXT
module.exports.LOG_TARGETS = constants.LOG_TARGETS