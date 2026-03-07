import { z } from 'zod';

export const ListBillOfMaterialsQuerySchema = z.object({
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

export type ListBillOfMaterialsQuery = z.infer<
  typeof ListBillOfMaterialsQuerySchema
>;

export const CreateBillOfMaterialSchema = z.object({
  finishedPartId: z.uuid({
    message: 'Finished part ID harus berupa UUID yang valid',
  }),
  rawPartId: z.uuid({
    message: 'Raw part ID harus berupa UUID yang valid',
  }),
  quantity: z.number({
    message: 'Quantity harus berupa angka',
  }),
  unit: z
    .string({
      message: 'Unit harus diisi',
    })
    .min(1, 'Unit tidak boleh kosong')
    .max(50, 'Unit maksimal 50 karakter'),
});

export type CreateBillOfMaterialInput = z.infer<typeof CreateBillOfMaterialSchema>;

export const UpdateBillOfMaterialSchema = CreateBillOfMaterialSchema.partial();
export type UpdateBillOfMaterialInput = z.infer<typeof UpdateBillOfMaterialSchema>;

