import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/env';
import { connectDatabase, dbState } from './config/database';
import { seedDatabaseData } from './seed';
import { initSocketIO } from './services/socketService';
import { checkMLReadiness } from './services/mlClient';
import { errorHandler } from './middleware/errorHandler';

// Route handlers
import authRoutes from './routes/authRoutes';
import vehicleRoutes from './routes/vehicleRoutes';
import campusRoutes from './routes/campusRoutes';
import facilityRoutes from './routes/facilityRoutes';
import searchRoutes from './routes/searchRoutes';
import predictionRoutes from './routes/predictionRoutes';
import reservationRoutes from './routes/reservationRoutes';
import sessionRoutes from './routes/sessionRoutes';
import adminRoutes from './routes/adminRoutes';
import activityRoutes from './routes/activityRoutes';
import notificationRoutes from './routes/notificationRoutes';

const app = express();
const server = http.createServer(app);
const startTime = Date.now();

// Socket.IO
initSocketIO(server, ENV.CORS_ORIGIN);

// Global Middlewares
app.use(cors({
  origin: ENV.CORS_ORIGIN === '*' ? '*' : ENV.CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (ENV.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 1. Health Endpoints
// Process Liveness probe
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'smartpark-backend-api',
    version: '1.0.0',
    uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

// Dependency Readiness probe
app.get('/ready', async (req: Request, res: Response) => {
  const mlStatus = await checkMLReadiness();
  const dbConnected = dbState.connected;

  const isReady = dbConnected;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'degraded',
    service: 'smartpark-backend-api',
    uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
    database: {
      connected: dbConnected,
      name: dbState.name,
      mode: dbState.mode,
      lastError: dbState.lastError,
    },
    mlService: mlStatus,
    timestamp: new Date().toISOString(),
  });
});

// 2. Versioned API Routes (/api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/campuses', campusRoutes);
app.use('/api/v1/facilities', facilityRoutes);
app.use('/api/v1', searchRoutes);
app.use('/api/v1/predictions', predictionRoutes);
app.use('/api/v1/reservations', reservationRoutes);
app.use('/api/v1/sessions', sessionRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Handler
app.use(errorHandler);

// Server startup function
async function startServer() {
  try {
    console.log('[Backend] Starting SmartPark AI Backend API...');
    
    // Connect to database
    await connectDatabase();

    // If using in-memory store in local dev, seed initial campus and user data
    if (dbState.mode === 'in-memory-dev') {
      await seedDatabaseData();
    }

    server.listen(ENV.PORT, '127.0.0.1', () => {
      console.log(`\n======================================================`);
      console.log(`  🚀 SmartPark AI Backend API Ready & Listening!`);
      console.log(`  🔗 Local URL:  http://127.0.0.1:${ENV.PORT}`);
      console.log(`  🩺 Health:     http://127.0.0.1:${ENV.PORT}/health`);
      console.log(`  🚦 Readiness:  http://127.0.0.1:${ENV.PORT}/ready`);
      console.log(`  📡 WebSocket:  ws://127.0.0.1:${ENV.PORT} (Socket.IO)`);
      console.log(`  🗄️ Database:   ${dbState.name} (${dbState.mode})`);
      console.log(`======================================================\n`);
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${ENV.PORT} is already in use by another process.`);
        console.error(`Please terminate the conflicting process or change BACKEND_PORT in .env\n`);
      } else {
        console.error('\n❌ Server startup error:', err);
      }
      process.exit(1);
    });
  } catch (error: any) {
    console.error('❌ Failed to initialize backend server:', error.message);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
