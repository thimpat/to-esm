// main.js
const toAnsi = require("to-ansi");
const rgbHex = require("rgb-hex-cjs");
const {COLOR_TABLE, SYSTEM} = require("./constants.cjs");

// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const path = require('path')

// const LOG_CONTEXT = {STANDARD: null, TEST: {color: "#B18904", symbol: "⏰"}, C1: null, C2: null, C3: null, DEFAULT: {}}
// const LOG_TARGETS = {ALL: "ALL", DEV1: "TOM", DEV2: "TIM", USER: "USER"};
//
// const {anaLogger} = require("analogger");
//
// anaLogger.setContexts(LOG_CONTEXT);
// anaLogger.setTargets(LOG_TARGETS);
// anaLogger.setOptions({silent: false, hideError: false})
//
// console.log("==========================");
// anaLogger.log(LOG_CONTEXT.C1, `Test Log example C1`);
// anaLogger.log(LOG_CONTEXT.C2, `Test Log example C2`);
// anaLogger.log(LOG_CONTEXT.C3, `Test Log example C3`);
//
// anaLogger.overrideConsole()


const MenuKitLib = require("../src/MenuKit/menu-kit-lib")
const {SPECIAL_CONSTANTS} = require("../src/MenuKit/constants/constants.js");
const MainDataExchanger = require("electron-data-exchanger").MainDataExchanger;

const menuTemplate = [
    {
        label  : "File",
        submenu: [
            {
                label          : "Okay",
                role           : "quit",
                onClientVisible: function ()
                {
                    console.log("Hello There");
                    return true;
                }
            },
        ]
    }
];


async function createWindow()
{
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        titleBarStyle : "hidden",
        width         : 1640,
        height        : 860,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        }
    });

    const t = __filename;

    // MenuKit.loadOptions(mainWindow, {
    //     iconPath : path.join(__dirname, "images/files.svg"),
    //     title    : "MenuKit Test with Dark Mode enabled",
    //     theme    : "dark",
    //     menus:
    //         [
    //             {
    //                 content    : menuTemplate,
    //                 type       : "principal",
    //                 id         : "main_01",
    //                 inspectable: true,
    //                 freezable  : false
    //             },
    //         ]
    // });

    // require("./template-main.mjs")
    const {default: templateMainMenus} = await import("./template-main.mjs");
    const {default: templateDockedMenus} = await import("./template-docked.mjs");
    const {default: templateTabbedMenus} = await import("./template-tabbed.mjs");
    const {default: templateContextMenus1} = await import("./template-context-01.mjs");
    const {default: templateContextMenus2} = await import("./template-context-02.mjs");

    MenuKitLib.prepareInterface(mainWindow);

