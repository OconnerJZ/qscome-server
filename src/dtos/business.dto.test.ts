import assert from "node:assert/strict";
import test from "node:test";
import { Request, Response } from "express";
import {
  UpdateBusinessDeliverySettingsDto,
  UpdateBusinessDto,
  UpdateBusinessLocationDto,
  UpdateBusinessPaymentMethodsDto,
} from "./business.dto";
import { validateDto } from "../middlewares/validateDto";
import { HttpError } from "../utils/httpError";

const validateBody = async <T extends object>(dto: new () => T, body: unknown) => {
  const request = { body } as Request;
  let nextValue: unknown = Symbol("not-called");

  await validateDto(dto)(request, {} as Response, (error?: unknown) => {
    nextValue = error;
  });

  return { body: request.body as T, nextValue };
};

const toPlainObject = (value: unknown) => JSON.parse(JSON.stringify(value));

test("elimina campos que no pertenecen al contrato de negocio", async () => {
  const result = await validateBody(UpdateBusinessDto, {
    business_name: "Las Parotas",
    is_verified: true,
    business_id: 999,
  });

  assert.equal(result.nextValue, undefined);
  assert.deepEqual(toPlainObject(result.body), { business_name: "Las Parotas" });
});

test("normaliza coordenadas y evita asignación masiva en ubicación", async () => {
  const result = await validateBody(UpdateBusinessLocationDto, {
    address: "Centro, Toluca",
    latitude: 19.4326,
    longitude: -99.1332,
    businessId: 999,
    locationId: 123,
  });

  assert.equal(result.nextValue, undefined);
  assert.deepEqual(toPlainObject(result.body), {
    address: "Centro, Toluca",
    latitude: "19.4326",
    longitude: "-99.1332",
  });
});

test("aplica whitelist también dentro de métodos y configuración bancaria", async () => {
  const result = await validateBody(UpdateBusinessPaymentMethodsDto, {
    payment_methods: [{
      method: "transfer",
      is_active: true,
      label: "Transferencia",
      config: {
        accountHolder: "Las Parotas",
        bankName: "Banco",
        clabe: "123456789012345678",
        secret: "no-debe-llegar-al-servicio",
      },
    }],
  });

  assert.equal(result.nextValue, undefined);
  assert.deepEqual(toPlainObject(result.body), {
    payment_methods: [{
      method: "transfer",
      is_active: true,
      config: {
        accountHolder: "Las Parotas",
        bankName: "Banco",
        clabe: "123456789012345678",
      },
    }],
  });
});

test("mantiene compatibilidad con la lista abreviada de métodos de pago", async () => {
  const result = await validateBody(UpdateBusinessPaymentMethodsDto, {
    payment_methods: ["cash", "card"],
  });

  assert.equal(result.nextValue, undefined);
  assert.deepEqual(toPlainObject(result.body), {
    payment_methods: [
      { method: "cash", is_active: true },
      { method: "card", is_active: true },
    ],
  });
});

test("entrega errores de validación al manejador global", async () => {
  const result = await validateBody(UpdateBusinessDeliverySettingsDto, {
    delivery_fee: -1,
  });

  assert.ok(result.nextValue instanceof HttpError);
  assert.equal(result.nextValue.statusCode, 400);
  assert.equal(result.nextValue.code, "VALIDATION_ERROR");
  assert.match(result.nextValue.message, /no son válidos/);
  assert.ok(Array.isArray(result.nextValue.details));
});
