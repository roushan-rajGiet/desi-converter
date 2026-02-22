import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { JwtAuthGuard, OptionalAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
    constructor(private jobsService: JobsService) { }

    @Get(':id')
    @UseGuards(OptionalAuthGuard)
    @ApiOperation({ summary: 'Get job status' })
    async getJobStatus(@Param('id') id: string) {
        return this.jobsService.getJobStatus(id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user job history' })
    async getUserJobs(@Request() req: any) {
        return this.jobsService.getUserJobs(req.user.id);
    }
}
