import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { SOCKET_EVENTS, RealtimeOccupancyPayload } from '@smartpark-ai/shared';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HttpServer, corsOrigin: string): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin === '*' ? '*' : corsOrigin.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 10000,
    pingInterval: 5000,
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Facility subscription
    socket.on(SOCKET_EVENTS.SUBSCRIBE_FACILITY, (facilityId: string) => {
      if (facilityId) {
        socket.join(`facility:${facilityId}`);
        console.log(`[Socket.IO] Client ${socket.id} subscribed to facility:${facilityId}`);
      }
    });

    socket.on(SOCKET_EVENTS.UNSUBSCRIBE_FACILITY, (facilityId: string) => {
      if (facilityId) {
        socket.leave(`facility:${facilityId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function broadcastOccupancyChange(payload: RealtimeOccupancyPayload): void {
  if (!io) return;
  // Broadcast to global topic and facility specific room
  io.emit(SOCKET_EVENTS.OCCUPANCY_CHANGED, payload);
  io.to(`facility:${payload.facilityId}`).emit(SOCKET_EVENTS.OCCUPANCY_CHANGED, payload);
}

export function broadcastSlotChange(slot: any): void {
  if (!io) return;
  io.emit(SOCKET_EVENTS.SLOT_STATUS_CHANGED, slot);
  if (slot.facilityId) {
    io.to(`facility:${slot.facilityId}`).emit(SOCKET_EVENTS.SLOT_STATUS_CHANGED, slot);
  }
}

export function broadcastReservationCreated(reservation: any): void {
  if (!io) return;
  io.emit(SOCKET_EVENTS.RESERVATION_CREATED, reservation);
}

export function broadcastReservationCancelled(reservation: any): void {
  if (!io) return;
  io.emit(SOCKET_EVENTS.RESERVATION_CANCELLED, reservation);
}

export function broadcastSessionStarted(session: any): void {
  if (!io) return;
  io.emit(SOCKET_EVENTS.SESSION_STARTED, session);
}

export function broadcastSessionEnded(session: any): void {
  if (!io) return;
  io.emit(SOCKET_EVENTS.SESSION_ENDED, session);
}

export function broadcastAdminAlert(alert: { title: string; message: string; severity: 'info' | 'warning' | 'error' }): void {
  if (!io) return;
  io.emit(SOCKET_EVENTS.ADMIN_ALERT, { ...alert, timestamp: new Date().toISOString() });
}
