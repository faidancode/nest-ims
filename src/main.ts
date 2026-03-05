import { NestFactory } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/http/exception.filter';
import { RequestIdInterceptor } from './common/http/request-id.interceptor';
import { LoggingInterceptor } from './common/http/logging.interceptor';
import { ResponseEnvelopeInterceptor } from './common/http/response.interceptor';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    app.get(RequestIdInterceptor),
    app.get(LoggingInterceptor),
    new ResponseEnvelopeInterceptor(),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
