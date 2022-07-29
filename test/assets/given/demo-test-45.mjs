/**
 * The assets here will be preloaded first before the game begins (apart from "passive" which will be a non-blocking preloading)
 * @type {{images: string[], sounds: {[string]: string}, ambiences: string[], musics: string[], passive: string[]}}
 */

export const medias = {
    ambiences:
        [
            /**
             * Ambience
             */
            "wind-chimes-60654.mp3"
        ],
    musics   : [
        "motivational-day-112790.mp3",
        "jazzy-abstract-beat-11254.mp3",
        "ambient-piano-ampamp-strings-10711.mp3",
    ],
    sounds   : {
        announcement: `announcement-sound-21466.mp3`,
        applause1   : `clapping-6474.mp3`,
        applause2   : `small-applause-6695.mp3`,
        applause3   : `claps-44774.mp3`,
        applause4   : `pleased-crowdflac-14484.mp3`,
        applause5   : `crowd-cheer-ii-6263.mp3`,
        applause6   : `cheering-and-clapping-crowd-2-6029.mp3`,
        applause7   : `cheering-and-clapping-crowd-1-5995.mp3`,
        applause8   : `applause-2-31567.mp3`,
        beep        : `start-13691.mp3`,
        correct     : `correct-2-46134.mp3`,
        crystal     : `crystal-logo-21091.mp3`,
        fail2       : `failure-drum-sound-effect-2-7184.mp3`,
        fireworks   : `fireworks-close-29630.mp3`,
        harp        : `harp-flourish-6251.mp3`,
        tictac      : `tic-tac-27828.mp3`,
        earthquake  : `earth-rumble-6953.mp3`,
    },
    images   : ["dice-1502706.jpg", "302-1228x880.jpg"],
    passive  : [
        "city-1420442_1920.jpg", "city-7241725_1920.jpg", "drink-3843742_1920.jpg",
        "grain-7288138_1920.jpg", "grief-5501796_1920.jpg", "kitten-2801007_1920.jpg",
        "mountains-7302806_1920.jpg", "ocean-7302776_1920.jpg", "por-do-sol-4707500_1920.jpg",
        "scenery-7275367_1920.jpg", "sea-7301366_1920.jpg", "weevil-7283954_1920.jpg"
    ]

};
