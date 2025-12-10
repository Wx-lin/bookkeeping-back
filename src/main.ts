import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('智能记账系统 API')
    .setDescription('提供记账、统计、AI 助手等功能的 RESTful API 文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // 使用 Scalar 替代默认的 Swagger UI
  app.use(
    '/api',
    apiReference({
      content: document,
      theme: 'purple', // 可选主题: 'purple', 'moon', 'solar', 'bluePlanet', 'saturn'
      darkMode: true,
    }),
  );

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors(); // Enable CORS for frontend

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
