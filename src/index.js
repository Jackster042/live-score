import express from 'express';

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware to parse JSON bodies
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Live Score API is running');
});

// Start server and log URL
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Server started at ${url}`);
});