//     await MenuKitLib.loadOptions(mainWindow, {
//         iconPath: path.join(__dirname, "images/files.svg"),
//         title   : `${packageJson.name} ${packageJson.version}`,
//         theme   : "dark",
// /*
//         menus   :
//             [
//                 // ------------------------------------------------------------
//                 // Main Menus
//                 // ------------------------------------------------------------
//                 {
//                     content: templateMainMenus,
//                     type   : "principal",
//                     id     : "main_01",
//                     // size   : {height: "180px"},
//                     pushBody: true,
//                 },
//                 // ------------------------------------------------------------
//                 // Docked Menus
//                 // ------------------------------------------------------------
//                 {
//                     content    : templateDockedMenus,
//                     type       : "docked",
//                     id         : "right_docked",
//                     coordinates: {right: 0, top: "80px", bottom: "46px"},
//                     size   : {width: "32px"},
//                     contentType: {
//                         position: "before-menu"
//                     },
//                     orientation: "vertical",
//                     spot: "left-side"
//                 },
//                 {
//                     content    : templateDockedMenus,
//                     type       : "docked",
//                     id         : "docked_01",
//                     coordinates: {x: "0", y: "40px", offsetX: "0px", offsetY: "40px"},
//                     size   : {width: "50%", height: "40px"},
//                     contentType: {
//                         position: "after-menu"
//                     },
//                     additionalStyle: {
//                         wrapper: {
//                             zIndex: 8000
//                         }
//                     }
//                 },
//                 {
//                     content    : templateDockedMenus,
//                     type       : "docked",
//                     id         : "docked_02",
//                     coordinates: {x: "50%", y: "40px"},
//                     size   : {width: "50%", height: "40px"},
//                 },
//                 {
//                     content    : templateDockedMenus,
//                     type       : "docked",
//                     id         : "docked_03",
//                     coordinates: {bottom: "26px"},
//                     size       : {height: "20px", width: "100%"},
//                     contentType: {
//                         position: "before-menu"
//                     },
//                     classname  : "user-menu-3",
//                     additionalStyle: {
//                         wrapper:
//                             {
//                                 zIndex: 4036
//                             },
//                     },
//                     freezable: true,
//                     inspectable: true,
//                 },
//                 // ------------------------------------------------------------
//                 // Embedded Menus
//                 // ------------------------------------------------------------
//                 {
//                     content    : templateDockedMenus,
//                     type       : "embedded",
//                     id         : "embedded_01",
//                     coordinates: {top: "283px", left: "calc(50% + 64px)", marginLeft: "-190px"},
//                     size       : {height: "34px", width: "200px"},
//                     contentType: {
//                         position  : "after-menu",
//                         classname : "some-special-tab",
//                         idPageBase: "some-new-id",
//                         height    : "189px",
//                         width: "200px"
//                     },
//                     classname  : "user-menu-6",
//                     additionalStyle: {
//                         wrapper: {
//                             opacity: 0.9
//                         }
//                     }
//                 },
//                 // ------------------------------------------------------------
//                 // Tabbed Menus
//                 // ------------------------------------------------------------
//                 {
//                     content    : templateTabbedMenus,
//                     type       : "tabbed",
//                     id         : "top_right_tabbed",
//                     coordinates: {left: "unset", top: "80px", right: "32px"},
//                     size       : {height: "calc(100% - 100px)", width: "40px"},
//                     orientation: "vertical",
//                     contentType: {
//                         position  : "before-menu",
//                         classname : "dockable-tab",
//                         idPageBase: "my-dockable-tab",
//                         height    : "89px",
//                         width: "250px"
//                     },
//                     classname  : "user-menu-5",
//                     dockable: true,
//                     resizable: true,
//                     movable: true,
//                     additionalStyle: {
//                         wrapper: {
//                             zIndex: 461
//                         }
//                     }
//                     // visible    : false
//                 },
//                 {
//                     content    : templateTabbedMenus,
//                     type       : "tabbed",
//                     id         : "bottom_tabbed",
//                     coordinates: {left: "40px", bottom: "46px", right: "30px"},
//                     size       : {height: "80px"},
//                     contentType: {
//                         position  : "before-menu",
//                         classname : "special-tab",
//                         idPageBase: "my-tab",
//                         height    : "148px"
//                     },
//                     classname: "user-menu-4",
//                     additionalStyle: {
//                         wrapper:
//                             {
//                                 zIndex: 2023
//                             },
//                     }
//                 },
//                 {
//                     content    : templateDockedMenus,
//                     type       : "tabbed",
//                     id         : "left_tabbed",
//                     coordinates: {left: "0", top: "80px", bottom: "270px"},
//                     size   : { width: "40px"},
//                     contentType: {
//                         width    : "348px"
//                     },
//                     orientation: "vertical",
//                 },
//                 {
//                     content    : templateDockedMenus,
//                     type       : "tabbed",
//                     id         : "bottom_right_tabbed",
//                     coordinates: {right: "32px", bottom: "126px"},
//                     size   : { height: "147px", width: "40px"},
//                     contentType: {
//                         position  : "before-menu",
//                         width    : "348px"
//                     },
//                     orientation: "vertical",
//                     additionalStyle: {
//                         wrapper: {
//                             zIndex: 6086
//                         }
//                     }
//                 },
//                 // ------------------------------------------------------------
//                 // Context Menus
//                 // ------------------------------------------------------------
//                 {
//                     content       : templateContextMenus1,
//                     type          : "context",
//                     id            : "floating_01",
//                     targetSelector: "#the-special",
//                 },
//                 {
//                     content       : templateContextMenus2,
//                     type          : "context",
//                     id            : "floating_02",
//                     targetSelector: ".the-precious",
//                     triggerButtons: ["left"],
//                 }
//             ]
// */
//     });


    // and load the index.html of the app.
    await mainWindow.loadFile('index.html')

    // Open the DevTools.
    mainWindow.webContents.openDevTools();

    const dataExchanger = new MainDataExchanger()
    await dataExchanger.init(mainWindow)

    await dataExchanger.addListener(SPECIAL_CONSTANTS.MainProcessChannel, function (data)
    {
        return {MainResponse: "Main___Response", youSent: data}
    })

    // await dataExchanger.testChannel(SPECIAL_CONSTANTS.MainProcessChannel)
    await dataExchanger.testMultiChannels()

    // setTimeout(async ()=>
    // {
    //     const result = await dataExchanger.sendIPCMessage({hi: "From main 22"})
    //     const response = result.response
    //     console.log(`[DATA_EXCHANGER] MAIN: (1043) =============> Received message from renderer:  ${JSON.stringify(response)}`)
    // }, 2000)


}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () =>
{
    await createWindow();

    app.on("activate", async function ()
    {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0)
        {
            await createWindow();
        }
    });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function ()
{
    if (process.platform !== 'darwin')
    {
        app.quit()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.