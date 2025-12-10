import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Users } from "../entities/Users";
import { UserRoles } from "../entities/UserRoles";
import { OAuth2Client } from "google-auth-library";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

export class AuthController {
  private readonly userRepo = AppDataSource.getRepository(Users);
  private readonly roleRepo = AppDataSource.getRepository(UserRoles);
  client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  // POST /api/auth/register
  async register(req: Request, res: Response) {
    try {
      const { user_name, email, password, phone, role, isBusiness } = req.body;

      // Verificar si el usuario ya existe
      const existingUser = await this.userRepo.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "El email ya está registrado",
        });
      }

      const auxRole = isBusiness ? "owner" : role;
      // Obtener rol (por defecto 'customer')
      const userRole = await this.roleRepo.findOne({
        where: { roleName: auxRole || "customer" },
      });

      if (!userRole) {
        return res.status(400).json({
          success: false,
          message: "Rol inválido",
        });
      }

      // Hashear contraseña
      const passwordHash = await bcrypt.hash(password, 10);

      // Crear usuario
      const user = this.userRepo.create({
        userName: user_name,
        email,
        passwordHash,
        phone,
        roleId: userRole.roleId,
        authProvider: "local",
      });

      await this.userRepo.save(user);

      // Generar token
      const token = jwt.sign(
        { userId: user.userId, email: user.email, role: userRole.roleName },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
      );

      return res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          user: {
            id: user.userId,
            name: user.userName,
            email: user.email,
            phone: user.phone,
            role: userRole.roleName,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error("Error en register:", error);
      return res.status(500).json({
        success: false,
        message: "Error al registrar usuario",
        error: error.message,
      });
    }
  }

  // POST /api/auth/login
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Buscar usuario con rol
      const user = await this.userRepo.findOne({
        where: { email },
        relations: ["role"],
      });

      if (user === null) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        });
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(
        password,
        user.passwordHash || ""
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Credenciales inválidas",
        });
      }

      // Generar token
      const token = jwt.sign(
        {
          userId: user.userId,
          email: user.email,
          role: user.role?.roleName,
        },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
      );

      return res.json({
        success: true,
        message: "Login exitoso",
        data: {
          user: {
            id: user.userId,
            name: user.userName,
            email: user.email,
            phone: user.phone,
            avatar: user.avatarUrl,
            role: user.role?.roleName,
            provider: user.authProvider,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error("Error en login:", error);
      return res.status(500).json({
        success: false,
        message: "Error al iniciar sesión",
        error: error.message,
      });
    }
  }

  // POST /api/auth/google (placeholder para OAuth)
  async googleAuth(req: Request, res: Response) {
    try {
      const { idToken, isBusiness } = req.body;

      // Validar que venga el token
      if (!idToken) {
        return res.status(400).json({
          success: false,
          message: "Token de Google requerido",
        });
      }

      // 1. Validar token con Google
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        return res.status(401).json({
          success: false,
          message: "Token inválido",
        });
      }

      // Datos del usuario
      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name;
      const picture = payload.picture;

      let user = await this.userRepo.findOne({
        where: { email },
        relations: ["role"],
      });

      if (!user) {
        const auxRole = isBusiness ? "owner" : "customer";
        const userRole = await this.roleRepo.findOne({
          where: { roleName: auxRole || "customer" },
        });
        if (!userRole) {
          return res.status(400).json({
            success: false,
            message: "Rol inválido",
          });
        }
        user = this.userRepo.create({
          userName: name,
          email,
          roleId: userRole.roleId,
          authProvider: "google",
          authProviderId: googleId,
          avatarUrl: picture,
        });

        await this.userRepo.save(user);
      }

      // Generar token
      const token = jwt.sign(
        {
          userId: user.userId,
          email: user.email,
          role: user.role?.roleName || "customer",
        },
        process.env.JWT_SECRET || "secret_key",
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" } as jwt.SignOptions
      );

      return res.json({
        success: true,
        message: "Login exitoso",
        data: {
          user: {
            id: user.userId,
            name: user.userName,
            email: user.email,
            avatar: user.avatarUrl,
            role: user.role?.roleName || "customer",
            provider: user.authProvider,
          },
          token,
        },
      });
    } catch (error: any) {
      console.error("Error en Google Auth:", error);

      // Manejo específico de errores de Google
      if (error.message?.includes("Token")) {
        return res.status(401).json({
          success: false,
          message: "Token de Google inválido o expirado",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Error en autenticación con Google",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // POST /api/auth/facebook (placeholder para OAuth)
  async facebookAuth(req: Request, res: Response) {
    try {
      // TODO: Implementar autenticación con Facebook
      return res.status(501).json({
        success: false,
        message: "Facebook OAuth aún no implementado",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // GET /api/auth/me (obtener usuario actual)
  async getMe(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;

      const user = await this.userRepo.findOne({
        where: { userId },
        relations: ["role"],
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuario no encontrado",
        });
      }

      return res.json({
        success: true,
        data: {
          id: user.userId,
          name: user.userName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatarUrl,
          role: user.role?.roleName,
          provider: user.authProvider,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
