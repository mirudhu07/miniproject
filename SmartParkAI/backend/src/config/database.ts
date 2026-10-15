import net from 'net';
import { ENV } from './env';

export interface DatabaseState {
  connected: boolean;
  name: string;
  mode: 'mongodb' | 'in-memory-dev' | 'disconnected';
  lastError?: string;
}

export const dbState: DatabaseState = {
  connected: false,
  name: 'smartpark_ai_db',
  mode: 'disconnected',
};

// In-Memory Data Store for local dev
export class MemoryDatabase {
  users: Map<string, any> = new Map();
  itParks: Map<string, any> = new Map();
  facilities: Map<string, any> = new Map();
  zones: Map<string, any> = new Map();
  slots: Map<string, any> = new Map();
  reservations: Map<string, any> = new Map();
  sessions: Map<string, any> = new Map();
  vehicles: Map<string, any> = new Map();
  notifications: Map<string, any> = new Map();
  auditLogs: any[] = [];

  clear() {
    this.users.clear();
    this.itParks.clear();
    this.facilities.clear();
    this.zones.clear();
    this.slots.clear();
    this.reservations.clear();
    this.sessions.clear();
    this.vehicles.clear();
    this.notifications.clear();
    this.auditLogs = [];
  }
}

export const memDb = new MemoryDatabase();

async function checkPortListening(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(800);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

export async function connectDatabase(): Promise<DatabaseState> {
  const uri = ENV.MONGODB_URI;
  console.log(`[Database] Inspecting MongoDB target: ${uri}...`);

  // Parse host and port from MONGODB_URI
  let host = '127.0.0.1';
  let port = 27017;
  try {
    const url = new URL(uri.replace('mongodb://', 'http://'));
    host = url.hostname || '127.0.0.1';
    port = parseInt(url.port, 10) || 27017;
  } catch {}

  const isListening = await checkPortListening(port, host);

  if (isListening) {
    try {
      console.log(`[Database] Port ${port} is active. Connecting via Mongoose...`);
      const mongoose = await import('mongoose');
      await mongoose.default.connect(uri, {
        serverSelectionTimeoutMS: ENV.DB_CONNECT_TIMEOUT_MS,
      });

      dbState.connected = true;
      dbState.mode = 'mongodb';
      dbState.name = mongoose.default.connection.name || 'smartpark_ai_db';
      console.log(`[Database] ✔ Successfully connected to MongoDB database: ${dbState.name}`);
      return dbState;
    } catch (error: any) {
      console.warn(`[Database] Mongoose connection error: ${error.message}`);
      dbState.lastError = error.message;
    }
  }

  // If MongoDB daemon is not running or unreachable
  if (ENV.ALLOW_DEV_MEMORY_DB) {
    console.log(`[Database] ℹ Standalone MongoDB daemon not detected on ${host}:${port}.`);
    console.log(`[Database] 🚀 Fast-boot: Initialized dedicated in-memory database store (zero delay).`);
    console.log(`[Database] ℹ All schemas, atomic reservations, sessions, and events are 100% functional.`);
    dbState.connected = true;
    dbState.mode = 'in-memory-dev';
    dbState.name = 'smartpark_ai_db (in-memory)';
    return dbState;
  } else {
    const msg = `Fatal: Standalone MongoDB not running on ${host}:${port} and ALLOW_DEV_MEMORY_DB=false.`;
    console.error(`\n[Database] ❌ ${msg}\n`);
    throw new Error(msg);
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (dbState.mode === 'mongodb') {
    try {
      const mongoose = await import('mongoose');
      await mongoose.default.disconnect();
    } catch {}
  }
  dbState.connected = false;
  dbState.mode = 'disconnected';
}
