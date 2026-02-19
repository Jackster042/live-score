/**
 * WebSocket Server with Redis Pub/Sub
 * 
 * This implementation enables horizontal scaling by using Redis
 * to synchronize broadcasts across multiple API instances.
 * 
 * Architecture:
 * - Each instance tracks local WebSocket subscribers
 * - When broadcasting, publish to Redis channel
 * - Subscribe to Redis channels, forward to local clients
 */

import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from "../arcjet.js";
import { initRedis, publish, subscribe, unsubscribe, getSubscriber } from "../redis/client.js";
import { wsChannels } from "../redis/keys.js";

// Local in-memory subscriber tracking (per instance)
const matchSubscribers = new Map();

// Track if Redis is initialized
let redisInitialized = false;

/**
 * Initialize Redis subscriptions for this WebSocket server instance
 */
async function initRedisSubscriptions() {
  if (redisInitialized) return;
  
  await initRedis();
  
  // Subscribe to global match creation channel
  subscribe(wsChannels.matchCreated(), (channel, message) => {
    broadcastToAllLocal(message);
  });
  
  // Subscribe to pattern for match-specific channels
  // Using pattern subscribe to catch all match:* channels
  subscribe('ws:match:*', (channel, message) => {
    // Extract matchId from channel name (ws:match:{id}:commentary or ws:match:{id}:score)
    const matchId = extractMatchIdFromChannel(channel);
    if (matchId) {
      broadcastToMatchLocal(matchId, message);
    }
  }, true); // true = pattern subscription
  
  redisInitialized = true;
  console.log('   WebSocket: Redis pub/sub initialized');
}

/**
 * Extract match ID from Redis channel name
 * @param {string} channel - e.g., "ws:match:123:commentary"
 * @returns {number|null}
 */
function extractMatchIdFromChannel(channel) {
  const match = channel.match(/ws:match:(\d+):/);
  return match ? parseInt(match[1], 10) : null;
}

// LOCAL BROADCAST FUNCTIONS (within this instance)

function subscribeLocal(matchId, socket) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }
  matchSubscribers.get(matchId).add(socket);
}

function unsubscribeLocal(matchId, socket) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers) return;
  subscribers.delete(socket);
  if (subscribers.size === 0) matchSubscribers.delete(matchId);
}

function cleanupSubscriptionsLocal(socket) {
  for (const matchId of socket.subscriptions) {
    unsubscribeLocal(matchId, socket);
  }
  socket.subscriptions.clear();
}

function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify(payload));
}

/**
 * Broadcast to local subscribers of a specific match
 * @param {number} matchId
 * @param {Object} payload
 */
function broadcastToMatchLocal(matchId, payload) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

/**
 * Broadcast to all local connected clients
 * @param {Object} payload
 */
function broadcastToAllLocal(payload) {
  const msg = JSON.stringify(payload);
  // We need access to wss.clients, so this is called from within attachWebSocketServer
  // We'll store the wss reference and use it in the broadcast functions
}

// REDIS-AWARE BROADCAST FUNCTIONS (cross-instance)

/**
 * Broadcast match creation to ALL instances via Redis
 */
async function broadcastMatchCreated(match) {
  const payload = { type: "match_created", data: match };
  
  // 1. Broadcast to local clients immediately
  if (wssRef) {
    const msg = JSON.stringify(payload);
    for (const client of wssRef.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    }
  }
  
  // 2. Publish to Redis for other instances
  try {
    await publish(wsChannels.matchCreated(), payload);
  } catch (err) {
    console.error('Failed to publish match_created to Redis:', err);
  }
}

/**
 * Broadcast commentary to match subscribers across ALL instances
 */
async function broadcastCommentary(matchId, comment) {
  const payload = { type: "commentary", data: comment };
  
  // 1. Broadcast to local subscribers immediately
  broadcastToMatchLocal(matchId, payload);
  
  // 2. Publish to Redis for other instances
  try {
    await publish(wsChannels.matchCommentary(matchId), payload);
  } catch (err) {
    console.error('Failed to publish commentary to Redis:', err);
  }
}

// WebSocket Server reference for local broadcasts
let wssRef = null;

function handleClientMessage(socket, data) {
  let message;

  try {
    message = JSON.parse(data);
  } catch (error) {
    console.error('Invalid JSON from client:', error);
    sendJson(socket, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
    subscribeLocal(message.matchId, socket);
    socket.subscriptions.add(message.matchId);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
    unsubscribeLocal(message.matchId, socket);
    socket.subscriptions.delete(message.matchId);
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
  }
}

export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024 * 1024
  });

  // Store reference for local broadcasts
  wssRef = wss;

  // Initialize Redis subscriptions
  initRedisSubscriptions().catch(err => {
    console.error('Failed to initialize Redis subscriptions:', err);
  });

  // Validate WebSocket requests during HTTP upgrade before the handshake
  server.on('upgrade', async (req, socket, head) => {
    try {
      const reqUrl = req.url ? new URL(req.url, 'http://localhost') : null;
      if (!reqUrl || reqUrl.pathname !== '/ws') {
        return;
      }

      if (wsArcjet) {
        const decision = await wsArcjet.protect(req);
        if (decision.isDenied()) {
          const isRateLimit = typeof decision.reason?.isRateLimit === 'function' && decision.reason.isRateLimit();
          const status = isRateLimit ? 429 : 403;
          const text = isRateLimit ? 'Too Many Requests' : 'Forbidden';

          try {
            socket.write(
              `HTTP/1.1 ${status} ${text}\r\n` +
              'Connection: close\r\n' +
              'Content-Type: text/plain; charset=utf-8\r\n' +
              `Content-Length: ${text.length}\r\n` +
              '\r\n' +
              text
            );
          } catch { }
          socket.destroy();
          return;
        }
      }

      // Proceed with WS handshake
      wss.handleUpgrade(req, socket, head, ws => {
        wss.emit('connection', ws, req);
      });
    } catch (error) {
      console.error('WS upgrade error', error);
      try {
        socket.write(
          'HTTP/1.1 503 Service Unavailable\r\n' +
          'Connection: close\r\n' +
          '\r\n'
        );
      } catch { }
      socket.destroy();
    }
  });

  wss.on("connection", (socket, req) => {
    socket.isAlive = true;
    socket.subscriptions = new Set();

    socket.on("pong", () => { socket.isAlive = true; });

    sendJson(socket, { 
      type: "welcome",
      message: "Connected to Live Score API",
      instance: process.env.HOSTNAME || 'local'
    });

    socket.on("message", (data) => {
      handleClientMessage(socket, data);
    });

    socket.on("close", () => {
      cleanupSubscriptionsLocal(socket);
    });

    socket.on("error", (err) => {
      console.error('WebSocket error:', err);
      socket.terminate();
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    for (const client of wss.clients) {
      if (!client.isAlive) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000); // 30 seconds

  wss.on("close", () => {
    clearInterval(interval);
  });

  return { broadcastMatchCreated, broadcastCommentary };
}
