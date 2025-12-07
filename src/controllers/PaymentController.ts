import { Request, Response } from "express";
import { AppDataSource } from "../utils/db";
import { Payments } from "../entities/Payments";

export class PaymentController {
    private paymentRepo = AppDataSource.getRepository(Payments);

    // POST /api/payments
    async create(req: Request, res: Response) {
        try {
            const { 
                userId, 
                orderId, 
                amount, 
                paymentMethod,
                gatewayId 
            } = req.body;

            const payment = this.paymentRepo.create({
                userId,
                orderId,
                amount: amount.toString(),
                paymentMethod: paymentMethod || "cash",
                status: "pending",
                gatewayId,
                paymentDate: new Date(),
                currency: "MXN"
            });

            await this.paymentRepo.save(payment);

            // TODO: Integrar con pasarela de pago real (Stripe, PayPal, etc.)
            // Aquí simularíamos el proceso de pago

            // Marcar como completado (simulado)
            payment.status = "completed";
            await this.paymentRepo.save(payment);

            return res.status(201).json({
                success: true,
                message: "Pago procesado exitosamente",
                data: {
                    paymentId: payment.paymentId,
                    status: payment.status,
                    amount: Number.parseFloat(payment.amount || "0"),
                    method: payment.paymentMethod
                }
            });

        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }

    // GET /api/payments/:id/verify
    async verify(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const payment = await this.paymentRepo.findOne({
                where: { paymentId: Number.parseInt(id) },
                relations: ["order"]
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Pago no encontrado"
                });
            }

            // TODO: Verificar con pasarela real
            const verified = payment.status === "completed";

            return res.json({
                success: true,
                data: {
                    paymentId: payment.paymentId,
                    verified,
                    status: payment.status,
                    amount: Number.parseFloat(payment.amount || "0"),
                    orderId: payment.orderId
                }
            });

        } catch (error: any) {
            return res.status(500).json({ 
                success: false, 
                message: error.message 
            });
        }
    }
}