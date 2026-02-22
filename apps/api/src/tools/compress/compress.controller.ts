import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray } from 'class-validator';
import { JobsService } from '../../jobs/jobs.service';
import { OptionalAuthGuard } from '../../auth/guards/jwt-auth.guard';

enum CompressionLevel {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
}

class CompressDto {
    @IsArray()
    @IsString({ each: true })
    fileIds!: string[];

    @IsEnum(CompressionLevel)
    level!: CompressionLevel;
}

@ApiTags('Tools - Compress')
@Controller('tools/compress')
export class CompressController {
    constructor(private jobsService: JobsService) { }

    @Post()
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Compress PDFs or images to reduce file size' })
    async compressPdf(@Body() dto: CompressDto, @Req() req: any) {
        const job = await this.jobsService.createJob(
            'COMPRESS',
            dto.fileIds,
            { compressionLevel: dto.level },
            req.user?.id,
        );

        return {
            jobId: job.id,
            status: job.status,
            message: 'Compression job queued successfully',
        };
    }
}
