import { z } from 'zod';

export const InventoryTransactionTypeSchema = z.enum([
  'IN',
  'OUT',
  'ADJUSTMENT',
  'PRODUCTION_IN',
  'PRODUCTION_OUT',
]);

export const InventoryTransactionReferenceTypeSchema = z.enum([
  'PO',
  'SO',
  'PRODUCTION',
  'MANUAL',
]);

export const ListInventoryTransactionsQuerySchema = z.object({
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

export type ListInventoryTransactionsQuery = z.infer<
  typeof ListInventoryTransactionsQuerySchema
>;

export const CreateInventoryTransactionSchema = z.object({
  partId: z.uuid({
    message: 'Part ID harus berupa UUID yang valid',
  }),
  warehouseId: z.uuid({
    message: 'Warehouse ID harus berupa UUID yang valid',
  }),
  type: InventoryTransactionTypeSchema,
  referenceType: InventoryTransactionReferenceTypeSchema,
  referenceId: z
    .uuid({
      message: 'Reference ID harus berupa UUID yang valid',
    })
    .optional(),
  quantity: z.number({
    message: 'Quantity harus berupa angka',
  }),
  quantityBefore: z.number({
    message: 'Quantity before harus berupa angka',
  }),
  quantityAfter: z.number({
    message: 'Quantity after harus berupa angka',
  }),
  notes: z.string().optional(),
});

export type CreateInventoryTransactionInput = z.infer<
  typeof CreateInventoryTransactionSchema
>;

export const UpdateInventoryTransactionSchema =
  CreateInventoryTransactionSchema.partial();
export type UpdateInventoryTransactionInput = z.infer<
  typeof UpdateInventoryTransactionSchema
>;
