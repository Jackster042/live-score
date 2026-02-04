import {WebSocket, WebSocketServer} from 'ws'

function sendJson(socket, payload) {
    if(socket.readyState !== WebSocket.OPEN) continue

    socket.send(JSON.stringify(payload))
}

function broadcast(wss, payload) {
    const msg = JSON.stringify(payload)
    for(const client of wss.clients) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(msg)
        }
    }
}

export function attachWebSocketServer(server){
    const wss = new WebSocketServer({
        server,
        path:"/ws",
        maxPayload: 1024*1024
    })

    wss.on("connection", (socket) => {
        socket.isAlive = true
        socket.on("pong", () => {socket.isAlive = true})
        sendJson(socket, { type:"welcome" })

        socket.on("error", console.error)
    })

    const interval = setInterval(() => {
        for(const client of wss.clients) {
            if(!client.isAlive) {
                client.terminate()
                continue
            }
            client.isAlive = false
            client.ping()
        }
    })

    wss.on("close", () => clearInterval(interval))

    function broadcastMatchCreated(match){
        broadcast(wss, {type:"match_created", data: match})
    }

    return {  broadcastMatchCreated }
}