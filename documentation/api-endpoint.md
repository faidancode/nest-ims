# 📘 IMS API Documentation
> **Stack:** NestJS · TypeORM · MySQL  
> **Base URL:** `/api/v1`  
> **Auth:** Bearer JWT  
> **Soft Delete:** All `DELETE` endpoints perform soft delete  

---

## Table of Contents

1. [Auth](#1-auth)
2. [Users](#2-users)
3. [RBAC — Roles](#3-rbac--roles)
4. [RBAC — Permissions](#4-rbac--permissions)
5. [RBAC — User Roles](#5-rbac--user-roles)
6. [Warehouses](#6-warehouses)
7. [Parts](#7-parts)
8. [Suppliers](#8-suppliers)
9. [Customers](#9-customers)
10. [Inventories](#10-inventories)
11. [Inventory Transactions](#11-inventory-transactions)
12. [Purchase Orders](#12-purchase-orders)
13. [Purchase Order Items](#13-purchase-order-items)
14. [Sales Orders](#14-sales-orders)
15. [Sales Order Items](#15-sales-order-items)
16. [Bill of Materials](#16-bill-of-materials)
17. [Production Orders](#17-production-orders)
18. [Audit Logs](#18-audit-logs)
19. [Reports](#19-reports-optional)
20. [NestJS Module Structure](#20-nestjs-module-structure)

---

## 1. Auth

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/auth/login` | Login, return JWT access + refresh token | Public |
| POST | `/auth/logout` | Invalidate token | Authenticated |
| POST | `/auth/refresh` | Refresh access token | Public |
| GET | `/auth/me` | Get current user profile | Authenticated |
| PATCH | `/auth/me/password` | Change own password | Authenticated |

---

## 2. Users

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users` | List all users (paginated) | `READ:users` |
| POST | `/users` | Create user | `CREATE:users` |
| GET | `/users/:id` | Get user detail | `READ:users` |
| PATCH | `/users/:id` | Update user | `UPDATE:users` |
| DELETE | `/users/:id` | Soft delete user | `DELETE:users` |
| PATCH | `/users/:id/activate` | Activate / deactivate user | `UPDATE:users` |
| GET | `/users/:id/roles` | Get roles assigned to user | `READ:users` |

---

## 3. RBAC — Roles

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/roles` | List all roles | `READ:roles` |
| POST | `/roles` | Create role | `CREATE:roles` |
| GET | `/roles/:id` | Get role detail | `READ:roles` |
| PATCH | `/roles/:id` | Update role | `UPDATE:roles` |
| DELETE | `/roles/:id` | Soft delete role | `DELETE:roles` |
| GET | `/roles/:id/permissions` | List permissions on a role | `READ:roles` |
| POST | `/roles/:id/permissions` | Assign permissions to role | `UPDATE:roles` |
| DELETE | `/roles/:id/permissions/:permissionId` | Remove permission from role | `UPDATE:roles` |

---

## 4. RBAC — Permissions

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/permissions` | List all permissions | `READ:permissions` |
| POST | `/permissions` | Create permission | `CREATE:permissions` |
| GET | `/permissions/:id` | Get permission detail | `READ:permissions` |
| PATCH | `/permissions/:id` | Update permission | `UPDATE:permissions` |
| DELETE | `/permissions/:id` | Soft delete permission | `DELETE:permissions` |

---

## 5. RBAC — User Roles

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/users/:id/roles` | Assign role to user | `UPDATE:users` |
| DELETE | `/users/:id/roles/:roleId` | Remove role from user | `UPDATE:users` |

---

## 6. Warehouses

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/warehouses` | List all warehouses | `READ:warehouses` |
| POST | `/warehouses` | Create warehouse | `CREATE:warehouses` |
| GET | `/warehouses/:id` | Get warehouse detail | `READ:warehouses` |
| PATCH | `/warehouses/:id` | Update warehouse | `UPDATE:warehouses` |
| DELETE | `/warehouses/:id` | Soft delete warehouse | `DELETE:warehouses` |
| GET | `/warehouses/:id/inventories` | List stock per part in warehouse | `READ:inventories` |

---

## 7. Parts

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/parts` | List all parts — filter by `?type=RAW\|FINISHED` | `READ:parts` |
| POST | `/parts` | Create part | `CREATE:parts` |
| GET | `/parts/:id` | Get part detail | `READ:parts` |
| PATCH | `/parts/:id` | Update part | `UPDATE:parts` |
| DELETE | `/parts/:id` | Soft delete part | `DELETE:parts` |
| GET | `/parts/:id/inventories` | Stock of this part across all warehouses | `READ:inventories` |
| GET | `/parts/:id/transactions` | Transaction history for this part | `READ:inventory_transactions` |

---

## 8. Suppliers

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/suppliers` | List all suppliers | `READ:suppliers` |
| POST | `/suppliers` | Create supplier | `CREATE:suppliers` |
| GET | `/suppliers/:id` | Get supplier detail | `READ:suppliers` |
| PATCH | `/suppliers/:id` | Update supplier | `UPDATE:suppliers` |
| DELETE | `/suppliers/:id` | Soft delete supplier | `DELETE:suppliers` |
| GET | `/suppliers/:id/purchase-orders` | List POs from this supplier | `READ:purchase_orders` |

---

## 9. Customers

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/customers` | List all customers | `READ:customers` |
| POST | `/customers` | Create customer | `CREATE:customers` |
| GET | `/customers/:id` | Get customer detail | `READ:customers` |
| PATCH | `/customers/:id` | Update customer | `UPDATE:customers` |
| DELETE | `/customers/:id` | Soft delete customer | `DELETE:customers` |
| GET | `/customers/:id/sales-orders` | List SOs for this customer | `READ:sales_orders` |

---

## 10. Inventories

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/inventories` | List all stock — filter by `?part_id` / `?warehouse_id` | `READ:inventories` |
| GET | `/inventories/:id` | Get inventory detail | `READ:inventories` |
| POST | `/inventories/adjustment` | Manual stock adjustment — creates transaction automatically | `CREATE:inventories` |
| GET | `/inventories/low-stock` | List stock at or below minimum threshold | `READ:inventories` |

> ⚠️ **Note:** `inventories` is a **stock cache table**. Direct `POST` / `PATCH` / `DELETE` are not exposed — stock is mutated only via Adjustment, PO Receive, SO Complete, and Production Order Complete.

---

## 11. Inventory Transactions

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/inventory-transactions` | List all transactions — filter by `?type` / `?part_id` / `?warehouse_id` / `?date_from` / `?date_to` | `READ:inventory_transactions` |
| GET | `/inventory-transactions/:id` | Get transaction detail | `READ:inventory_transactions` |

> ⚠️ **Note:** Transactions are **immutable**. No `POST` / `PATCH` / `DELETE`. Created automatically by the system when:
> - PO is **received**
> - SO is **completed**
> - Production Order is **completed**
> - Manual **adjustment** is submitted

**Transaction types:**

| Type | Trigger |
|------|---------|
| `IN` | PO received |
| `OUT` | SO completed |
| `ADJUSTMENT` | Manual adjustment |
| `PRODUCTION_IN` | Production Order completed — finished goods in |
| `PRODUCTION_OUT` | Production Order completed — raw materials out |

---

## 12. Purchase Orders

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/purchase-orders` | List all POs — filter by `?status` / `?supplier_id` / `?date_from` / `?date_to` | `READ:purchase_orders` |
| POST | `/purchase-orders` | Create PO — initial status: `DRAFT` | `CREATE:purchase_orders` |
| GET | `/purchase-orders/:id` | Get PO detail with items | `READ:purchase_orders` |
| PATCH | `/purchase-orders/:id` | Update PO — only when `DRAFT` | `UPDATE:purchase_orders` |
| DELETE | `/purchase-orders/:id` | Soft delete PO — only when `DRAFT` | `DELETE:purchase_orders` |
| PATCH | `/purchase-orders/:id/approve` | Approve PO — sets `approved_by` | `APPROVE:purchase_orders` |
| PATCH | `/purchase-orders/:id/receive` | Receive PO → status `RECEIVED`, update stock, create `IN` transactions | `UPDATE:purchase_orders` |

**Status flow:**

```
DRAFT → (approve) → DRAFT[approved] → (receive) → RECEIVED
```

---

## 13. Purchase Order Items

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/purchase-orders/:id/items` | Add item to PO | `UPDATE:purchase_orders` |
| PATCH | `/purchase-orders/:id/items/:itemId` | Update item — only when `DRAFT` | `UPDATE:purchase_orders` |
| DELETE | `/purchase-orders/:id/items/:itemId` | Remove item — only when `DRAFT` | `UPDATE:purchase_orders` |

---

## 14. Sales Orders

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/sales-orders` | List all SOs — filter by `?status` / `?customer_id` / `?date_from` / `?date_to` | `READ:sales_orders` |
| POST | `/sales-orders` | Create SO — initial status: `DRAFT` | `CREATE:sales_orders` |
| GET | `/sales-orders/:id` | Get SO detail with items | `READ:sales_orders` |
| PATCH | `/sales-orders/:id` | Update SO — only when `DRAFT` | `UPDATE:sales_orders` |
| DELETE | `/sales-orders/:id` | Soft delete SO — only when `DRAFT` | `DELETE:sales_orders` |
| PATCH | `/sales-orders/:id/approve` | Approve SO → status `CONFIRMED`, sets `approved_by` | `APPROVE:sales_orders` |
| PATCH | `/sales-orders/:id/complete` | Complete SO → status `COMPLETED`, deduct stock, create `OUT` transactions | `UPDATE:sales_orders` |
| PATCH | `/sales-orders/:id/cancel` | Cancel SO → status `CANCELLED` | `UPDATE:sales_orders` |

**Status flow:**

```
DRAFT → (approve) → CONFIRMED → (complete) → COMPLETED
                              → (cancel)  → CANCELLED
```

---

## 15. Sales Order Items

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/sales-orders/:id/items` | Add item to SO | `UPDATE:sales_orders` |
| PATCH | `/sales-orders/:id/items/:itemId` | Update item — only when `DRAFT` | `UPDATE:sales_orders` |
| DELETE | `/sales-orders/:id/items/:itemId` | Remove item — only when `DRAFT` | `UPDATE:sales_orders` |

---

## 16. Bill of Materials

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/bill-of-materials` | List all BOM entries | `READ:bill_of_materials` |
| POST | `/bill-of-materials` | Create BOM entry | `CREATE:bill_of_materials` |
| GET | `/bill-of-materials/:id` | Get BOM detail | `READ:bill_of_materials` |
| PATCH | `/bill-of-materials/:id` | Update BOM entry | `UPDATE:bill_of_materials` |
| DELETE | `/bill-of-materials/:id` | Soft delete BOM entry | `DELETE:bill_of_materials` |
| GET | `/bill-of-materials/by-finished/:partId` | Get full BOM for a finished part — lists all required raw materials | `READ:bill_of_materials` |

---

## 17. Production Orders

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/production-orders` | List all production orders — filter by `?status` / `?date_from` / `?date_to` | `READ:production_orders` |
| POST | `/production-orders` | Create production order — initial status: `DRAFT` | `CREATE:production_orders` |
| GET | `/production-orders/:id` | Get production order detail | `READ:production_orders` |
| PATCH | `/production-orders/:id` | Update production order — only when `DRAFT` | `UPDATE:production_orders` |
| DELETE | `/production-orders/:id` | Soft delete — only when `DRAFT` | `DELETE:production_orders` |
| PATCH | `/production-orders/:id/approve` | Approve production order — sets `approved_by` | `APPROVE:production_orders` |
| PATCH | `/production-orders/:id/complete` | Complete → status `COMPLETED`, deduct RAW stock (`PRODUCTION_OUT`), add FINISHED stock (`PRODUCTION_IN`), create transactions | `UPDATE:production_orders` |

**Status flow:**

```
DRAFT → (approve) → DRAFT[approved] → (complete) → COMPLETED
```

---

## 18. Audit Logs

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/audit-logs` | List audit logs — filter by `?table_name` / `?record_id` / `?user_id` / `?action` / `?date_from` / `?date_to` | `READ:audit_logs` |
| GET | `/audit-logs/:id` | Get audit log detail | `READ:audit_logs` |

> ⚠️ **Note:** Audit logs are **read-only**. Written automatically by the system on every significant data change.

**Action types:**

| Action | Description |
|--------|-------------|
| `INSERT` | New record created |
| `UPDATE` | Record updated |
| `DELETE` | Record soft deleted |
| `APPROVE` | Record approved |
| `STATUS_CHANGE` | Status changed |

---

## 19. Reports *(optional)*

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/reports/stock-summary` | Total stock per warehouse | `READ:reports` |
| GET | `/reports/stock-movement` | Stock in/out per period — filter by `?date_from` / `?date_to` | `READ:reports` |
| GET | `/reports/low-stock` | Parts at or below threshold | `READ:reports` |
| GET | `/reports/purchase-summary` | Total PO per supplier per period | `READ:reports` |
| GET | `/reports/sales-summary` | Total SO per customer per period | `READ:reports` |
| GET | `/reports/production-summary` | Total production per period | `READ:reports` |

---

## 20. NestJS Module Structure

```
src/
├── app.module.ts
├── auth/
│   └── auth.module.ts
├── users/
│   └── users.module.ts
├── roles/
│   └── roles.module.ts
├── permissions/
│   └── permissions.module.ts
├── warehouses/
│   └── warehouses.module.ts
├── parts/
│   └── parts.module.ts
├── suppliers/
│   └── suppliers.module.ts
├── customers/
│   └── customers.module.ts
├── inventories/
│   └── inventories.module.ts
├── inventory-transactions/
│   └── inventory-transactions.module.ts
├── purchase-orders/
│   └── purchase-orders.module.ts
├── sales-orders/
│   └── sales-orders.module.ts
├── bill-of-materials/
│   └── bill-of-materials.module.ts
├── production-orders/
│   └── production-orders.module.ts
├── audit-logs/
│   └── audit-logs.module.ts
├── reports/
│   └── reports.module.ts
└── common/
    ├── guards/
    │   └── rbac.guard.ts
    ├── decorators/
    │   └── require-permission.decorator.ts
    └── interceptors/
        └── audit-log.interceptor.ts
```

### RBAC Guard Pattern

```typescript
// Decorator usage on endpoint
@RequirePermission('APPROVE', 'purchase_orders')
@Patch(':id/approve')
approve(@Param('id') id: string) { ... }
```

```typescript
// Guard reads permissions from JWT payload
@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { action, resource } = this.reflector.get('permission', context.getHandler());
    const user = context.switchToHttp().getRequest().user;
    return user.permissions.some(p => p.action === action && p.resource === resource);
  }
}
```

---

*Generated for IMS — Autopart Factory*  
*Stack: NestJS · TypeORM · MySQL · JWT · RBAC*