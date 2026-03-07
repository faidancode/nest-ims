import { z } from 'zod';

export const AuditLogActionSchema = z.enum([
  'INSERT',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'STATUS_CHANGE',
]);

export const ListAuditLogsQuerySchema = z.object({
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
  tableName: z.string().optional(),
  recordId: z.uuid().optional(),
  userId: z.uuid().optional(),
  action: AuditLogActionSchema.optional(),
  dateFrom: z.iso.datetime().optional(),
  dateTo: z.iso.datetime().optional(),
});

export type ListAuditLogsQuery = z.infer<typeof ListAuditLogsQuerySchema>;

export const CreateAuditLogSchema = z.object({
  userId: z.uuid().optional(),
  tableName: z
    .string({ message: 'Table name harus diisi' })
    .min(1, 'Table name tidak boleh kosong')
    .max(100, 'Table name maksimal 100 karakter'),
  recordId: z.uuid({ message: 'Record ID harus berupa UUID yang valid' }),
  action: AuditLogActionSchema,
  oldValues: z.record(z.string(), z.unknown()).optional(),
  newValues: z.record(z.string(), z.unknown()).optional(),
});

export type CreateAuditLogInput = z.infer<typeof CreateAuditLogSchema>;

