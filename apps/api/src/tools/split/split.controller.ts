import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';
import { JobsService } from '../../jobs/jobs.service';
import { OptionalAuthGuard } from '../../auth/guards/jwt-auth.guard';

enum SplitMode {
    PAGES = 'pages',
    RANGES = 'ranges',
    EXTRACT = 'extract',
}

class SplitDto {
    @IsString()
    fileId!: string;

    @IsEnum(SplitMode)
    mode!: SplitMode;

    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    pages?: number[];

    @IsOptional()
    @IsString()
    ranges?: string; // e.g., "1-3,5,7-10"
}

@ApiTags('Tools - Split')
@Controller('tools/split')
export class SplitController {
    constructor(private jobsService: JobsService) { }

    @Post()
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Split a PDF into multiple documents' })
    async splitPdf(@Body() dto: SplitDto, @Req() req: any) {
        const job = await this.jobsService.createJob(
            'SPLIT',
            [dto.fileId],
            {
                splitMode: dto.mode,
                pages: dto.pages,
                ranges: dto.ranges,
            },
            req.user?.id,
        );

        return {
            jobId: job.id,
            status: job.status,
            message: 'Split job queued successfully',
        };
    }
}
