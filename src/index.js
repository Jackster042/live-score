import express from 'express';

// Routers
import { matchRouter } from "./routes/matches.js";

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.send('Live Score API is running');
});

// Routes
app.use("/matches", matchRouter)

// Start server and log URL
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server started at ${url}`);
});
