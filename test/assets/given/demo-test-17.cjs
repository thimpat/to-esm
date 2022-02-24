const LibUtils = require("../cjs-lib-utils.js");
const TemplateLoader = require("./cjs-template-loader.js");
// import WindowBridgeCommon from "./window-bridge-common.js";
const DockableMenuBrowserWindowManager = require("./dockable-menu-browser-window-manager.js");
const {SPECIAL_CONSTANTS, MENU_TYPE, PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN} = require("../constants/constants.js");

/**
 * class WindowBridgeMain
 * @augments WindowBridgeCommon
 */
class WindowBridgeMain /*extends WindowBridgeCommon*/
{
    static browserWindowTool = {};

    // ***************************
    static nativeMenus = {};
    static globalSetupOptions = {};
    static globalDebugModeEnabled = false;
    // ***************************

    constructor()
    {

    }


    static parseDebugOptionList(debugTypeList = [])
    {
        const table = {
            [MENU_TYPE.CONTEXT]  : debugTypeList.includes(MENU_TYPE.CONTEXT),
            [MENU_TYPE.PRINCIPAL]: debugTypeList.includes(MENU_TYPE.PRINCIPAL)
        };
        WindowBridgeMain.setDebugOptionTable(table);
    }


    static initialiseNativeMenu(templateContent, templateID)
    {
        try
        {
            const {Menu} = require("electron");

            WindowBridgeMain.nativeMenus[templateID] = Menu.buildFromTemplate(templateContent);

            // DEBUG: Check this for multi Windows
            Menu.setApplicationMenu(WindowBridgeMain.nativeMenus[templateID]);
        }
        catch (e)
        {
            console.error("E3463434563232113:", e);
        }
    }

    static initialiseNativeMenus()
    {
        try
        {
            for (let id in TemplateLoader.templateTable)
            {
                if (!TemplateLoader.templateTable.hasOwnProperty(id))
                {
                    continue;
                }

                WindowBridgeMain.initialiseNativeMenu(TemplateLoader.templateTable[id].content, id);
            }
        }
        catch (e)
        {
            console.error("E46445656456465:", e);
        }
    }

    static getElectronNativeMenu(templateID)
    {
        return WindowBridgeMain.nativeMenus[templateID];
    }

    static async showClientContextMenu(browserWindow, data = {})
    {
        try
        {
            await WindowBridgeMain.contextMenuInstance.showContextMenuWindow(data);

            return {success: true, /*contextMenuWindowID: contextMenuInstance.id*/};
        }
        catch (e)
        {
            console.error(e);
        }

        return {success: true};
    }

    static hideClientContextMenu(browserWindow, data = {})
    {
        try
        {
            WindowBridgeMain.contextMenuInstance.hideContextMenuWindow(data);
            return {success: true};
        }
        catch (e)
        {
            console.error(e);
        }

        return {success: true};
    }

    static destroyClientContextMenu(browserWindow, data = {})
    {
        try
        {
            if (!WindowBridgeMain.contextMenuInstance)
            {
                LibUtils.log("No contextual menu to destroy");
                return {success: true};
            }

            WindowBridgeMain.contextMenuInstance.destroyContextMenuWindow(data);
            return {success: true};
        }
        catch (e)
        {
            console.error(e);
        }

        return {success: false};
    }

    static async createClientWindowTool(browserWindow, data = {})
    {
        try
        {
            let windowToolWindow = null;

            try
            {
                const templateID = data.templateID;
                const position = data.coordinates.position;

                // Generate the instance to manage the BrowserWindow
                WindowBridgeMain.windowToolInstances[templateID] = new DockableMenuBrowserWindowManager(browserWindow);

                // Get menu template properties from given id
                const templateProp = TemplateLoader.getTemplateById(data.templateID);

                const debugMode = templateProp.inspectable;

                // Create the BrowserWindow to contain the DOM context menu
                windowToolWindow = await WindowBridgeMain.windowToolInstances[templateID].createDockableWindowTool({debugMode, position, templateID, data});

                if (!windowToolWindow || !windowToolWindow.id)
                {
                    console.error("Failed to generate context menu window.");
                    return {success: false};
                }

                WindowBridgeMain.browserWindowTool[templateID] = windowToolWindow;

                return {success: true, windowToolWindow: windowToolWindow};
            }
            catch (e)
            {
                console.error(e);
            }

            return {success: false, contextMenuWindow: windowToolWindow};
        }
        catch (e)
        {
            console.error(e);
        }

        return {success: true};
    }

