// src/utils/socket.ts
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'node:http';

let io: Server;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    // Unir a sala de negocio (para owners)
    socket.on('join:business', (businessId: string) => {
      socket.join(`business:${businessId}`);
      console.log(`👤 Socket ${socket.id} joined business:${businessId}`);
    });

    // Unir a sala de usuario (para clientes)
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`👤 Socket ${socket.id} joined user:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO no inicializado');
  }
  return io;
};

// Emitir nueva orden a un negocio
export const emitNewOrder = (businessId: number, orderData: any) => {
  io.to(`business:${businessId}`).emit('order:new', orderData);
  console.log(`📨 Nueva orden emitida a business:${businessId}`);
};

// Emitir actualización de estado de orden
export const emitOrderStatusUpdate = (userId: number, orderData: any) => {
  io.to(`user:${userId}`).emit('order:status_update', orderData);
  console.log(`📨 Estado de orden actualizado para user:${userId}`);
};