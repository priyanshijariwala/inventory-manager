# Inventory Manager API

NestJS REST API for inventory management with:
- JWT authentication + RBAC (`manager`, `staff`)
- Categories and products (product soft-delete)
- Transactional stock movements with pessimistic locking
- Low-stock alerts and stock update events via Socket.IO gateway
- Swagger docs at `/api/docs`

## Setup

1. Copy `.env.example` to `.env` and update values.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run:
   ```bash
   npm run start:dev
   ```

## Default users (auto-created on startup)

- Manager: `manager@example.com` / `manager123`
- Staff: `staff@example.com` / `staff123`

## Core endpoints

- Auth: `POST /auth/login`
- Categories: `GET /categories`, `POST/PATCH/DELETE /categories/:id` (manager write)
- Products: `GET /products`, `GET /products/:id`, `GET /products/low-stock`,
  `POST/PATCH/DELETE /products/:id` (manager write, delete is soft-delete)
- Stock movements:
  - `POST /stock-movements` (staff + manager)
  - `GET /stock-movements`
  - `GET /stock-movements/product/:productId`
  - `GET /stock-movements/report` (manager)

## WebSocket

- Namespace: `/inventory`
- Events:
  - `stock_updated`
  - `low_stock_alert`
