import { z } from 'zod';

export const ListSuppliersQuerySchema = z.object({
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

export type ListSuppliersQuery = z.infer<typeof ListSuppliersQuerySchema>;

export const CreateSupplierSchema = z.object({
  name: z
    .string({
      message: 'Nama supplier harus diisi',
    })
    .min(1, 'Nama supplier tidak boleh kosong')
    .max(255, 'Nama supplier maksimal 255 karakter'),
  contactName: z
    .string({
      message: 'Nama kontak harus berupa string',
    })
    .max(255, 'Nama kontak maksimal 255 karakter')
    .optional(),
  email: z
    .email({
      message: 'Format email tidak valid',
    })
    .max(255, 'Email maksimal 255 karakter')
    .optional(),
  phone: z
    .string({
      message: 'Nomor telepon harus berupa string',
    })
    .max(100, 'Nomor telepon maksimal 100 karakter')
    .optional(),
  address: z
    .string({
      message: 'Alamat harus berupa string',
    })
    .optional(),
  active: z
    .boolean({
      message: 'Status aktif harus berupa boolean',
    })
    .optional()
    .default(true),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

export const UpdateSupplierSchema = CreateSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof UpdateSupplierSchema>;
