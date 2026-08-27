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

    socket.on('join:business', (businessId: string) => {
      socket.join(`business:${businessId}`);
      console.log(`👤 Socket ${socket.id} joined business:${businessId}`);
    });

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
  if (!io) throw new Error('Socket.IO no inicializado');
  return io;
};

export const emitNewOrder = (businessId: number, orderData: any) => {
  io.to(`business:${businessId}`).emit('order:new', orderData);
  console.log(`📨 Nueva orden emitida a business:${businessId}`);
};

export const emitOrderStatusUpdate = (userId: number, orderData: any) => {
  io.to(`user:${userId}`).emit('order:status_update', orderData);
  console.log(`📨 Estado de orden actualizado para user:${userId}`);
};

export const emitOrderUpdated = (businessId: number, userId: number | null | undefined, orderData: any) => {
  io.to(`business:${businessId}`).emit('order:updated', orderData);
  if (userId) io.to(`user:${userId}`).emit('order:updated', orderData);
  console.log(`📝 Orden actualizada order:${orderData?.id} business:${businessId}`);
};

export const emitKitchenItemUpdate = (businessId: number, userId: number | null | undefined, payload: any) => {
  io.to(`business:${businessId}`).emit('order:kitchen_item_update', payload);
  if (userId) io.to(`user:${userId}`).emit('order:kitchen_item_update', payload);
  console.log(`🍳 Item de cocina actualizado order:${payload?.orderId} detail:${payload?.detailId}`);
};
