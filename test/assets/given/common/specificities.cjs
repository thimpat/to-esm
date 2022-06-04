const SPECIFICS = {
    DIRECTION: {
        UP  : "UP", // UP: Renderer => Preloader => Main Process
        DOWN: "DOWN" // DOWN: Main Process => Preloader => Renderer
    },
    MESSAGE_TYPE: {
        MESSAGE: "MESSAGE",
        RESPONSE: "RESPONSE"
    },
    SYSTEM_TYPE: {
        PRELOADER: "PRELOADER",
        RENDERER: " RENDERER",   // The extra space is for the console alignment. Can be removed safely in case of problem.
        MAIN: "MAIN",
        UNKNOWN: "UNKNOWN"
    }

};

module.exports.DIRECTION = SPECIFICS.DIRECTION;
module.exports.MESSAGE_TYPE = SPECIFICS.MESSAGE_TYPE;
module.exports.SYSTEM_TYPE = SPECIFICS.SYSTEM_TYPE;
module.exports = SPECIFICS;

