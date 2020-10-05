import express from 'express';
import expressWebSocket from 'express-ws';
import bodyParser from 'body-parser';
import WebSocket from 'ws';
import axios from 'axios';
import uniqid from 'uniqid';

const CONNECT_URL = process.env.CONNECT_URL as string;
const DISCONNECT_URL = process.env.DISCONNECT_URL as string;
const MESSAGE_URL = process.env.MESSAGE_URL as string;
const STAGE_PATH = process.env.STAGE_PATH as string;
 
const { app } = expressWebSocket(express());
const port = 6262;

type WebsocketDict = { [key: string]: WebSocket | undefined };

const connections: WebsocketDict = {};

app.ws(STAGE_PATH, async (client, request) => {
  const connectionid = uniqid();

  const authToken = request.query['authToken'] as string;

  try {
    console.info(new Date(), `[${connectionid}]`, 'Integration(CONNECT)', CONNECT_URL, { authToken });

    await axios.request({
      method: 'post',
      url: CONNECT_URL,
      headers: {
        'Authorization': authToken,
        'connectionid': connectionid,
      },
    });

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
  
      delete connections[connectionid];
    });
  
    connections[connectionid] = client;
  } catch (error) {
    console.info(new Date(), `[${connectionid}]`, 'Integration(CONNECT) Error', error);

    client.close();
  }
});

app.post(`${STAGE_PATH}/@connections/:connectionid`, bodyParser.raw({ type: '*/*' }), (req, res) => {
  const connectionid = req.params.connectionid;
  const payload = req.body as Buffer;
  const client = connections[connectionid];

  if (!client) {
    console.info(new Date(), `[${connectionid}]`, 'postToConnection', payload.toString('utf8'), 'client not found');

    res
      .status(200)
      .append('Content-Type', 'application/json')
      .end('{}');

    return;
  }

  console.info(new Date(), `[${connectionid}]`, 'postToConnection', payload.toString('utf8'), 'send to client');

  client.send(payload);

  res.status(200)
    .append('Content-Type', 'application/json')
    .end('{}');
});

app.listen(port, () => {
  console.info(new Date(), `start server listening port ${port}`);
});
