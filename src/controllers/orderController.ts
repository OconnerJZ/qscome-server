import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Order, OrderDetail, Menu, User, Business } from "../entities/Entities"

const orderRepo = AppDataSource.getRepository(Order);
const orderDetailRepo = AppDataSource.getRepository(OrderDetail);
const menuRepo = AppDataSource.getRepository(Menu);
const userRepo = AppDataSource.getRepository(User);
const businessRepo = AppDataSource.getRepository(Business);

/* ============================================================
   GET ALL ORDERS
============================================================ */
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const orders = await orderRepo.find({
            relations: [
                "user",
                "business",
                "details",
                "details.menu",
                "delivery"
            ]
        });

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener órdenes", error });
    }
};

/* ============================================================
   GET ORDER BY ID
============================================================ */
export const getOrderById = async (req: Request, res: Response) => {
    try {
        const order = await orderRepo.findOne({
            where: { order_id: parseInt(req.params.id) },
            relations: [
                "user",
                "business",
                "details",
                "details.menu",
                "delivery",
                "status_history"
            ]
        });

        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener orden", error });
    }
};

/* ============================================================
   CREATE ORDER
============================================================ */
export const createOrder = async (req: Request, res: Response) => {
    try {
        const {
            user_id,
            business_id,
            orderDetails,
            customer_name,
            customer_phone,
            delivery_address,
            order_notes
        } = req.body;

        // Validar usuario
        const user = await userRepo.findOne({ where: { user_id } });
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Validar negocio
        const business = await businessRepo.findOne({ where: { business_id } });
        if (!business) {
            return res.status(404).json({ message: "Negocio no encontrado" });
        }

        // Calcular total
        let total = 0;

        for (const detail of orderDetails) {
            const menu = await menuRepo.findOne({ where: { menu_id: detail.menu_id } });

            if (!menu) {
                return res.status(404).json({
                    message: `Producto con ID ${detail.menu_id} no encontrado`
                });
            }

            total += Number(menu.price) * detail.quantity; // Conversión necesaria
        }

        // Crear la orden
        const newOrder = orderRepo.create({
            user,
            business,
            customer_name: customer_name || user.user_name,
            customer_phone: customer_phone || user.phone,
            delivery_address,
            order_notes,
            total,
            status: "pending",
            delivery_status: "unassigned",
            order_date: new Date()
        });

        const savedOrder = await orderRepo.save(newOrder);

        // Crear detalles
        if (orderDetails && orderDetails.length > 0) {
            const detailsToInsert: OrderDetail[] = [];

            for (const detail of orderDetails) {
                const menu = await menuRepo.findOne({ where: { menu_id: detail.menu_id } });
                if (!menu) continue;

                const orderDetail = orderDetailRepo.create({
                    order: savedOrder,
                    menu,
                    quantity: detail.quantity,
                    subtotal: Number(menu.price) * detail.quantity,
                    notes: detail.notes || ""
                });

                detailsToInsert.push(orderDetail);
            }

            await orderDetailRepo.save(detailsToInsert);
        }

        // Obtener la orden completa final
        const completeOrder = await orderRepo.findOne({
            where: { order_id: savedOrder.order_id },
            relations: ["user", "business", "details", "details.menu"]
        });

        res.status(201).json({
            message: "Orden creada exitosamente",
            order: completeOrder
        });
    } catch (error) {
        console.error("Error al crear orden:", error);
        res.status(500).json({ message: "Error al crear orden", error });
    }
};

/* ============================================================
   UPDATE ORDER STATUS
============================================================ */
export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { status, delivery_status } = req.body;

        const order = await orderRepo.findOne({
            where: { order_id: parseInt(req.params.id) }
        });

        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        if (status) order.status = status;
        if (delivery_status) order.delivery_status = delivery_status;

        const updatedOrder = await orderRepo.save(order);

        res.json({
            message: "Estado de orden actualizado",
            order: updatedOrder
        });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar estado", error });
    }
};

/* ============================================================
   DELETE ORDER
============================================================ */
export const deleteOrder = async (req: Request, res: Response) => {
    try {
        const result = await orderRepo.delete(parseInt(req.params.id));

        if (result.affected === 0) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        res.json({ message: "Orden eliminada" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar orden", error });
    }
};
