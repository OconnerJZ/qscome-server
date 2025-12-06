import "reflect-metadata";
import { AppDataSource } from "./db";
import { UserRole } from "../entities/UserRole";
import bcrypt from "bcrypt";
import { User } from "../entities/User";
import { Business } from "../entities/Business";

export async function seedDatabase() {
    try {
        console.log("🌱 Iniciando seeding de la base de datos...");

        // 1. Crear roles
        const roleRepo = AppDataSource.getRepository(UserRole);
        const existingRoles = await roleRepo.find();

        if (existingRoles.length === 0) {
            const roles = [
                { role_name: "admin" },
                { role_name: "owner" },
                { role_name: "customer" },
                { role_name: "delivery" }
            ];

            for (const roleData of roles) {
                const role = roleRepo.create(roleData);
                await roleRepo.save(role);
                console.log(`✅ Rol creado: ${roleData.role_name}`);
            }
        } else {
            console.log("⚠️  Los roles ya existen en la base de datos");
        }

        // 2. Crear usuario admin por defecto
        const userRepo = AppDataSource.getRepository(User);
        const adminExists = await userRepo.findOne({
            where: { email: "admin@qscome.com" }
        });

        if (!adminExists) {
            const adminRole = await roleRepo.findOne({ where: { role_name: "admin" } });
            if (adminRole) {
                const passwordHash = await bcrypt.hash("admin123", 10);
                const admin = userRepo.create({
                    user_name: "Administrador",
                    email: "admin@qscome.com",
                    password_hash: passwordHash,
                    phone: "7221234567",
                    role: adminRole,
                    is_subscribed: true
                });
                await userRepo.save(admin);
                console.log("✅ Usuario admin creado: admin@qscome.com / admin123");
            }
        } else {
            console.log("⚠️  Usuario admin ya existe");
        }

        // 3. Crear usuario owner de ejemplo
        const ownerExists = await userRepo.findOne({
            where: { email: "owner@qscome.com" }
        });

        if (!ownerExists) {
            const ownerRole = await roleRepo.findOne({ where: { role_name: "owner" } });
            if (ownerRole) {
                const passwordHash = await bcrypt.hash("owner123", 10);
                const owner = userRepo.create({
                    user_name: "Dueño Demo",
                    email: "owner@qscome.com",
                    password_hash: passwordHash,
                    phone: "7227654321",
                    role: ownerRole
                });
                await userRepo.save(owner);
                console.log("✅ Usuario owner creado: owner@qscome.com / owner123");
            }
        } else {
            console.log("⚠️  Usuario owner ya existe");
        }

        // 4. Crear cliente de ejemplo
        const customerExists = await userRepo.findOne({
            where: { email: "customer@qscome.com" }
        });

        if (!customerExists) {
            const customerRole = await roleRepo.findOne({ where: { role_name: "customer" } });
            if (customerRole) {
                const passwordHash = await bcrypt.hash("customer123", 10);
                const customer = userRepo.create({
                    user_name: "Cliente Demo",
                    email: "customer@qscome.com",
                    password_hash: passwordHash,
                    phone: "7229876543",
                    role: customerRole
                });
                await userRepo.save(customer);
                console.log("✅ Usuario customer creado: customer@qscome.com / customer123");
            }
        } else {
            console.log("⚠️  Usuario customer ya existe");
        }

        console.log("🎉 Seeding completado exitosamente");
    } catch (error) {
        console.error("❌ Error en seeding:", error);
        throw error;
    }
}

// Ejecutar seeding si se llama directamente
if (require.main === module) {
    AppDataSource.initialize()
        .then(async () => {
            await seedDatabase();
            await AppDataSource.destroy();
            process.exit(0);
        })
        .catch((error) => {
            console.error("Error:", error);
            process.exit(1);
        });
}
