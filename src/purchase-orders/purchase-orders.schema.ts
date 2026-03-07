import { z } from 'zod';

export const PurchaseOrderStatusSchema = z.enum(['DRAFT', 'RECEIVED']);

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

export type ListPurchaseOrdersQuery = z.infer<typeof ListPurchaseOrdersQuerySchema>;

export const CreatePurchaseOrderSchema = z.object({
  poNumber: z
    .string({
      message: 'PO number harus diisi',
    })
    .min(1, 'PO number tidak boleh kosong')
    .max(100, 'PO number maksimal 100 karakter'),
  supplierId: z.uuid({
    message: 'Supplier ID harus berupa UUID yang valid',
  }),
  status: PurchaseOrderStatusSchema.optional().default('DRAFT'),
  orderDate: z.iso.datetime().optional(),
  expectedDate: z.iso.datetime().optional(),
  notes: z.string().optional(),
});

export type CreatePurchaseOrderInput = z.infer<typeof CreatePurchaseOrderSchema>;

export const UpdatePurchaseOrderSchema = CreatePurchaseOrderSchema.partial();
export type UpdatePurchaseOrderInput = z.infer<typeof UpdatePurchaseOrderSchema>;
