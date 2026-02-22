import { NestFactory } from '@nestjs/core';
import { Logger as CommonLogger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';

import { json, urlencoded } from 'express';
import * as fs from 'fs';

async function bootstrap() {
    // Ensure temp directory exists for uploads
    const uploadDir = './temp/uploads';
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const app = await NestFactory.create(AppModule, { bufferLogs: true }); // Buffer logs until logger is attached
    const logger = app.get(Logger);
    app.useLogger(logger);

    // Initial log
    const commonLogger = new CommonLogger('Bootstrap');
    commonLogger.log(`Starting API in ${process.env.NODE_ENV || 'development'} mode...`);

    // Increase body size limit
    app.use(json({ limit: '1gb' }));
    app.use(urlencoded({ extended: true, limit: '1gb' }));

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    }));

    // CORS
    app.enableCors({
        origin: [
            process.env.FRONTEND_URL || 'http://localhost:3000',
            'http://127.0.0.1:3000',
        ],
        credentials: true,
    });

    // Validation
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // API prefix
    app.setGlobalPrefix('api');

    // Swagger Documentation
    const config = new DocumentBuilder()
        .setTitle('Desi Converter API')
        .setDescription('PDF Processing API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);

    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 API running on http://localhost:${port}`);
    console.log(`📚 Docs at http://localhost:${port}/docs`);
}

bootstrap();
