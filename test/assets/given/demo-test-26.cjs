/**
 * Only for test. This is just an extract of an npm module.
 * Enough to break the parser.
 * **/
/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "^Readable$" }] */

'use strict';

const EventEmitter = require('events');
const https = require('https');
const http = require('http');
const net = require('net');
const tls = require('tls');
const { randomBytes, createHash } = require('crypto');
const { Readable } = require('stream');
const { URL } = require('url');

const PerMessageDeflate = require('./permessage-deflate');
const Receiver = require('./receiver');
const Sender = require('./sender');
const {
    BINARY_TYPES,
    EMPTY_BUFFER,
    GUID,
    kForOnEventAttribute,
    kListener,
    kStatusCode,
    kWebSocket,
    NOOP
} = require('./constants');
const {
    EventTarget: { addEventListener, removeEventListener }
} = require('./event-target');
const { format, parse } = require('./extension');
const { toBuffer } = require('./buffer-util');

const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
const subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
const protocolVersions = [8, 13];
const closeTimeout = 30 * 1000;

class WebSocket extends EventEmitter {
    constructor(address, protocols, options) {
        super();

    }

    /**
     * @type {Function}
     */
    /* istanbul ignore next */
    get onerror() {
        return null;
    }

    /**
     * @type {Function}
     */
    /* istanbul ignore next */
    get onopen() {
        return null;
    }

    /**
     * @type {Function}
     */
    /* istanbul ignore next */
    get onmessage() {
        return null;
    }

    /**
     * @type {String}
     */
    get protocol() {
        return this._protocol;
    }

    /**
     * @type {Number}
     */
    get readyState() {
        return this._readyState;
    }

    /**
     * @type {String}
     */
    get url() {
        return this._url;
    }

    /**
     * Emit the `'close'` event.
     *
     * @private
     */
    emitClose() {
        if (!this._socket) {
            this._readyState = WebSocket.CLOSED;
            this.emit('close', this._closeCode, this._closeMessage);
            return;
        }

    }

