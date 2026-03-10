import { z } from 'zod';

export const PurchaseOrderStatusSchema = z.enum(['DRAFT', 'RECEIVED']);

// 1. Skema untuk Item (Baris Barang)
export const PurchaseOrderItemSchema = z.object({
  id: z.uuid().optional(), // Opsional untuk Create, biasanya ada saat Edit
  partId: z.uuid({ message: 'Part ID harus berupa UUID' }),
  quantity: z.number().int().min(1, 'Minimal quantity adalah 1'),
  unitPrice: z.number().min(0, 'Harga tidak boleh negatif'),
});

export const ListPurchaseOrdersQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().min(1).max(100)),
  q: z.string().optional(),
  search: z.string().optional(),
  sort: z
    .string()
    .optional()
    .transform((v) => v ?? 'createdAt:desc'),
});

// 2. Skema untuk Create (Header + Items)
export const CreatePurchaseOrderSchema = z.object({
  poNumber: z.string().optional(),
  supplierId: z.uuid({
    message: 'Supplier ID harus berupa UUID yang valid',
  }),
  status: PurchaseOrderStatusSchema.default('DRAFT'),
  orderDate: z.iso.datetime().optional(),
  expectedDate: z.iso.datetime().optional(),
  notes: z.string().optional().nullable(),
  // TAMBAHKAN INI: Minimal harus ada 1 item
  items: z
    .array(PurchaseOrderItemSchema)
    .min(1, 'Minimal harus ada 1 item barang'),
});

export type CreatePurchaseOrderInput = z.infer<
  typeof CreatePurchaseOrderSchema
>;

// 3. Skema untuk Update
// Gunakan .extend jika ada field yang perilakunya berbeda saat update
export const UpdatePurchaseOrderSchema = CreatePurchaseOrderSchema.partial();

export type UpdatePurchaseOrderInput = z.infer<
  typeof UpdatePurchaseOrderSchema
>;

export type ListPurchaseOrdersQuery = z.infer<
  typeof ListPurchaseOrdersQuerySchema
>;
