import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, IsEnum } from 'class-validator';
import { JobsService } from '../../jobs/jobs.service';
import { OptionalAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JOB_TYPES } from '@desi/shared';

class WatermarkDto {
    @IsString()
    fileId!: string;

    @IsString()
    text!: string; // Used for text watermark or alt text

    @IsOptional()
    @IsNumber()
    size?: number;

    @IsOptional()
    @IsString()
    color?: string;

    @IsOptional()
    @IsNumber()
    opacity?: number;

    @IsOptional()
    @IsString()
    type?: 'text' | 'image';

    @IsOptional()
    @IsString()
    watermarkFileId?: string;

    @IsOptional()
    @IsString()
    position?: string;
}

class ReorderDto {
    @IsString()
    fileId!: string;

    @IsArray()
    @IsNumber({}, { each: true })
    limit_order!: number[]; // New page order (e.g. [3, 1, 2])
}

@ApiTags('Tools - Edit')
@Controller('tools')
export class EditController {
    constructor(private jobsService: JobsService) { }

    @Post('watermark')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add Watermark to PDF' })
    async watermark(@Body() dto: WatermarkDto, @Req() req: any) {
        const fileIds = [dto.fileId];
        if (dto.watermarkFileId) {
            fileIds.push(dto.watermarkFileId);
        }

        return this.createJob(JOB_TYPES.WATERMARK, fileIds, {
            text: dto.text,
            size: dto.size,
            color: dto.color,
            opacity: dto.opacity,
            type: dto.type || 'text',
            watermarkFileId: dto.watermarkFileId,
            position: dto.position || 'center'
        }, req.user?.id);
    }

    @Post('reorder')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reorder PDF pages' })
    async reorder(@Body() dto: ReorderDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.REORDER, [dto.fileId], { order: dto.limit_order }, req.user?.id);
    }

    private async createJob(type: string, fileIds: string[], metadata: any, userId?: string) {
        const job = await this.jobsService.createJob(type, fileIds, metadata, userId);
        return {
            jobId: job.id,
            status: job.status,
            message: `${type} job queued successfully`,
        };
    }
}
