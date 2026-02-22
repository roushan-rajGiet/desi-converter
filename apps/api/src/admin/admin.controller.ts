
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service';
// import { AdminGuard } from '../common/guards/admin.guard'; // TO DO: Implement Auth

@Controller('admin')
export class AdminController {
    constructor(private readonly jobsService: JobsService) { }

    @Get('stats')
    async getStats() {
        return this.jobsService.getSystemStats();
    }
}
