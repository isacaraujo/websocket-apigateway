# Get Started

With docker, launch:

```
$ docker run --rm -it \
  -e 'CONNECT_URL=http://localhost:3333/ws/events/connected' \
  -e 'DISCONNECT_URL=http://localhost:3333/ws/events/disconnected' \
  -e 'MESSAGE_URL=http://localhost:3333/ws/events/messages' \
  -e 'STAGE_PATH=/ws' \
  -e 'HTTP_PORT=6262' \
  -p 6262:6262 \
  isacaraujo/websocket-apigateway
```

# Examples

To make the examples run, please use the following commands:

```
CONNECT_URL='http://localhost:3333/connected' DISCONNECT_URL='http://localhost:3333/disconnected' MESSAGE_URL='http://localhost:3333/messages' STAGE_PATH='/ws' HTTP_PORT=6262 node dist/index.js
```

```
docker run --rm  -d --name sample -v $$(pwd)/examples/:/usr/share/nginx/html:ro -p 8080:80/tcp nginx
```

```
node examples/backend.js
```
