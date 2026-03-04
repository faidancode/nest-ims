import { z } from 'zod';

export const ListWarehousesQuerySchema = z.object({
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

export type ListWarehousesQuery = z.infer<typeof ListWarehousesQuerySchema>;

export const CreateWarehouseSchema = z.object({
  name: z.string().min(1).max(255),
  location: z.string().max(500).optional(),
  active: z.boolean().optional().default(true),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial();
export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;
