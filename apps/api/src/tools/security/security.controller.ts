import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { JobsService } from '../../jobs/jobs.service';
import { OptionalAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JOB_TYPES } from '@desi/shared';

class ProtectDto {
    @IsString()
    fileId!: string;

    @IsString()
    password!: string;

    @IsOptional()
    @IsString()
    ownerPassword?: string;
}

class UnlockDto {
    @IsString()
    fileId!: string;

    @IsString()
    password!: string;
}

class SignDto {
    @IsString()
    fileId!: string;

    @IsString()
    text!: string;

    @IsOptional()
    @IsString()
    style?: string;
}

@ApiTags('Tools - Security')
@Controller('tools')
export class SecurityController {
    constructor(private jobsService: JobsService) { }

    @Post('protect')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Protect PDF with password' })
    async protect(@Body() dto: ProtectDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.PROTECT, [dto.fileId], { password: dto.password, ownerPassword: dto.ownerPassword }, req.user?.id);
    }

    @Post('unlock')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Unlock PDF with password' })
    async unlock(@Body() dto: UnlockDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.UNLOCK, [dto.fileId], { password: dto.password }, req.user?.id);
    }

    @Post('sign')
    @UseGuards(OptionalAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Sign PDF' })
    async sign(@Body() dto: SignDto, @Req() req: any) {
        return this.createJob(JOB_TYPES.SIGN, [dto.fileId], { text: dto.text, style: dto.style }, req.user?.id);
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
