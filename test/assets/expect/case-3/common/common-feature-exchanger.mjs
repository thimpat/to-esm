import DATA_EXCHANGE_INFO  from "./data-exchanger.mjs";
import {DIRECTION, MESSAGE_TYPE, SYSTEM_TYPE}  from "./specificities.mjs";



// ----

/**
 * @class CommonFeatureExchanger
 */
class CommonFeatureExchanger
{
    // One exchanger to send then receive data
    // Another one to receive then send back a response
    $exchangers = {};
    readyForExchange = false;

    maxAttempts = 10;
    intervalDetect = 200;

    indexer = 0;

    constructor()
    {
    }

    /**
     * @abstract
     * @returns {Promise<void>}
     */
    async init(data = {})
    {
        throw new Error(`[DATA_EXCHANGER] : (1160) The method ${this.init.name} must be overridden ${data}`);
    }

    // =====================================================
    // Naming normalisers
    // =====================================================
    isDataIndexed(rawData)
    {
        return (typeof rawData === "object" && rawData.hasOwnProperty("id") && rawData.hasOwnProperty("processed")
            && rawData.hasOwnProperty("processedBy") && rawData.hasOwnProperty("data") && rawData.hasOwnProperty("dataType"));
    }

    isDataPacked(data)
    {
        return (data && data.hasOwnProperty("fullResponse"));
    }

    packData(rawData)
    {
        if (this.isDataPacked(rawData))
        {
            console.error("[DATA_EXCHANGER] : (1107) Data are already packed. They should not.");
            return rawData;
        }

        if (!this.isDataIndexed(rawData))
        {
            console.error("[DATA_EXCHANGER] : (1103) Data are not packable.");
            return null;
        }

        const data = this.extractData(rawData);
        return {
            fullResponse: rawData,
            response: data
        };
    }

    unpackData(rawData)
    {
        if (!this.isDataPacked(rawData))
        {
            console.trace();
            console.error(`[DATA_EXCHANGER] : (1106) Data are not packed => [${JSON.stringify(rawData)}]`);
            return null;
        }

        return rawData.fullResponse;
    }

    /**
     *
     * @param rawData
     * @param processed
     * @param processedBy
     * @returns {{processed: boolean, data: *, id: number, processedBy: string}|*}
     */
    indexData(rawData, {processed = false} = {})
    {
        let indexedData = rawData;

        // rawData is not formatted yet
        if (!this.isDataIndexed(rawData))
        {
            indexedData = {
                id         : ++this.indexer,
                processedBy: SYSTEM_TYPE.UNKNOWN,
                processed  : false,
                data       : rawData,
                dataType   : MESSAGE_TYPE.MESSAGE
            };

            return indexedData;
        }

        const {currentSystem} = this.getSendingInfo();

        indexedData.processed = indexedData.processed || processed;
        indexedData.processedBy = currentSystem;
        indexedData.dataType = MESSAGE_TYPE.RESPONSE;

        return indexedData;
    }

    extractData(rawData)
    {
        if (!this.isDataIndexed(rawData))
        {
            return rawData;
        }

        return rawData.data;
    }

