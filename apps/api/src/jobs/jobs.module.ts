import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NAMES } from '@desi/shared';

@Module({
    imports: [
        PrismaModule,
        BullModule.registerQueue(
            { name: QUEUE_NAMES.pdf },
            { name: QUEUE_NAMES.merge },
            { name: QUEUE_NAMES.split },
            { name: QUEUE_NAMES.compress },
            { name: QUEUE_NAMES.rotate },
            { name: QUEUE_NAMES.reorder },
            { name: QUEUE_NAMES.pdfToWord },
            { name: QUEUE_NAMES.wordToPdf },
            { name: QUEUE_NAMES.ocr },
            { name: QUEUE_NAMES.protect },
            { name: QUEUE_NAMES.unlock },
            { name: QUEUE_NAMES.watermark },
            { name: QUEUE_NAMES.sign },
            { name: QUEUE_NAMES.pdfToImage },
        ),
    ],
    controllers: [JobsController],
    providers: [JobsService],
    exports: [JobsService],
})
export class JobsModule { }
