import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Payment, User, Order } from "../entities/Entities";


const paymentRepo = AppDataSource.getRepository(Payment);
const userRepo = AppDataSource.getRepository(User);
const orderRepo = AppDataSource.getRepository(Order);

/* ============================================================
   CREATE PAYMENT
============================================================ */
export const createPayment = async (req: Request, res: Response) => {
    try {
        const { user_id, order_id, amount, payment_method } = req.body;

        // Validar usuario
        const user = await userRepo.findOne({ where: { user_id } });
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Validar orden
        const order = await orderRepo.findOne({ where: { order_id } });
        if (!order) {
            return res.status(404).json({ message: "Orden no encontrada" });
        }

        if (Number(amount) <= 0) {
            return res.status(400).json({ message: "El monto debe ser mayor a 0" });
        }

        const newPayment = paymentRepo.create({
            user,
            order,
            amount: Number(amount),
            payment_method,
            status: "pending",
            created_at: new Date()
        });

        const savedPayment = await paymentRepo.save(newPayment);

        res.status(201).json({
            message: "Pago registrado exitosamente",
            payment: savedPayment
        });
    } catch (error) {
        console.error("Error al procesar pago:", error);
        res.status(500).json({ message: "Error al procesar pago", error });
    }
};

/* ============================================================
   UPDATE PAYMENT STATUS
============================================================ */
export const updatePaymentStatus = async (req: Request, res: Response) => {
    try {
        const { status, gateway_id, gateway_response } = req.body;

        const payment = await paymentRepo.findOne({
            where: { payment_id: Number.parseInt(req.params.id) }
        });

        if (!payment) {
            return res.status(404).json({ message: "Pago no encontrado" });
        }

        payment.status = status;
        if (gateway_id) payment.gateway_id = gateway_id;
        if (gateway_response)
            payment.gateway_response = JSON.stringify(gateway_response);

        const updated = await paymentRepo.save(payment);

        res.json({
            message: "Estado de pago actualizado",
            payment: updated
        });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar pago", error });
    }
};
