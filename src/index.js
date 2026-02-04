import express from 'express';
import http from "http";

import { matchRouter } from "./routes/matches.js";
import {attachWebSocketServer} from "./ws/server.js";
import {securityMiddleware} from "./arcjet.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0'

const app = express();
const server = http.createServer(app);


// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.send('Live Score API is running');
});

// Arcjet Security Middleware
app.use(securityMiddleware())

// Routes
app.use("/matches", matchRouter)

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// Start server and log URL
server.listen(PORT, HOST, () => {
  const baseUrl = HOST === '0.0.0.0' ?
      `http://localhost:${PORT}` :
      `http://${HOST}:${PORT}`;
  console.log(`Application running on ${baseUrl}`);
  console.log(`WebSocket server is running on ${baseUrl.replace(/^http/, "ws")}/ws`);
});
