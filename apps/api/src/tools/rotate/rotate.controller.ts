import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';
import { JobsService } from '../../jobs/jobs.service';
import { OptionalAuthGuard } from '../../auth/guards/jwt-auth.guard';

enum Rotation {
    CW_90 = 90,
    CW_180 = 180,
    CW_270 = 270,
}

class RotateDto {
    @IsString()
    fileId!: string;

    @IsEnum(Rotation)
    rotation!: Rotation;

    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    pageNumbers?: number[]; // If empty, rotate all pages
}

@ApiTags('Tools - Rotate')
@Controller('tools/rotate')
export class RotateController {
    constructor(private jobsService: JobsService) { }

    @Post()
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Rotate PDF pages' })
    async rotatePdf(@Body() dto: RotateDto, @Req() req: any) {
        const job = await this.jobsService.createJob(
            'ROTATE',
            [dto.fileId],
            {
                rotation: dto.rotation,
                pageNumbers: dto.pageNumbers,
            },
            req.user?.id,
        );

        return {
            jobId: job.id,
            status: job.status,
            message: 'Rotate job queued successfully',
        };
    }
}