    static async createClientContextMenu(browserWindow, data = {})
    {
        try
        {
            const ContextMenuWindow = require("../context-menu/context-menu-browser-window");
            let contextMenuWindow = null;

            try
            {
                const templateID = data.templateID;
                const position = data.coordinates.position;

                // Generate the instance to manage the BrowserWindow
                WindowBridgeMain.contextMenuInstance = new ContextMenuWindow(browserWindow);

                // Get menu template properties from given id
                const templateProp = TemplateLoader.getTemplateById(data.templateID);

                const debugMode = templateProp.inspectable;

                // Create the BrowserWindow to contain the DOM context menu
                contextMenuWindow = await WindowBridgeMain.contextMenuInstance.createContextMenuWindow({debugMode, position, templateID, data});

                if (!contextMenuWindow || !contextMenuWindow.id)
                {
                    console.error("Failed to generate context menu window.");
                    return {success: false};
                }

                WindowBridgeMain.browserWindowContext = contextMenuWindow;

                return {success: true, contextMenuWindow};
            }
            catch (e)
            {
                console.error(e);
            }

            return {success: false, contextMenuWindow};
        }
        catch (e)
        {
            console.error(e);
        }

        return {success: true};
    }

    static async executeCommandWithinMainProcessEnvironment(command, data)
    {
        let info;

        try
        {
            if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.GET_WINDOW_INFO)
            {
                info = {
                    maximized: WindowBridgeMain.browserWindowMain.isMaximized()
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.GET_MENU_TEMPLATE)
            {
                info = {
                    templateTable: TemplateLoader.templateTable
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.CREATE_WINDOW_TOOL_WINDOW)
            {
                const result = await WindowBridgeMain.createClientWindowTool(WindowBridgeMain.browserWindowMain, data);
                info = {
                    info       : result,
                    coordinates: data.coordinates,
                    templateID : data.templateID
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.CREATE_CONTEXT_MENU_WINDOW)
            {
                const result = WindowBridgeMain.createClientContextMenu(WindowBridgeMain.browserWindowMain, data);
                info = {
                    info       : result,
                    coordinates: data.coordinates,
                    templateID : data.templateID
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.OPEN_CONTEXT_MENU_WINDOW)
            {
                const result = WindowBridgeMain.showClientContextMenu(WindowBridgeMain.browserWindowMain, data);
                info = {
                    info       : result,
                    coordinates: data
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.HIDE_CONTEXT_MENU)
            {
                let result = WindowBridgeMain.hideClientContextMenu(WindowBridgeMain.browserWindowMain, data);
                result = result || {success: false};
                info = {
                    info   : result,
                    message: result.success ? "Contextual Menu successfully closed" : "Failed operation on contextual menu"
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.DESTROY_CONTEXT_MENU)
            {
                let result = WindowBridgeMain.destroyClientContextMenu(WindowBridgeMain.browserWindowMain, data);
                result = result || {success: false};
                info = {
                    info   : result,
                    message: result.success ? "Contextual Menu successfully closed" : "Failed operation on contextual menu"
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.SET_IGNORE_MOUSE_EVENT_STATUS)
            {
                let res = WindowBridgeMain.contextMenuInstance.setIgnoreMouseEvents(data.enable);
                res = res || {success: false};
                info = {
                    info   : res,
                    success: res.success
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.SEND_WINDOW_STATUS)
            {
                if (!WindowBridgeMain.contextMenuInstance)
                {
                    console.log("No context menu instance created yet");
                    return JSON.stringify({success: false});
                }
                let res = WindowBridgeMain.contextMenuInstance.askDOMContextMenuToProcessMainRendererInfo(data);
                res = res || {success: false};
                info = {
                    info   : res,
                    success: res.success
                };
            }
            else if (command === PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.DUMMY_KEY)
            {
                let res = WindowBridgeMain.contextMenuInstance.askDOMContextMenuToProcessMainRendererInfo(data);
                res = res || {success: false};
                info = {
                    info   : res,
                    success: res.success
                };
            }
        }
        catch (e)
        {
            console.error(e);
            return JSON.stringify({success: false, info});
        }

        return JSON.stringify(info);
    }

    static lookIntoItems(role, items)
    {
        for (let i = 0; i < items.length; ++i)
        {
            const item = items[i];
            if (!item)
            {
                continue;
            }

            if (item.submenu)
            {
                const res = WindowBridgeMain.lookIntoItems(role, item.submenu.items);
                if (res)
                {
                    return res;
                }
            }

            if (item.role === role)
            {
                return item;
            }
        }
    }

    static getMenuitemFromNativeMenu(role, nativeMenu)
    {
        if (!role || !role.length)
        {
            return;
        }

        const items = nativeMenu.items;
        return WindowBridgeMain.lookIntoItems(role, items);
    }

    static getHandlerByTemplateEntryKey(templateEntryKey, templateID)
    {
        const templateProp = TemplateLoader.getTemplatePropByID(templateID);
        if (!templateProp)
        {
            LibUtils.log(`No click handler found on [${templateID}]`);
            return null;
        }

        const found = TemplateLoader.getTemplateRef(templateProp.content, templateEntryKey);
        return found.entry;
    }

    static convertRendererPayload(payload)
    {
        let data/*, dataCommand, domMenuItem, userData*/;

        try
        {
            data = JSON.parse(payload);
            const domMenuItem = data.domMenuItem;
            const dataCommand = data.dataCommand;
            const userData = data.userData;
            const templateID = data.templateID;
            const selectedTemplate = data.selectedTemplate;
            return {domMenuItem, dataCommand, userData, templateID, selectedTemplate};
        }
        catch (e)
        {
            console.error("Error: Incorrect data", e);
        }


        return {domMenuItem: {}, dataCommand: {}, userData: {}, templateID: {}};
    }

    static async onRenderersCommand(event, payload)
    {
        try
        {
            const responseBack = {
                result: ""
            };

            const {
                domMenuItem,
                dataCommand,
                userData,
                templateID,
                selectedTemplate
            } = WindowBridgeMain.convertRendererPayload(payload);

            if (dataCommand && dataCommand.command !== PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN.SET_IGNORE_MOUSE_EVENT_STATUS)
            {
                LibUtils.log("dataCommand = ", dataCommand);
            }

            /** @see PRIMARY_RENDERER_TO_CONTEXT_OR_MAIN **/
            if (dataCommand)
            {
                let command = dataCommand.command;
                let data = dataCommand.data;
                if (command)
                {
                    const info = await WindowBridgeMain.executeCommandWithinMainProcessEnvironment(command, data);
                    LibUtils.log(`Response command [${command}] = `, info);

                    event.returnValue = info;
                    return info;
                }
            }

            if (!domMenuItem)
            {
                console.error("No valid data received");
                event.returnValue = false;
                return;
            }

            const templateKey = domMenuItem[SPECIAL_CONSTANTS.templateEntryKeyString];

            if (selectedTemplate && selectedTemplate.id)
            {
                try
                {
                    const handler = WindowBridgeMain.getHandlerByTemplateEntryKey(templateKey, selectedTemplate.id);
                    if (handler && handler.click)
                    {
                        const {MenuItem} = require("electron");
                        const menuitem = new MenuItem(domMenuItem);
                        menuitem.userData = userData;
                        handler.click && handler.click(menuitem, WindowBridgeMain.browserWindowMain, {
                            shiftKey              : false,
                            ctrlKey               : false,
                            altKey                : false,
                            metaKey               : false,
                            triggeredByAccelerator: false
                        }, userData);

                        event.returnValue = true;
                        return;
                    }
                }
                catch (e)
                {
                    console.error(e);
                }
            }

            // --------------------------------------------------
            // Get Handler from Role
            // --------------------------------------------------
            // Recherche by role
            let role = domMenuItem.role;
            if (role)
            {
                const nativeMenu = WindowBridgeMain.nativeMenus[templateID];
                if (!nativeMenu)
                {
                    console.error("Could not find where a menuitem belong");
                    event.returnValue = false;
                    return;
                }

                const menuitem = WindowBridgeMain.getMenuitemFromNativeMenu(role, nativeMenu);

                // Add two new roleImageText, restore and maximise
                if (!menuitem)
                {
                    if ("restore" === role)
                    {
                        if (WindowBridgeMain.browserWindowMain.isMaximized())
                        {
                            WindowBridgeMain.browserWindowMain.restore();
                        }
                    }
                    else if ("maximize" === role)
                    {
                        if (!WindowBridgeMain.browserWindowMain.isMaximized())
                        {
                            WindowBridgeMain.browserWindowMain.maximize();
                        }
                    }

                    responseBack.success = true;
                    responseBack.result = {maximized: WindowBridgeMain.browserWindowMain.isMaximized()};
                    responseBack.windowState1 = {maximized: WindowBridgeMain.browserWindowMain.isMaximized()};
                    event.returnValue = JSON.stringify(responseBack);
                    return JSON.stringify(responseBack);
                }

                try
                {
                    menuitem.click(menuitem, WindowBridgeMain.browserWindowMain, {
                        shiftKey              : false,
                        ctrlKey               : false,
                        altKey                : false,
                        metaKey               : false,
                        triggeredByAccelerator: false
                    });

                    event.returnValue = true;
                }
                catch (e)
                {
                    console.error(e);
                    event.returnValue = new Error(e);
                    return;
                }

                LibUtils.log("Orphan menuitem detected");

                event.returnValue = false;


            }
        }
        catch (e)
        {
            console.error("E356466533435635:", e);
        }

    }

    static listenToContextRendererCommands()
    {
        debugger;
        const {ipcMain} = require("electron");

        ipcMain.handle(SPECIAL_CONSTANTS.idBridgeContextRendererToMainProcess, WindowBridgeMain.onRenderersCommand.bind(this));
    }

    static listenToMainRendererCommands(browserWindow)
    {
        try
        {
            const {ipcMain} = require("electron");

            WindowBridgeMain.browserWindowMain = browserWindow;

            WindowBridgeMain.browserWindowMain.on("closed", function ()
            {
                WindowBridgeMain.browserWindowMain = null;
            });

            ipcMain.on(SPECIAL_CONSTANTS.idBridgeMainRendererToMainProcess, WindowBridgeMain.onRenderersCommand.bind(this));
        }
        catch (e)
        {
            console.error(e);
        }
    }

}

module.exports = WindowBridgeMain;