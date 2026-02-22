import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    UploadedFiles,
    Request,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard, OptionalAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FILE_LIMITS } from '@desi/shared';

@ApiTags('Files')
@Controller('files')
export class FilesController {
    constructor(private filesService: FilesService) { }

    @Post('upload')
    @UseGuards(OptionalAuthGuard)
    @UseInterceptors(FileInterceptor('file'))
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: { type: 'string', format: 'binary' },
            },
        },
    })
    @ApiOperation({ summary: 'Upload a single file' })
    async upload(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new MaxFileSizeValidator({ maxSize: FILE_LIMITS.maxSizeBytes }),
                    new FileTypeValidator({ fileType: /(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|image\/(png|jpe?g))/, skipMagicNumbersValidation: true }),
                ],
            }),
        )
        file: Express.Multer.File,
        @Request() req: any,
    ) {
        console.log(`[FilesController] Received upload request: ${file?.originalname} (${file?.size} bytes)`);
        if (!file) {
            console.error('[FilesController] No file received or file too large (Multer filtered it)');
        }
        try {
            const result = await this.filesService.uploadFile(file, req.user?.id);
            console.log(`[FilesController] Upload successful: ${result.id}`);
            return result;
        } catch (error) {
            console.error(`[FilesController] Upload error:`, error);
            throw error;
        }
    }

    @Post('upload-multiple')
    @UseGuards(OptionalAuthGuard)
    @UseInterceptors(FilesInterceptor('files', 20))
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: { type: 'array', items: { type: 'string', format: 'binary' } },
            },
        },
    })
    @ApiOperation({ summary: 'Upload multiple files' })
    async uploadMultiple(
        @UploadedFiles() files: Express.Multer.File[],
        @Request() req: any,
    ) {
        return this.filesService.uploadMultiple(files, req.user?.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get file metadata' })
    async getFile(@Param('id') id: string) {
        return this.filesService.getFile(id);
    }

    @Get(':id/download')
    @ApiOperation({ summary: 'Get download URL for a file' })
    async getDownloadUrl(@Param('id') id: string) {
        return this.filesService.getDownloadUrl(id);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a file' })
    async deleteFile(@Param('id') id: string, @Request() req: any) {
        return this.filesService.deleteFile(id, req.user.id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get user files' })
    async getUserFiles(@Request() req: any) {
        return this.filesService.getUserFiles(req.user.id);
    }
}