    /**
     * Start a closing handshake.
     *
     *          +----------+   +-----------+   +----------+
     *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
     *    |     +----------+   +-----------+   +----------+     |
     *          +----------+   +-----------+         |
     * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
     *          +----------+   +-----------+   |
     *    |           |                        |   +---+        |
     *                +------------------------+-->|fin| - - - -
     *    |         +---+                      |   +---+
     *     - - - - -|fin|<---------------------+
     *              +---+
     *
     * @param {Number} [code] Status code explaining why the connection is closing
     * @param {(String|Buffer)} [data] The reason why the connection is
     *     closing
     * @public
     */
    close(code, data) {
        if (this.readyState === WebSocket.CLOSED) return;
        if (this.readyState === WebSocket.CONNECTING) {
            const msg = 'WebSocket was closed before the connection was established';
            return abortHandshake(this, this._req, msg);
        }

        if (this.readyState === WebSocket.CLOSING) {
            if (
                this._closeFrameSent &&
                (this._closeFrameReceived || this._receiver._writableState.errorEmitted)
            ) {
                this._socket.end();
            }

            return;
        }

        this._readyState = WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err) => {
            //
            // This error is handled by the `'error'` listener on the socket. We only
            // want to know if the close frame has been sent here.
            //
            if (err) return;

            this._closeFrameSent = true;

            if (
                this._closeFrameReceived ||
                this._receiver._writableState.errorEmitted
            ) {
                this._socket.end();
            }
        });

        //
        // Specify a timeout for the closing handshake to complete.
        //
        this._closeTimer = setTimeout(
            this._socket.destroy.bind(this._socket),
            closeTimeout
        );
    }

    /**
     * Pause the socket.
     *
     * @public
     */
    pause() {
        if (
            this.readyState === WebSocket.CONNECTING ||
            this.readyState === WebSocket.CLOSED
        ) {
            return;
        }

        this._paused = true;
        this._socket.pause();
    }

    /**
     * Forcibly close the connection.
     *
     * @public
     */
    terminate() {
        if (this.readyState === WebSocket.CLOSED) return;
        if (this.readyState === WebSocket.CONNECTING) {
            const msg = 'WebSocket was closed before the connection was established';
            return abortHandshake(this, this._req, msg);
        }

        if (this._socket) {
            this._readyState = WebSocket.CLOSING;
            this._socket.destroy();
        }
    }
}

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CONNECTING', {
    enumerable: true,
    value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} CONNECTING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CONNECTING', {
    enumerable: true,
    value: readyStates.indexOf('CONNECTING')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'OPEN', {
    enumerable: true,
    value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} OPEN
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'OPEN', {
    enumerable: true,
    value: readyStates.indexOf('OPEN')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSING', {
    enumerable: true,
    value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSING
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSING', {
    enumerable: true,
    value: readyStates.indexOf('CLOSING')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket
 */
Object.defineProperty(WebSocket, 'CLOSED', {
    enumerable: true,
    value: readyStates.indexOf('CLOSED')
});

/**
 * @constant {Number} CLOSED
 * @memberof WebSocket.prototype
 */
Object.defineProperty(WebSocket.prototype, 'CLOSED', {
    enumerable: true,
    value: readyStates.indexOf('CLOSED')
});

[
    'binaryType',
    'bufferedAmount',
    'extensions',
    'isPaused',
    'protocol',
    'readyState',
    'url'
].forEach((property) => {
    Object.defineProperty(WebSocket.prototype, property, { enumerable: true });
});

/**
 * Initialize a WebSocket client.
 *
 * @param {WebSocket} websocket The client to initialize
 * @param {(String|URL)} address The URL to which to connect
 * @param {Array} protocols The subprotocols
 * @param {Object} [options] Connection options
 * @param {Boolean} [options.followRedirects=false] Whether or not to follow
 *     redirects
 * @param {Function} [options.generateMask] The function used to generate the
 *     masking key
 * @param {Number} [options.handshakeTimeout] Timeout in milliseconds for the
 *     handshake request
 * @param {Number} [options.maxPayload=104857600] The maximum allowed message
 *     size
 * @param {Number} [options.maxRedirects=10] The maximum number of redirects
 *     allowed
 * @param {String} [options.origin] Value of the `Origin` or
 *     `Sec-WebSocket-Origin` header
 * @param {(Boolean|Object)} [options.perMessageDeflate=true] Enable/disable
 *     permessage-deflate
 * @param {Number} [options.protocolVersion=13] Value of the
 *     `Sec-WebSocket-Version` header
 * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
 *     not to skip UTF-8 validation for text and close messages
 * @private
 */
function initAsClient(websocket, address, protocols, options) {
}

/**
 * Emit the `'error'` and `'close'` event.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {Error} The error to emit
 * @private
 */
function emitErrorAndClose(websocket, err) {
    websocket._readyState = WebSocket.CLOSING;
    websocket.emit('error', err);
    websocket.emitClose();
}

/**
 * Create a `net.Socket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {net.Socket} The newly created socket used to start the connection
 * @private
 */
function netConnect(options) {
    options.path = options.socketPath;
    return net.connect(options);
}

/**
 * Create a `tls.TLSSocket` and initiate a connection.
 *
 * @param {Object} options Connection options
 * @return {tls.TLSSocket} The newly created socket used to start the connection
 * @private
 */
function tlsConnect(options) {
    options.path = undefined;

    if (!options.servername && options.servername !== '') {
        options.servername = net.isIP(options.host) ? '' : options.host;
    }

    return tls.connect(options);
}

/**
 * Abort the handshake and emit an error.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {(http.ClientRequest|net.Socket|tls.Socket)} stream The request to
 *     abort or the socket to destroy
 * @param {String} message The error message
 * @private
 */
function abortHandshake(websocket, stream, message) {
    websocket._readyState = WebSocket.CLOSING;

    const err = new Error(message);
    Error.captureStackTrace(err, abortHandshake);

    if (stream.setHeader) {
        stream.abort();

        if (stream.socket && !stream.socket.destroyed) {
            //
            // On Node.js >= 14.3.0 `request.abort()` does not destroy the socket if
            // called after the request completed. See
            // https://github.com/websockets/ws/issues/1869.
            //
            stream.socket.destroy();
        }

        stream.once('abort', websocket.emitClose.bind(websocket));
        websocket.emit('error', err);
    } else {
        stream.destroy(err);
        stream.once('error', websocket.emit.bind(websocket, 'error'));
        stream.once('close', websocket.emitClose.bind(websocket));
    }
}

/**
 * Handle cases where the `ping()`, `pong()`, or `send()` methods are called
 * when the `readyState` attribute is `CLOSING` or `CLOSED`.
 *
 * @param {WebSocket} websocket The WebSocket instance
 * @param {*} [data] The data to send
 * @param {Function} [cb] Callback
 * @private
 */
function sendAfterClose(websocket, data, cb) {
    if (data) {
        const length = toBuffer(data).length;

        //
        // The `_bufferedAmount` property is used only when the peer is a client and
        // the opening handshake fails. Under these circumstances, in fact, the
        // `setSocket()` method is not called, so the `_socket` and `_sender`
        // properties are set to `null`.
        //
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
    }

    if (cb) {
        const err = new Error(
            `WebSocket is not open: readyState ${websocket.readyState} ` +
            `(${readyStates[websocket.readyState]})`
        );
        cb(err);
    }
}

/**
 * The listener of the `Receiver` `'conclude'` event.
 *
 * @param {Number} code The status code
 * @param {Buffer} reason The reason for closing
 * @private
 */
function receiverOnConclude(code, reason) {
    const websocket = this[kWebSocket];

    websocket._closeFrameReceived = true;
    websocket._closeMessage = reason;
    websocket._closeCode = code;

    if (websocket._socket[kWebSocket] === undefined) return;

    websocket._socket.removeListener('data', socketOnData);
    process.nextTick(resume, websocket._socket);

    if (code === 1005) websocket.close();
    else websocket.close(code, reason);
}

/**
 * The listener of the `Receiver` `'drain'` event.
 *
 * @private
 */
function receiverOnDrain() {
    const websocket = this[kWebSocket];

    if (!websocket.isPaused) websocket._socket.resume();
}

/**
 * The listener of the `Receiver` `'error'` event.
 *
 * @param {(RangeError|Error)} err The emitted error
 * @private
 */
function receiverOnError(err) {
    const websocket = this[kWebSocket];

    if (websocket._socket[kWebSocket] !== undefined) {
        websocket._socket.removeListener('data', socketOnData);

        //
        // On Node.js < 14.0.0 the `'error'` event is emitted synchronously. See
        // https://github.com/websockets/ws/issues/1940.
        //
        process.nextTick(resume, websocket._socket);

        websocket.close(err[kStatusCode]);
    }

    websocket.emit('error', err);
}

/**
 * The listener of the `Receiver` `'finish'` event.
 *
 * @private
 */
function receiverOnFinish() {
    this[kWebSocket].emitClose();
}

/**
 * The listener of the `Receiver` `'message'` event.
 *
 * @param {Buffer|ArrayBuffer|Buffer[])} data The message
 * @param {Boolean} isBinary Specifies whether the message is binary or not
 * @private
 */
function receiverOnMessage(data, isBinary) {
    this[kWebSocket].emit('message', data, isBinary);
}

/**
 * The listener of the `Receiver` `'ping'` event.
 *
 * @param {Buffer} data The data included in the ping frame
 * @private
 */
function receiverOnPing(data) {
    const websocket = this[kWebSocket];

    websocket.pong(data, !websocket._isServer, NOOP);
    websocket.emit('ping', data);
}

/**
 * The listener of the `Receiver` `'pong'` event.
 *
 * @param {Buffer} data The data included in the pong frame
 * @private
 */
function receiverOnPong(data) {
    this[kWebSocket].emit('pong', data);
}

/**
 * Resume a readable stream
 *
 * @param {Readable} stream The readable stream
 * @private
 */
function resume(stream) {
    stream.resume();
}

/**
 * The listener of the `net.Socket` `'close'` event.
 *
 * @private
 */
function socketOnClose() {
    const websocket = this[kWebSocket];

    this.removeListener('close', socketOnClose);
    this.removeListener('data', socketOnData);
    this.removeListener('end', socketOnEnd);

    websocket._readyState = WebSocket.CLOSING;

    let chunk;

    //
    // The close frame might not have been received or the `'end'` event emitted,
    // for example, if the socket was destroyed due to an error. Ensure that the
    // `receiver` stream is closed after writing any remaining buffered data to
    // it. If the readable side of the socket is in flowing mode then there is no
    // buffered data as everything has been already written and `readable.read()`
    // will return `null`. If instead, the socket is paused, any possible buffered
    // data will be read as a single chunk.
    //
    if (
        !this._readableState.endEmitted &&
        !websocket._closeFrameReceived &&
        !websocket._receiver._writableState.errorEmitted &&
        (chunk = websocket._socket.read()) !== null
    ) {
        websocket._receiver.write(chunk);
    }

    websocket._receiver.end();

    this[kWebSocket] = undefined;

    clearTimeout(websocket._closeTimer);

    if (
        websocket._receiver._writableState.finished ||
        websocket._receiver._writableState.errorEmitted
    ) {
        websocket.emitClose();
    } else {
        websocket._receiver.on('error', receiverOnFinish);
        websocket._receiver.on('finish', receiverOnFinish);
    }
}

/**
 * The listener of the `net.Socket` `'data'` event.
 *
 * @param {Buffer} chunk A chunk of data
 * @private
 */
function socketOnData(chunk) {
    if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
    }
}

/**
 * The listener of the `net.Socket` `'end'` event.
 *
 * @private
 */
function socketOnEnd() {
    const websocket = this[kWebSocket];

    websocket._readyState = WebSocket.CLOSING;
    websocket._receiver.end();
    this.end();
}

/**
 * The listener of the `net.Socket` `'error'` event.
 *
 * @private
 */
function socketOnError() {
    const websocket = this[kWebSocket];

    this.removeListener('error', socketOnError);
    this.on('error', NOOP);

    if (websocket) {
        websocket._readyState = WebSocket.CLOSING;
        this.destroy();
    }
}
