import { z } from 'zod';

export const ListInventoriesQuerySchema = z.object({
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

export type ListInventoriesQuery = z.infer<typeof ListInventoriesQuerySchema>;

export const CreateInventorySchema = z.object({
  partId: z.uuid({
    message: 'Part ID harus berupa UUID yang valid',
  }),
  warehouseId: z.uuid({
    message: 'Warehouse ID harus berupa UUID yang valid',
  }),
  quantity: z
    .number({
      message: 'Quantity harus berupa angka',
    })
    .min(0, 'Quantity tidak boleh kurang dari 0'),
});

export type CreateInventoryInput = z.infer<typeof CreateInventorySchema>;

export const UpdateInventorySchema = CreateInventorySchema.partial();
export type UpdateInventoryInput = z.infer<typeof UpdateInventorySchema>;
