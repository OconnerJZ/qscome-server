// src/middlewares/socketAuth.ts
//
// Autenticación del handshake de Socket.IO. Sin esto, io.on('connection')
// aceptaba cualquier conexión y cualquiera podía unirse a cualquier sala.
// El front ya envía el token en `auth: { token }`.

import * as jwt from "jsonwebtoken";
import { Socket } from "socket.io";

export interface SocketUser {
  userId: number;
  email?: string;
  role?: string;
}

export const socketAuthMiddleware = (
  socket: Socket,
  next: (err?: Error) => void,
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization as string | undefined)?.split(
        " ",
      )[1];

    if (!token) return next(new Error("Token no proporcionado"));

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret_key",
    ) as SocketUser;

    // Disponible luego como socket.data.user
    (socket.data as any).user = decoded;
    next();
  } catch {
    next(new Error("Token inválido o expirado"));
  }
};