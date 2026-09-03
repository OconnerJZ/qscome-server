import { AppDataSource } from "../utils/db";
import { Payments } from "../entities/Payments";
import { Orders } from "../entities/Orders";
import { HttpError } from "../utils/httpError";

const PAYMENT_METHODS = ["card", "wallet", "cash"] as const;
type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface CreatePaymentInput {
  orderId: number;
  userId: number;
  paymentMethod?: string;
}

export class PaymentService {
  private readonly paymentRepo = AppDataSource.getRepository(Payments);
  private readonly orderRepo = AppDataSource.getRepository(Orders);

  async create(input: CreatePaymentInput) {
    if (!Number.isInteger(input.orderId) || input.orderId < 1) throw new HttpError(400, "Orden inválida");
    const order = await this.orderRepo.findOne({ where: { orderId: input.orderId } });
    if (!order) throw new HttpError(404, "Orden no encontrada");
    if (order.userId !== input.userId) throw new HttpError(403, "No puedes registrar pagos para otra orden");
    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount < 0) throw new HttpError(409, "La orden no tiene un total válido");

    const paymentMethod = input.paymentMethod || "cash";
    if (!PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) throw new HttpError(400, "Método de pago inválido");

    const payment = this.paymentRepo.create({
      userId: input.userId,
      orderId: order.orderId,
      amount: amount.toFixed(2),
      paymentMethod: paymentMethod as PaymentMethod,
      status: "pending",
      paymentDate: null,
      currency: "MXN",
      gatewayId: null,
      gatewayResponse: null,
    });
    await this.paymentRepo.save(payment);
    return this.format(payment);
  }

  async verify(paymentId: number) {
    if (!Number.isInteger(paymentId) || paymentId < 1) throw new HttpError(400, "Pago inválido");
    const payment = await this.paymentRepo.findOne({ where: { paymentId } });
    if (!payment) throw new HttpError(404, "Pago no encontrado");
    return { ...this.format(payment), verified: payment.status === "completed" };
  }

  private format(payment: Payments) {
    return {
      paymentId: payment.paymentId,
      status: payment.status,
      amount: Number.parseFloat(payment.amount || "0"),
      method: payment.paymentMethod,
      orderId: payment.orderId,
    };
  }
}
