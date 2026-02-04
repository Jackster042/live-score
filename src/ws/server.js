import {WebSocket, WebSocketServer} from 'ws'
import {wsArcjet} from "../arcjet.js";

function sendJson(socket, payload) {
    if(socket.readyState !== WebSocket.OPEN) return

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
    }, 3000)

    wss.on("close", () => clearInterval(interval))

    function broadcastMatchCreated(match){
        broadcast(wss, {type:"match_created", data: match})
    }

    return {  broadcastMatchCreated }
}