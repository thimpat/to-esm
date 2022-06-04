const modifiers = /^(CommandOrControl|CmdOrCtrl|Command|Cmd|Control|Ctrl|AltGr|Option|Alt|Shift|Super)/i;
const keyCodes = /^(Plus|Space|Tab|Backspace|Delete|Insert|Return|Enter|Up|Down|Left|Right|Home|End|PageUp|PageDown|Escape|Esc|VolumeUp|VolumeDown|VolumeMute|MediaNextTrack|MediaPreviousTrack|MediaStop|MediaPlayPause|PrintScreen|F24|F23|F22|F21|F20|F19|F18|F17|F16|F15|F14|F13|F12|F11|F10|F9|F8|F7|F6|F5|F4|F3|F2|F1|[0-9A-Z)!@#$%^&*(:+<_>?~{|}";=,\-./`[\\\]'])/i;
const UNSUPPORTED = {};

const virtualKeyCodes = {
    0: "Digit0",
    1: "Digit1",
    2: "Digit2",
    3: "Digit3",
    4: "Digit4",
    5: "Digit5",
    6: "Digit6",
    7: "Digit7",
    8: "Digit8",
    9: "Digit9",
    "-": "Minus",
    "=": "Equal",
    Q: "KeyQ",
    W: "KeyW",
    E: "KeyE",
    R: "KeyR",
    T: "KeyT",
    Y: "KeyY",
    U: "KeyU",
    I: "KeyI",
    O: "KeyO",
    P: "KeyP",
    "[": "BracketLeft",
    "]": "BracketRight",
    A: "KeyA",
    S: "KeyS",
    D: "KeyD",
    F: "KeyF",
    G: "KeyG",
    H: "KeyH",
    J: "KeyJ",
    K: "KeyK",
    L: "KeyL",
    ";": "Semicolon",
    "'": "Quote",
    "`": "Backquote",
    "/": "Backslash",
    Z: "KeyZ",
    X: "KeyX",
    C: "KeyC",
    V: "KeyV",
    B: "KeyB",
    N: "KeyN",
    M: "KeyM",
    ",": "Comma",
    ".": "Period",
    "\\": "Slash",
    " ": "Space",
};

const domKeys = Object.assign(Object.create(null), {
    plus: "Add",
    space: "Space",
    tab: "Tab",
    backspace: "Backspace",
    delete: "Delete",
    insert: "Insert",
    return: "Return",
    enter: "Return",
    up: "ArrowUp",
    down: "ArrowDown",
    left: "ArrowLeft",
    right: "ArrowRight",
    home: "Home",
    end: "End",
    pageup: "PageUp",
    pagedown: "PageDown",
    escape: "Escape",
    esc: "Escape",
    volumeup: "AudioVolumeUp",
    volumedown: "AudioVolumeDown",
    volumemute: "AudioVolumeMute",
    medianexttrack: "MediaTrackNext",
    mediaprevioustrack: "MediaTrackPrevious",
    mediastop: "MediaStop",
    mediaplaypause: "MediaPlayPause",
    printscreen: "PrintScreen"
});

// module.exports = {
// 	UNSUPPORTED,
// 	reduceModifier,
// 	reducePlus,
// 	reduceKey,
// 	reduceCode,
// 	toKeyEvent
// };

module.exports.UNSUPPORTED = UNSUPPORTED;
module.exports.reduceModifier = reduceModifier;
module.exports.reducePlus = reducePlus;
module.exports.reduceKey = reduceKey;
module.exports.reduceCode = reduceCode;
module.exports.toKeyEvent = toKeyEvent;