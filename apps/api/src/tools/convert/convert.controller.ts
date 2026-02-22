import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { JobsService } from '../../jobs/jobs.service';
import { OptionalAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JOB_TYPES } from '@desi/shared';

class PdfToWordDto {
    @IsString()
    fileId!: string;
}

class WordToPdfDto {
    @IsString()
    fileId!: string;
}

class OcrDto {
    @IsString()
    fileId!: string;

    @IsOptional()
    @IsString()
    language?: string;
}

class PdfToImageDto {
    @IsString()
    fileId!: string;

    @IsOptional()
    @IsString()
    format?: 'png' | 'jpg';

    @IsOptional()
    @IsNumber()
    dpi?: number;
}

@ApiTags('Tools - Convert')
@Controller('tools')
export class ConvertController {
    constructor(private jobsService: JobsService) { }

    @Post('pdf-to-word')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Convert PDF to Word' })
    async pdfToWord(@Body() dto: PdfToWordDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.PDF_TO_WORD, [dto.fileId], {}, req.user?.id);
    }

    @Post('word-to-pdf')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Convert Word to PDF' })
    async wordToPdf(@Body() dto: WordToPdfDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.WORD_TO_PDF, [dto.fileId], {}, req.user?.id);
    }

    @Post('ocr')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'OCR PDF' })
    async ocr(@Body() dto: OcrDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.OCR, [dto.fileId], { language: dto.language }, req.user?.id);
    }

    @Post('pdf-to-image')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Convert PDF to Image' })
    async pdfToImage(@Body() dto: PdfToImageDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.PDF_TO_IMAGE, [dto.fileId], { format: dto.format, dpi: dto.dpi }, req.user?.id);
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
