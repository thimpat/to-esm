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

export const DIRECTION = SPECIFICS.DIRECTION;
export const MESSAGE_TYPE = SPECIFICS.MESSAGE_TYPE;
export const SYSTEM_TYPE = SPECIFICS.SYSTEM_TYPE;
export default SPECIFICS;

