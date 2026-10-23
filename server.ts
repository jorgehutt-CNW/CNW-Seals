import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json());

// Health check endpoint for Cloud Run
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

const distDir = path.resolve(__dirname, 'dist');

// Serve static assets from dist directory
app.use(express.static(distDir));

// Fallback all client navigation routes to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE' && PORT !== 3000) {
    console.warn(`Port ${PORT} in use, attempting port 3000...`);
    app.listen(3000, HOST, () => {
      console.log(`Server running on http://${HOST}:3000`);
    });
  } else {
    console.error('Server error:', err);
  }
});

