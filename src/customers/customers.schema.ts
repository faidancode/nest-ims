import { z } from 'zod';

export const ListCustomersQuerySchema = z.object({
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

export type ListCustomersQuery = z.infer<typeof ListCustomersQuerySchema>;

export const CreateCustomerSchema = z.object({
  name: z
    .string({
      message: 'Nama customer harus diisi',
    })
    .min(1, 'Nama customer tidak boleh kosong')
    .max(255, 'Nama customer maksimal 255 karakter'),
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
  isActive: z
    .boolean({
      message: 'Status aktif harus berupa boolean',
    })
    .optional()
    .default(true),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
