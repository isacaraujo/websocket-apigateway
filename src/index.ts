import http from 'http';
import net from 'net';
import url from 'url';
import express from 'express';
import expressWebSocket from 'express-ws';
import bodyParser from 'body-parser';
import WebSocket from 'ws';
import axios from 'axios';
import uniqid from 'uniqid';

const defaultHttpPort = 6262;

const CONNECT_URL = process.env.CONNECT_URL as string;
const DISCONNECT_URL = process.env.DISCONNECT_URL as string;
const MESSAGE_URL = process.env.MESSAGE_URL as string;
const STAGE_PATH = process.env.STAGE_PATH as string;
const HTTP_PORT = 'HTTP_PORT' in process.env
  ? parseInt(process.env.HTTP_PORT as string)
  : defaultHttpPort;

const expressApp = express();
const server = http.createServer(expressApp);

const { app, getWss } = expressWebSocket(expressApp, server);

app.listen = (...args: any[]) => server.listen(...args);

const wss = getWss();

type WebsocketDict = { [key: string]: WebSocket | undefined };

const connections: WebsocketDict = {};

app.ws(STAGE_PATH, async (client, request) => {
  const { connectionid } = request.headers;

  client.on('message', (msg) => {
    console.info(new Date(), `[${connectionid}]`, 'Integration(MESSAGE)', MESSAGE_URL, msg);

    void axios.request({
      method: 'post',
      url: MESSAGE_URL,
      headers: {
        'Content-Type': 'application/json',
        'connectionid': connectionid,
      },
      data: msg,
    });
  });

  client.on('close', () => {
    console.info(new Date(), `[${connectionid}]`, 'Integration(DISCONNECT)', DISCONNECT_URL);

    void axios.request({
      method: 'post',
      url: DISCONNECT_URL,
      headers: {
        'connectionid': connectionid,
      },
    });

    delete connections[`${connectionid}`];
  });
});

app.post(`${STAGE_PATH}/@connections/:connectionid`, bodyParser.raw({ type: '*/*' }), (req, res) => {
  const connectionid = req.params.connectionid;
  const payload = req.body as Buffer;
  const client = connections[connectionid];
  const utf8Payload = payload.toString('utf8');

  if (!client) {
    console.info(new Date(), `[${connectionid}]`, 'postToConnection', utf8Payload, 'client not found');

    res
      .status(200)
      .append('Content-Type', 'application/json')
      .end('{}');

    return;
  }

  console.info(new Date(), `[${connectionid}]`, 'postToConnection', utf8Payload, 'send to client');

  client.send(utf8Payload);

  res.status(200)
    .append('Content-Type', 'application/json')
    .end('{}');
});

/** @see https://github.com/websockets/ws/blob/d972c33cb47c87439a1c68c7cf06d9a2aa9f7141/lib/websocket-server.js#L85 */
(wss as any)._removeListeners();

server.on('upgrade', async (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
  const connectionid = uniqid();
  const parsedUrl = url.parse(request.url as string, true);

  if (parsedUrl.pathname !== STAGE_PATH) {
    console.warn(new Date(), `[${connectionid}]`, 'Integration(CONNECT)',
      `UNAUTHORIZED: Path ${parsedUrl.pathname} not support websocket upgrade`);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  request.headers['connectionid'] = connectionid;

  const { authToken } = parsedUrl.query;

  if (typeof authToken === 'undefined') {
    console.warn(new Date(), `[${connectionid}]`, 'Integration(CONNECT)',
      'UNAUTHORIZED: authToken not provided');
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  console.info(new Date(), `[${connectionid}]`, 'Integration(CONNECT)', CONNECT_URL, { authToken });

  try {
    await axios.request({
      method: 'post',
      url: CONNECT_URL,
      headers: {
        'Authorization': authToken,
        'connectionid': connectionid,
      },
    });

    wss.handleUpgrade(request, socket, head, (ws) => {
      connections[connectionid] = ws;

      wss.emit('connection', ws, request);
    });
  } catch (error) {
    console.error(new Date(), error.message, { stack: error.stack });
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
});

app.listen(HTTP_PORT, () => {
  console.info(new Date(), `start server listening port ${HTTP_PORT}`);
});
