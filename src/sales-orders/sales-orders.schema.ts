import { z } from 'zod';

export const SalesOrderStatusSchema = z.enum([
  'DRAFT',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
]);

export const ListSalesOrdersQuerySchema = z.object({
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

export type ListSalesOrdersQuery = z.infer<typeof ListSalesOrdersQuerySchema>;

export const CreateSalesOrderSchema = z.object({
  soNumber: z
    .string({
      message: 'SO number harus diisi',
    })
    .min(1, 'SO number tidak boleh kosong')
    .max(100, 'SO number maksimal 100 karakter'),
  customerId: z.uuid({
    message: 'Customer ID harus berupa UUID yang valid',
  }),
  status: SalesOrderStatusSchema.optional().default('DRAFT'),
  orderDate: z.iso.datetime().optional(),
  expectedDate: z.iso.datetime().optional(),
  notes: z.string().optional(),
});

export type CreateSalesOrderInput = z.infer<typeof CreateSalesOrderSchema>;

export const UpdateSalesOrderSchema = CreateSalesOrderSchema.partial();
export type UpdateSalesOrderInput = z.infer<typeof UpdateSalesOrderSchema>;
