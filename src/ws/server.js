import {WebSocket, WebSocketServer} from 'ws'
import {wsArcjet} from "../arcjet.js";

const matchSubscribers = new Map();

// BROADCAST HELPER FUNCTION
function subscribe(matchId, socket) {
    if(!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if(!subscribers) return
    subscribers.delete(socket);
    if(subscribers.size === 0) matchSubscribers.delete(matchId);
}

function cleanupSubscriptions(socket) {
    for(const matchId in socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
}

function sendJson(socket, payload) {
    if(socket.readyState !== WebSocket.OPEN) return

    socket.send(JSON.stringify(payload))
}

function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId)
    if(!subscribers || subscribers.size === 0) return

    const message = JSON.stringify(payload);

    for(const client of subscribers) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(message)
        }
    }
}

function broadcastToAll(wss, payload) {
    const msg = JSON.stringify(payload)
    for(const client of wss.clients) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(msg)
        }
    }
}

function handleMessage(socket, data) {
    let message;

    try{
        message = JSON.parse(data);
    }catch(error){
        console.error(error)
        sendJson(socket, { type:"error", message: "Invalid JSON"})
    }

    if(message?.type === "subscribe" && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);
        sendJson(socket, { type:"subscribed", matchId: message.matchId })
        return
    }

    if(message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket)
        socket.subscriptions.delete(message.matchId)
        sendJson(socket, { type: "unsubscribed", matchId: message.matchId })
    }

}

export function attachWebSocketServer(server){
    const wss = new WebSocketServer({
        noServer: true,
        maxPayload: 1024*1024
    })

    // Validate WebSocket requests during HTTP upgrade before the handshake
    server.on('upgrade', async (req, socket, head) => {
        try {
            const reqUrl = req.url ? new URL(req.url, 'http://localhost') : null;
            if (!reqUrl || reqUrl.pathname !== '/ws') {
                // Not our WS endpoint; let other handlers (if any) deal with it
                return;
            }

            if (wsArcjet) {
                const decision = await wsArcjet.protect(req)
                if (decision.isDenied()) {
                    const isRateLimit = typeof decision.reason?.isRateLimit === 'function' && decision.reason.isRateLimit()
                    const status = isRateLimit ? 429 : 403
                    const text = isRateLimit ? 'Too Many Requests' : 'Forbidden'

                    // Pre-handshake HTTP rejection and close raw socket
                    try {
                        socket.write(
                            `HTTP/1.1 ${status} ${text}\r\n` +
                            'Connection: close\r\n' +
                            'Content-Type: text/plain; charset=utf-8\r\n' +
                            `Content-Length: ${text.length}\r\n` +
                            '\r\n' +
                            text
                        )
                    } catch {}
                    socket.destroy()
                    return
                }
            }

            // Proceed with WS handshake
            wss.handleUpgrade(req, socket, head, ws => {
                wss.emit('connection', ws, req)
            })
        } catch (error) {
            console.error('WS upgrade error', error)
            try {
                socket.write(
                    'HTTP/1.1 503 Service Unavailable\r\n' +
                    'Connection: close\r\n' +
                    '\r\n'
                )
            } catch {}
            socket.destroy()
        }
    })

    wss.on("connection", (socket, req) => {
        socket.isAlive = true
        socket.on("pong", () => {socket.isAlive = true})

        socket.subscriptions = new Set()

        sendJson(socket, { type:"welcome" })

        socket.on("message", (data) => {
            handleMessage(socket, data)
        })

        socket.on("error", () => {
            socket.terminate()
        })

        socket.on("close", () => {
            clearInterval(socket)
        })

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
    }, 3000)

    wss.on("close", () => clearInterval(interval))

    function broadcastMatchCreated(match){
        broadcastToAll(wss, {type:"match_created", data: match})
    }

    function broadcastCommentary(matchId, comment){
        broadcastToMatch(matchId, { type:"commentary", data: comment })
    }

    return {  broadcastMatchCreated , broadcastCommentary }
}