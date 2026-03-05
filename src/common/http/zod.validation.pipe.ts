// src/common/http/zod-validation.pipe.ts

import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import * as z from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodTypeAny) { }

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transformasi array issues menjadi object key-value
        const formattedErrors = error.issues.reduce((acc, issue) => {
          const path = issue.path.join('.');
          acc[path] = issue.message;
          return acc;
        }, {} as Record<string, string>);

        throw new BadRequestException({
          status: 'error',
          message: 'Input data tidak valid',
          errors: formattedErrors, // Frontend tinggal panggil: errors.name
          type: metadata.type,
        });
      }
      throw error;
    }
  }
}
