# qsCome Backend

API de qsCome para pedidos, operación de negocios, realtime, pagos, órdenes compartidas y administración comercial.

## Desarrollo

```bash
npm ci
npm run dev
```

## Calidad

```bash
npm run quality
```

Incluye compilación TypeScript y pruebas unitarias.

## Migraciones

```bash
npm run migration:show
npm run migration:run
npm run migration:revert
```

## Plans & Growth

La fase activa se desarrolla en `feature/plans-growth-foundation`.

Principios principales:

- FREE debe permitir operar un negocio pequeño real.
- realtime, órdenes, kitchen y Shared Orders son capacidades core y no paywalls.
- los planes monetizan escala, inteligencia y herramientas de crecimiento.
- la publicidad es un producto opcional separado de la suscripción.
- cada negocio mantiene un plan base persistente con un trial opcional superpuesto.

Consulta `docs/plans-growth-phase.md` para el roadmap y decisiones de dominio.

## Administración de plataforma

El acceso administrativo usa un rol global `admin` en `user_roles` y nunca puede crearse desde el registro público.

Endpoints iniciales:

- `GET /api/admin/businesses`
- `GET /api/admin/businesses/:id/plan`
- `PATCH /api/admin/businesses/:id/plan`
- `POST /api/admin/businesses/:id/trial`
- `POST /api/admin/businesses/:id/trial/cancel`
- `GET /api/admin/businesses/:id/plan/history`

Todas las rutas administrativas requieren autenticación y `authorize("admin")`.
