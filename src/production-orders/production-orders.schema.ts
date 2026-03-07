import { z } from 'zod';

export const ProductionOrderStatusSchema = z.enum(['DRAFT', 'COMPLETED']);

export const ListProductionOrdersQuerySchema = z.object({
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

export type ListProductionOrdersQuery = z.infer<
  typeof ListProductionOrdersQuerySchema
>;

export const CreateProductionOrderSchema = z.object({
  poNumber: z
    .string({ message: 'PO number harus diisi' })
    .min(1, 'PO number tidak boleh kosong')
    .max(100, 'PO number maksimal 100 karakter'),
  finishedPartId: z.uuid({
    message: 'Finished part ID harus berupa UUID yang valid',
  }),
  warehouseId: z.uuid({
    message: 'Warehouse ID harus berupa UUID yang valid',
  }),
  quantity: z.number({
    message: 'Quantity harus berupa angka',
  }),
  status: ProductionOrderStatusSchema.optional().default('DRAFT'),
  productionDate: z.iso.datetime().optional(),
  notes: z.string().optional(),
});

export type CreateProductionOrderInput = z.infer<typeof CreateProductionOrderSchema>;

export const UpdateProductionOrderSchema = CreateProductionOrderSchema.partial();
export type UpdateProductionOrderInput = z.infer<typeof UpdateProductionOrderSchema>;

