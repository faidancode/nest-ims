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
  name: z
    .string({
      message: 'Nama warehouse harus diisi',
    })
    .min(1, 'Nama warehouse tidak boleh kosong')
    .max(255, 'Nama warehouse maksimal 255 karakter'),
  location: z
    .string({
      message: 'Lokasi harus berupa string',
    })
    .max(500, 'Lokasi maksimal 500 karakter')
    .optional(),
  active: z
    .boolean({
      message: 'Status aktif harus berupa boolean',
    })
    .optional()
    .default(true),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseSchema>;

export const UpdateWarehouseSchema = CreateWarehouseSchema.partial();
export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;
