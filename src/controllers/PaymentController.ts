import { Request, Response, NextFunction } from "express";
import { PaymentService } from "../services/PaymentService";

export class PaymentController {
    private readonly service = new PaymentService();

    // POST /api/payments
    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = await this.service.create({
                userId: Number((req as any).user?.userId),
                orderId: Number(req.body.orderId),
                paymentMethod: req.body.paymentMethod,
            });
            return res.status(201).json({
                success: true,
                message: "Pago registrado",
                data,
            });
        } catch (error) {
            next(error);
        }
    };

    // GET /api/payments/:id/verify
    verify = async (req: Request, res: Response, next: NextFunction) => {
        try {
            return res.json({
                success: true,
                data: await this.service.verify(Number.parseInt(req.params.id, 10)),
            });
        } catch (error) {
            next(error);
        }
    };
}
