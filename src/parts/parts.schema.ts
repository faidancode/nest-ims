import { z } from 'zod';

export const ListPartsQuerySchema = z.object({
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

export type ListPartsQuery = z.infer<typeof ListPartsQuerySchema>;

export const CreatePartSchema = z.object({
  partNumber: z
    .string({
      message: 'Part number harus diisi',
    })
    .min(1, 'Part number tidak boleh kosong')
    .max(100, 'Part number maksimal 100 karakter'),
  name: z
    .string({
      message: 'Nama part harus diisi',
    })
    .min(1, 'Nama part tidak boleh kosong')
    .max(255, 'Nama part maksimal 255 karakter'),
  description: z
    .string({
      message: 'Deskripsi harus berupa string',
    })
    .optional(),
  type: z.enum(['RAW', 'FINISHED'], {
    message: 'Type part harus RAW atau FINISHED',
  }),
  unit: z
    .string({
      message: 'Unit harus diisi',
    })
    .min(1, 'Unit tidak boleh kosong')
    .max(50, 'Unit maksimal 50 karakter'),
});

export type CreatePartInput = z.infer<typeof CreatePartSchema>;

export const UpdatePartSchema = CreatePartSchema.partial();
export type UpdatePartInput = z.infer<typeof UpdatePartSchema>;
