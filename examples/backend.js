const express = require('express');
const bodyParser = require('body-parser');
const AWS = require('aws-sdk');

const app = express();

const apigatewaymanagementapi = new AWS.ApiGatewayManagementApi({
	apiVersion: '2018-11-29',
  endpoint: 'http://localhost:6262/ws',
  region: 'us-east-1',
  accessKeyId: 'fakeaccesskeyid',
  secretAccessKey: 'fakesecretaccesskey',
});

const connections = {};

app.post('/connected', (req, res) => {
  console.info(new Date(), { method: req.method, path: req.path, headers: req.headers });

  connections[req.headers.connectionid] = 1;

  setTimeout(() => {
    res.status(200).end('{}');
  }, 2000);
});

app.post('/disconnected', (req, res) => {
  console.info(new Date(), { method: req.method, path: req.path, headers: req.headers });

  delete connections[req.headers.connectionid];

  setTimeout(() => {
    res.status(200).end('{}');
  }, 100);
});

app.post('/messages', bodyParser.json(), async (req, res) => {
  const promises = Object.keys(connections)
    .filter((id) => id !== req.headers.connectionid)
    .map((id) => new Promise((resolve) => {
      apigatewaymanagementapi
        .postToConnection(
          {ConnectionId: id, Data: Buffer.from(JSON.stringify(req.body), 'utf8') },
          () => {
            console.info(`postToConnection: ${id}`, req.body);
            resolve();
          });
    }));

  await Promise.all(promises);

  res.status(200).end('{}');
});

app.listen(3333, () => {
  console.info(new Date(), 'server listen on 3333');
});