    /**
     * Remove special characters.
     * @param channel
     * @returns {*}
     */
    static sanitizeChannelName(channel)
    {
        try
        {
            return channel.replace(/[^a-zA-Z0-9-_.]/g, "");
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1115) Failed to sanitize data => ", e);
        }
    }

    /**
     * Generate a custom event name to be used for DOM event messages between the PROXY and the RENDERER
     * @param channel
     * @returns {string}
     */
    static getEventNameFromMessageChannel(channel)
    {
        channel = CommonFeatureExchanger.sanitizeChannelName(channel);
        return DATA_EXCHANGE_INFO.PREFIX_MESSAGE + channel;
    }

    /**
     * Generate a custom event name for listener of type {once: true}
     * @param channel
     * @returns {string}
     */
    static getEventNameBriefFromMessageChannel(channel)
    {
        channel = CommonFeatureExchanger.getEventNameFromMessageChannel(channel);
        return channel + "-BRIEF";
    }

    /**
     * Custom event name to be used for responses
     * @param channel
     * @returns {string}
     */
    static getEventNameFromResponseChannel(channel)
    {
        channel = CommonFeatureExchanger.sanitizeChannelName(channel);
        return DATA_EXCHANGE_INFO.PREFIX_RESPONSE + channel;
    }

    /**
     * Exchanger Tag attribute name where data will be written for messages
     * @param channel
     * @returns {string}
     */
    getChannelMessageAttributeName(channel)
    {
        const channelName = CommonFeatureExchanger.sanitizeChannelName(channel);
        return `${DATA_EXCHANGE_INFO.CHANNEL_MESSAGE_PREFIX}${channelName}`;
    }

    /**
     * Exchanger Tag attribute name where data will be written for responses
     * @param channel
     * @returns {string}
     */
    getChannelResponseAttributeName(channel)
    {
        const channelName = CommonFeatureExchanger.sanitizeChannelName(channel);
        return `${DATA_EXCHANGE_INFO.CHANNEL_RESPONSE_PREFIX}${channelName}`;
    }

    // =====================================================
    // Exchangers operations
    // =====================================================
    /**
     * {@link revealExchangers()}
     */
    hideExchanger()
    {
        // this.#$exchanger.style.opacity = "0";
        // this.#$exchanger.style.visibility = "hidden";
        // this.#$exchanger.position = "absolute";
        // this.#$exchanger.left = "-100px";
        // this.#$exchanger.width = "100px";
        // this.#$exchanger.top = "-100px";
        // this.#$exchanger.height = "0";
        // this.#$exchanger.overflow = "hidden";
    }

    revealExchangers()
    {
        const style = {
            background: "rgb(250 235 215 / 80%)",
            border    : "8px solid black",
            color     : "black",
            fontFamily: "sans-serif",
            fontSize  : "0.8rem",
            height    : "80px",
            opacity   : "1",
            padding   : "4px",
            visibility: "visible",
            position  : "absolute",
            bottom    : "28px",
            overflow  : "visible",
            right     : "20px",
            width     : "400px",
            zIndex    : "9999"
        };

        Object.assign(this.$exchangers[DIRECTION.UP].style, style);
        Object.assign(this.$exchangers[DIRECTION.DOWN].style, style);
    }


    /**
     * Delete data for a channel.
     */
    clearChannel(channelName, direction, messageType)
    {
        const attributeName = messageType === MESSAGE_TYPE.RESPONSE ?
            this.getChannelResponseAttributeName(channelName) :
            this.getChannelMessageAttributeName(channelName);
        this.$exchangers[direction].removeAttribute(attributeName);
    }

    // =====================================================
    // Data operations
    // =====================================================
    /**
     * Serialize data (before sending to rendering)
     * @param data
     * @returns {string}
     * @todo Add super fast compression?
     */
    static formatData(data)
    {
        try
        {
            return JSON.stringify(data);
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1096) Failed to format data => ", e);
        }
    }

    /**
     * Un-serialize data
     * @param data
     * @returns {any}
     */
    static decodeData(data)
    {
        try
        {
            return JSON.parse(data);
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1995) Failed to format data => ", e);
        }

        return null;
    }

    // =====================================================
    //
    // =====================================================
    /**
     * Write data on the exchanger div.
     * @param channelName
     * @param {*} data
     * @param {DIRECTION} direction
     * @param {MESSAGE_TYPE.MESSAGE|MESSAGE_TYPE.RESPONSE} messageType
     */
    writeDataToExchangerTag(channelName, data, direction, messageType)
    {
        try
        {
            const {currentSystem, distantSystem, style} = this.getSendingInfo();
            if (!this.isDataIndexed(data))
            {
                console.error(`[DATA_EXCHANGER] ${currentSystem}: (1082) Operation forbidden. Data to write on exchangers must be indexed.`);
                return;
            }

            const formattedData = CommonFeatureExchanger.formatData(data);
            const attributeName = messageType === MESSAGE_TYPE.RESPONSE ?
                this.getChannelResponseAttributeName(channelName) :
                this.getChannelMessageAttributeName(channelName);

            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1022) ✒️ Preparing message for ${distantSystem} (=> exchanger [${direction}]) on DOM attribute (${attributeName})`, style);
            this.$exchangers[direction].setAttribute(attributeName, formattedData);
            console.log(`[DATA_EXCHANGER] ${currentSystem}: (1031) Exchanger content => `, this.$exchangers[direction]/*, this.$exchangers[DIRECTION.DOWN]*/);
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] PRELOADER: (1023) E565654654321231: Fail to format data => ", e);
        }
    }

    /**
     * @param channelName
     * @param direction
     * @param messageType
     */
    readMessageChannelData(channelName, direction, messageType)
    {
        try
        {
            const {currentSystem} = this.getSendingInfo();

            const attributeName = messageType === MESSAGE_TYPE.RESPONSE ?
                this.getChannelResponseAttributeName(channelName) :
                this.getChannelMessageAttributeName(channelName);

            if (!this.$exchangers[direction])
            {
                console.error(`[DATA_EXCHANGER] ${currentSystem}: (1026) Could not find exchanger [${direction}]`);
                return;
            }

            const raw = this.$exchangers[direction].getAttribute(attributeName);
            if (!raw || raw === "undefined")
            {
                console.error(`[DATA_EXCHANGER] ${currentSystem}: (1112) Invalid data [${direction}]`);
                return;
            }

            this.clearChannel(channelName, direction, messageType);

            const decodedData = CommonFeatureExchanger.decodeData(raw);
            if (!decodedData)
            {
                console.error(`[DATA_EXCHANGER] ${currentSystem}: (1113) Invalid data [${direction}]`);
            }

            return decodedData;
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1098)", e);
        }
    }

    isWelcomeMessage(data)
    {
        return data.id && data.data && data.data.status && data.data.status.indexOf("WELCOME:") > -1;
    }

    readMessage(channelName)
    {
        try
        {
            const {listeningMessageDirection, currentSystem, style} = this.getSendingInfo();
            let data = this.readMessageChannelData(channelName, listeningMessageDirection, MESSAGE_TYPE.MESSAGE);
            if (!this.isDataIndexed(data))
            {
                console.error(`[DATA_EXCHANGER] ${currentSystem}: (1090) Data are not indexed.`);
                return null;
            }
            data = this.indexData(data, {processed: true});

            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1065) => ${JSON.stringify(data)}`, style);
            return data;
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] PRELOADER: Failed to read RENDERER message", e);
        }
    }

    readResponse(channelName)
    {
        try
        {
            const {listeningResponseDirection, currentSystem, style} = this.getSendingInfo();
            const data = this.readMessageChannelData(channelName, listeningResponseDirection, MESSAGE_TYPE.RESPONSE);
            if (!this.isDataIndexed(data))
            {
                console.error("[DATA_EXCHANGER] PRELOADER: (1087) Invalid RESPONSE. Data are not indexed.");
                return null;
            }
            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1066) => ${JSON.stringify(data)}`, style);
            return data;
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] PRELOADER: Failed to read RENDERER message", e);
        }
    }

    writeMessage(channelName, data)
    {
        try
        {
            const {sendingMessageDirection, currentSystem, distantSystem, style} = this.getSendingInfo();
            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1066) => Target: ${distantSystem} ${JSON.stringify(data)}`, style);
            this.writeDataToExchangerTag(channelName, data, sendingMessageDirection, MESSAGE_TYPE.MESSAGE);
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : 1099", e);
        }
    }

    writeResponse(channelName, data)
    {
        try
        {
            const {sendingResponseDirection, currentSystem, style} = this.getSendingInfo();
            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1066) => ${JSON.stringify(data)}`, style);
            this.writeDataToExchangerTag(channelName, data, sendingResponseDirection, MESSAGE_TYPE.RESPONSE);
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1100)");
        }
    }

    // =====================================================
    // Waiters
    // =====================================================
    onTimeOut(handler, channelName)
    {
        try
        {
            const customEventMessage = CommonFeatureExchanger.getEventNameFromMessageChannel(channelName);
            this.$exchangers[DIRECTION.UP].removeEventListener(customEventMessage, handler);
            console.error("[DATA_EXCHANGER] PRELOADER: (1017) ❌ Failed to connect exchangers.");
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1101)", e);
        }
    }

    /**
     * Place a temporary listener with timeout on the required exchanger.
     * @param channelName
     * @param distantSystem
     * @param messageType
     * @param handler
     * @param timeout
     */
    attachHelloEventHandler(channelName, distantSystem, messageType, handler, timeout)
    {
        try
        {
            timeout = timeout || this.maxAttempts * (this.intervalDetect + 200) + 2000;

            // Remove temporary listener in case of failure
            this.timerPreloaderConnectID = setTimeout(this.onTimeOut.bind(this, handler, channelName), timeout);

            const customEventMessage = CommonFeatureExchanger.getEventNameFromMessageChannel(channelName);
            const {currentSystem, distantSystem, listeningMessageDirection, style} = this.getSendingInfo();

            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1030) 🎧 Placing TEMPORARY listener on exchanger [${
                listeningMessageDirection}] for capturing ${distantSystem} messages [${customEventMessage}]`, style);

            // Add a listener that waits for the message sent by the renderer.
            this.$exchangers[listeningMessageDirection].addEventListener(customEventMessage, handler, {once: true});

            // To inform the RENDERER that the event has been attached
            this.$exchangers[listeningMessageDirection].setAttribute("data-ready", "yes");
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] E3146464654545: (1047)", e);
        }
    }

    // =====================================================
    // Listeners
    // =====================================================
    /**
     * @abstract
     * @returns {{distantSystem: SYSTEM_TYPE, currentSystem: SYSTEM_TYPE, sendingMessageDirection: DIRECTION,
     *      listeningResponseDirection: DIRECTION, sendingResponseDirection: DIRECTION, listeningMessageDirection:
     *     DIRECTION, style: string}}
     */
    getSendingInfo()
    {
        throw new Error(`[DATA_EXCHANGER] : (1103) The method ${this.getSendingInfo.name} must be overridden.`);
    }

    // =====================================================
    // Senders
    // =====================================================
    /**
     * Send a message to the RENDERER or the PRELOADER.
     * If the message is sent to the PRELOADER it will be relayed to MAIN.
     * @param channelName
     * @param rawData
     * @param waitForResponse
     * @returns {Promise<unknown>}
     * @see Caller (via IPC) {@link DomDataExchanger.addIPCRelay}
     * @see Target listener {@link DomDataExchanger.addDOMListener}
     * @see Target listener on the Preloader {@link ProxyExchanger.addDOMRelay}
     */
    sendDOMMessage(channelName, rawData, waitForResponse = false)
    {
        console.log(`[DATA_EXCHANGER] : (1169) DATA = [${JSON.stringify(rawData)}]`);
        return new Promise(function (rawData, channelName, resolve, reject)
        {
            try
            {
                let timerID = 0;
                const timeout = 600000;     // Six minutes

                /**
                 *
                 * @param channelName
                 */
                const onResponse = function (channelName)
                {
                    try
                    {
                        clearTimeout(timerID);
                        timerID = 0;

                        const fullResponse = this.readResponse(channelName);
                        const response = this.extractData(fullResponse);
                        resolve(response);
                    }
                    catch (e)
                    {
                        console.error("[DATA_EXCHANGER]: (1052) Failed to read exchanger data", e);
                        reject(e);
                    }
                };

                const {distantSystem, currentSystem, sendingMessageDirection, listeningResponseDirection, style} = this.getSendingInfo();

                const data = this.indexData(rawData);

                const customEventMessage = CommonFeatureExchanger.getEventNameFromMessageChannel(channelName);

                // Custom event sent to preloader for reading responses
                const customEventResponse = CommonFeatureExchanger.getEventNameFromResponseChannel(channelName);

                let responseSymbol = "";

                // --------------------------------------
                // Listen to response
                // --------------------------------------
                if (waitForResponse)
                {
                    responseSymbol = "🙋 ";

                    /**
                     * Cancel failure
                     */
                    timerID = setTimeout(function (channelName, listeningResponseDirection, customEventResponse)
                    {
                        try
                        {
                            const error = new Error(`[DATA_EXCHANGER] ${currentSystem}: (1127) Could not send message to channel [${channelName}]`);
                            this.$exchangers[listeningResponseDirection].removeEventListener(customEventResponse, onResponse);
                            reject(error);
                            return;
                        }
                        catch (e)
                        {
                            reject("[DATA_EXCHANGER] : (1128)", e);
                        }
                    }.bind(this, channelName, listeningResponseDirection, customEventResponse), timeout);

                    /**
                     * Capture response
                     */
                    this.$exchangers[listeningResponseDirection].addEventListener(customEventResponse, onResponse.bind(this, channelName), {once: true});
                }

                // --------------------------------------
                // Send message
                // --------------------------------------
                // Write data to the exchanger
                this.writeMessage(channelName, data);

                const sendSymbol = this.isWelcomeMessage(data) ? "🚀🚀🚀" : "📨 =============>";

                console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1019) ${sendSymbol} ${responseSymbol}Sending ${
                        MESSAGE_TYPE.MESSAGE} ${sendingMessageDirection} to ${distantSystem} [${customEventMessage}]: ${JSON.stringify(data)}`,
                    style);

                // Inform target (RENDERER or PRELOADER) there is a message
                const customEvent = new CustomEvent(customEventMessage);

                /**
                 * If sendindMessageDirection is "UP", there will be an IPC call to reach MAIN.
                 * @see Target {@link ProxyExchanger.addDOMRelay}
                 */
                this.$exchangers[sendingMessageDirection].dispatchEvent(customEvent);
                // When we don't require an answer after sending data, we return data in a "pack" formatted way. But, they
                // should not be normally used. It's just for debugging purpose.
                // We can resolve the promise with no data.
                if (!waitForResponse)
                {
                    // resolve({response: null, fullResponse: null, noResponseRequired: true});
                    resolve({noResponseRequired: true});
                }
            }
            catch (e)
            {
                console.error("[DATA_EXCHANGER] E235644565456: (1049)", e);
                reject(e);
            }
        }.bind(this, rawData, channelName));
    }

    /**
     * @async
     * @abstract
     * @param channelName
     * @param data
     */
    async sendIPCMessage(channelName, data)
    {
        throw new Error(`[DATA_EXCHANGER] : (1105) The method ${this.sendIPCMessage.name} must be overridden. [${channelName}: ${data}]`);
    }

    async sendMessage(channelName, rawData, waitForResponse = false)
    {
        try
        {
            const {currentSystem} = this.getSendingInfo();
            if (currentSystem === SYSTEM_TYPE.RENDERER)
            {
                return await this.sendDOMMessage(channelName, rawData, waitForResponse);
            }
            else if (currentSystem === SYSTEM_TYPE.MAIN)
            {
                return await this.sendIPCMessage(channelName, rawData);
            }
            else if (currentSystem === SYSTEM_TYPE.PRELOADER)
            {
                console.error("[DATA_EXCHANGER] : (1110) The PRELOADER cannot send messages.");
            }
            else
            {
                console.error("[DATA_EXCHANGER] : (1109) Unsupported operation.");
            }
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1109)", e);
        }
    }

    /**
     * Send a message to the RENDERER or the PRELOADER
     * @param channelName
     * @param {*} data
     * @returns {Promise<void>}
     * @see Target {@link CommonFeatureExchanger.sendDOMMessage}
     */
    async sendResponseToTarget(channelName, data)
    {
        try
        {
            const {currentSystem, distantSystem, sendingResponseDirection, style} = this.getSendingInfo();

            // Custom event sent to preloader for reading responses
            const customEventResponse = CommonFeatureExchanger.getEventNameFromResponseChannel(channelName);

            // --------------------------------------
            // Send response
            // --------------------------------------
            // Write data to the exchanger
            this.writeResponse(channelName, data);

            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1050) 📨 <============= 🙋 Sending response ${
                    MESSAGE_TYPE.MESSAGE} ${sendingResponseDirection} to ${distantSystem} [${customEventResponse}]: ${JSON.stringify(data)}`,
                style);

            // Inform target (RENDERER or PRELOADER) there is a message
            const customEvent = new CustomEvent(customEventResponse);
            this.$exchangers[sendingResponseDirection].dispatchEvent(customEvent);

            console.log(`%c[DATA_EXCHANGER] ${distantSystem}: (1053) Message sent = [${JSON.stringify(data)}]`, style);
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] E235644565459: (1051)", e);
        }
    }

    sleep(delay)
    {
        return new Promise(function (resolve)
        {
            setTimeout(function ()
            {
                resolve();
            }, delay);
        });
    }

    async testChannel(channelName, {occurrences = 100, random = false} = {})
    {
        try
        {
            const {currentSystem, distantSystem, style} = this.getSendingInfo();

            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1111) ======================================================================================`, style);
            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1112) We are about to send ${occurrences} messages from ${currentSystem} to ${distantSystem}`, style);
            console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1113) ======================================================================================`, style);

            const is = Object.keys(Object.assign({}, Array(occurrences).fill(0)));

            for (const i of is)
            {
                const randomDelay = random ? Math.floor(Math.random() * 20) : 0;
                await this.sleep(randomDelay);

                const keyString = `${currentSystem}${DATA_EXCHANGE_INFO.SUFFIX_TEST}`
                const valString = `From ${currentSystem} call n ${i}`

                const response = await this.sendMessage(channelName, {[keyString]: valString}, true);

                if (!response)
                {
                    console.error(`[DATA_EXCHANGER] : (1201) Test failed. No response on ${i}`);
                    return false
                }

                if (!response.hasOwnProperty(SPECIAL_CONSTANTS.TEST_ORIGINAL_CALLER_KEY_NAME))
                {
                    console.error("[DATA_EXCHANGER] : (1202) Test failed. Invalid response format");
                    return false
                }

                if (response.RendererResponse !== SPECIAL_CONSTANTS.TEST_RESPONSE_STRING)
                {
                    console.error(`[DATA_EXCHANGER] : (1203) Test failed. Invalid response. [${
                        response.RendererResponse}] !== [${SPECIAL_CONSTANTS.TEST_RESPONSE_STRING}]`);
                    return false
                }

                const sentData = response[SPECIAL_CONSTANTS.TEST_ORIGINAL_CALLER_KEY_NAME]
                if (!sentData)
                {
                    console.error("[DATA_EXCHANGER] : (1204) Test failed. Could not retrieve sent data.");
                    return false
                }

                try
                {
                    const json = JSON.parse(sentData)
                    if (json[keyString] !== valString)
                    {
                        console.error("[DATA_EXCHANGER] : (1206) Test failed. Data loss.");
                        return false
                    }

                }
                catch (e)
                {
                    console.error("[DATA_EXCHANGER] : (1209) Test failed. Sent data were not serialised.");
                    return false
                }


                const arrow = currentSystem === SYSTEM_TYPE.RENDERER ? "←→" : "<===>";
                console.log(`%c[DATA_EXCHANGER] ${currentSystem}: (1071) Channel: ${channelName} ${arrow} ${currentSystem} to ${distantSystem}: ${JSON.stringify(response)}`,
                    DATA_EXCHANGE_INFO.CONSOLE_ESM);
            }

            return true
        }
        catch (e)
        {
            console.error("[DATA_EXCHANGER] : (1200)", e);
        }
    }

    async testMultiChannels({occurrences = 20, random = false} = {})
    {
        const is = Object.keys(Object.assign({}, Array(SPECIAL_CONSTANTS.TEST_CHANNELS_NUMBER).fill(0)));
        for (const i of is)
        {
            const channelName = SPECIAL_CONSTANTS.ChannelTestPrefix + i;
            await this.addListener(channelName, function (data)
            {
                console.log(`%c[DATA_EXCHANGER] RENDERER: (1197) Executing user handler: ${JSON.stringify(data)}`, DATA_EXCHANGE_INFO.CONSOLE_ESM);
                return {RendererResponse: SPECIAL_CONSTANTS.TEST_RESPONSE_STRING, [SPECIAL_CONSTANTS.TEST_ORIGINAL_CALLER_KEY_NAME]: JSON.stringify(data)};
            }.bind(this));
        }

        setTimeout(async function ()
        {
            const is = Object.keys(Object.assign({}, Array(SPECIAL_CONSTANTS.TEST_CHANNELS_NUMBER).fill(0)));
            for (const i of is)
            {
                const channelName = SPECIAL_CONSTANTS.ChannelTestPrefix + i;
                const result = await this.testChannel(channelName, {random, occurrences});
                if (!result)
                {
                    throw new Error(`[DATA_EXCHANGER] : (1210) Multi Channel Test Failed`)
                }
            }

        }.bind(this), 0);
    }

    /**
     *
     * @param channelName
     * @param param2
     * @returns {Promise<void>}
     */
    async addListener(channelName, param2)
    {
        throw new Error(`[DATA_EXCHANGER] : (1160) The method ${this.addListener.name} must be overridden ${channelName} ${param2}`);
    }
}

export default CommonFeatureExchanger;