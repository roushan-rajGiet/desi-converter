import { Module } from '@nestjs/common';
import { MergeController } from './merge/merge.controller';
import { SplitController } from './split/split.controller';
import { CompressController } from './compress/compress.controller';
import { RotateController } from './rotate/rotate.controller';
import { ConvertController } from './convert/convert.controller';
import { SecurityController } from './security/security.controller';
import { EditController } from './edit/edit.controller';

import { PrismaModule } from '../prisma/prisma.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
    imports: [PrismaModule, JobsModule],
    controllers: [
        MergeController,
        SplitController,
        CompressController,
        RotateController,
        ConvertController,
        SecurityController,
        EditController,
    ],
})
export class ToolsModule { }
