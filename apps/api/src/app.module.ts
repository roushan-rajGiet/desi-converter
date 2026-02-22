import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { JobsModule } from './jobs/jobs.module';
import { ToolsModule } from './tools/tools.module';
import { HealthModule } from './health/health.module';
import { AdminModule } from './admin/admin.module';

import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './cron/cleanup.service';
import { LoggerModule } from 'nestjs-pino';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        ScheduleModule.forRoot(),
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 100, // 100 requests per minute
        }]),
        LoggerModule.forRoot({
            pinoHttp: {
                autoLogging: false,
                serializers: {
                    req: (req) => ({
                        id: req.headers['x-request-id'],
                        method: req.method,
                        url: req.url,
                    }),
                },
            },
        }),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379', 10),
            },
        }),
        PrismaModule,
        StorageModule,
        AuthModule,
        FilesModule,
        JobsModule,
        ToolsModule,
        HealthModule,
        AdminModule,
    ],
    providers: [
        CleanupService,
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestIdMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
