# Get Started

With docker, launch:

```
$ docker run --rm -it \
  -e 'CONNECT_URL=http://localhost:3333/ws/events/connected' \
  -e 'DISCONNECT_URL=http://localhost:3333/ws/events/disconnected' \
  -e 'MESSAGE_URL=http://localhost:3333/ws/events/messages' \
  -e 'STAGE_PATH=/ws' \
  -p 6262:6262 \
  --network=host \
  isacaraujo/websocket-apigateway
```
