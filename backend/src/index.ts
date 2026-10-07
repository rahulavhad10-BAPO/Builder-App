import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const storageDir = path.resolve(process.cwd(), process.env.STORAGE_DIR || './uploads');

// Middlewares
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static file storage route for uploaded documents
app.use('/uploads', express.static(storageDir));

// API Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ONLINE',
    app: 'BUILDER OPERATIONS COMMAND CENTER',
    version: '1.0.0',
    ragEnabled: process.env.RAG_ENABLED === 'true',
    timestamp: new Date().toISOString(),
  });
});

// Mount consolidated API router
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[UNHANDLED ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error occurred',
  });
});

// Start listening
const server = app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` BUILDER OPERATIONS COMMAND CENTER - BACKEND READY`);
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` RAG_ENABLED: ${process.env.RAG_ENABLED === 'true'}`);
  console.log(` SQLite Database Connected`);
  console.log(`=======================================================`);
});

export default app;
