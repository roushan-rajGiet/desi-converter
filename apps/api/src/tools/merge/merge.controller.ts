import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsString } from 'class-validator';
import { JobsService } from '../../jobs/jobs.service';
import { OptionalAuthGuard } from '../../auth/guards/jwt-auth.guard';

class MergeDto {
    @IsArray()
    @ArrayMinSize(2)
    @IsString({ each: true })
    fileIds!: string[];
}

@ApiTags('Tools')
@Controller('tools')
export class MergeController {
    constructor(private jobsService: JobsService) { }

    @Post('merge')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Merge multiple PDFs into one' })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                fileIds: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 2,
                    description: 'Array of file IDs to merge',
                },
            },
        },
    })
    async mergePdfs(@Body() dto: MergeDto, @Request() req: any) {
        return this.jobsService.createMergeJob(dto.fileIds, req.user?.id);
    }
}
