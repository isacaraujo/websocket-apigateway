"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const websocket_1 = require("websocket");
const axios_1 = __importDefault(require("axios"));
const uniqid_1 = __importDefault(require("uniqid"));
const CONNECTED_URL = 'http://localhost:3001/connected';
const DISCONNECTED_URL = 'http://localhost:3001/disconnected';
const MESSAGE_URL = 'http://localhost:3001/message';
const httpServer = http_1.default.createServer((request, response) => {
    console.log(new Date(), `Received request for ${request.url}`);
    response.writeHead(404);
    response.end();
});
httpServer.listen(8080, () => {
    console.info(new Date(), 'Server is listening on port 8080');
});
const wsServer = new websocket_1.server({
    httpServer,
    autoAcceptConnections: false,
});
const connections = {};
wsServer.on('request', async (request) => {
    const connectionid = uniqid_1.default();
    let authToken;
    if (request.resourceURL.query && typeof request.resourceURL.query !== 'string') {
        const query = request.resourceURL.query;
        authToken = query['authToken'];
    }
    void axios_1.default.request({
        method: 'POST',
        url: CONNECTED_URL,
        headers: {
            Authorization: authToken,
            connectionid,
        },
    });
    const connection = request.accept('echo-protocol', request.origin);
    connection.on('message', async (message) => {
        const data = message.utf8Data;
        console.info(new Date(), 'receive message', data);
        void axios_1.default.request({
            method: 'POST',
            url: MESSAGE_URL,
            headers: {
                connectionid,
                'Content-Type': 'application/json',
            },
            data,
        });
    });
    connection.on('close', async (reasonCode, description) => {
        console.info(new Date(), 'connection closed', { reasonCode, description });
        void axios_1.default.request({
            method: 'POST',
            url: DISCONNECTED_URL,
            headers: {
                connectionid,
            },
        });
        delete connections[connectionid];
    });
    connections[connectionid] = connection;
});
