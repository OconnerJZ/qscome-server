// src/utils/socket.ts
import { Server } from 'socket.io';
import { Server as HTTPServer } from 'node:http';
import { verifyAuthToken } from './authToken';
import { corsOrigin } from './cors';
import { AppDataSource } from './db';
import { Users } from '../entities/Users';
import { getBusinessMembership } from '../security/businessAccess';

let io: Server;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
      methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token;
      const token = typeof rawToken === 'string' ? rawToken.replace(/^Bearer\s+/i, '') : '';
      if (!token) return next(new Error('AUTH_REQUIRED'));

      const payload = verifyAuthToken(token);
      const user = await AppDataSource.getRepository(Users).findOne({
        where: { userId: payload.userId },
        relations: ['role'],
      });
      if (!user) return next(new Error('AUTH_USER_NOT_FOUND'));

      socket.data.user = {
        userId: user.userId,
        email: user.email,
        role: user.role?.roleName || 'customer',
      };
      return next();
    } catch {
      return next(new Error('AUTH_INVALID'));
    }
  });

  io.on('connection', async (socket) => {
    const authenticatedUser = socket.data.user as { userId: number; role: string };
    await socket.join(`user:${authenticatedUser.userId}`);
    console.log(`✅ Cliente conectado: ${socket.id}`);

    socket.on('join:business', async (rawBusinessId: string | number, acknowledge?: (result: any) => void) => {
      try {
        const businessId = Number(rawBusinessId);
        if (!Number.isInteger(businessId) || businessId < 1) {
          return acknowledge?.({ success: false, error: 'BUSINESS_ID_INVALID' });
        }
        const isAdmin = authenticatedUser.role === 'admin';
        const access = isAdmin ? true : Boolean(await getBusinessMembership(authenticatedUser.userId, businessId));
        if (!access) return acknowledge?.({ success: false, error: 'BUSINESS_ACCESS_DENIED' });

        await socket.join(`business:${businessId}`);
        acknowledge?.({ success: true, businessId });
        console.log(`👤 Socket ${socket.id} joined business:${businessId}`);
      } catch {
        acknowledge?.({ success: false, error: 'BUSINESS_JOIN_FAILED' });
      }
    });

    socket.on('leave:business', async (rawBusinessId: string | number, acknowledge?: (result: any) => void) => {
      const businessId = Number(rawBusinessId);
      if (!Number.isInteger(businessId) || businessId < 1) {
        return acknowledge?.({ success: false, error: 'BUSINESS_ID_INVALID' });
      }
      await socket.leave(`business:${businessId}`);
      acknowledge?.({ success: true, businessId });
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
