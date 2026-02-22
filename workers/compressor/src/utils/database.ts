import { PrismaClient } from '@desi/prisma';

const prisma = new PrismaClient();

export async function updateJobStatus(
    jobId: string,
    status: 'PROCESSING' | 'COMPLETED' | 'FAILED',
    error?: string,
) {
    const data: any = { status };

    if (status === 'PROCESSING') {
        data.startedAt = new Date();
    } else if (status === 'COMPLETED' || status === 'FAILED') {
        data.completedAt = new Date();
    }

    if (error) {
        data.error = error;
    }

    await prisma.job.update({
        where: { id: jobId },
        data,
    });
}

export async function updateJobProgress(jobId: string, progress: number) {
    await prisma.job.update({
        where: { id: jobId },
        data: { progress },
    });
}

export async function getInputFiles(jobId: string) {
    const jobFiles = await prisma.jobFile.findMany({
        where: { jobId, isInput: true },
        include: { inputFile: true },
        orderBy: { order: 'asc' },
    });

    return jobFiles.map((jf) => jf.inputFile).filter((f) => f !== null);
}

export async function createOutputFile(
    jobId: string,
    storageKey: string,
    size: number,
    originalName: string,
    mimeType: string,
) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const file = await prisma.file.create({
        data: {
            name: storageKey.split('/').pop() || 'output',
            originalName,
            size,
            mimeType,
            storageKey,
            type: 'OUTPUT',
            expiresAt,
        },
    });

    await prisma.jobFile.create({
        data: {
            jobId,
            fileId: file.id,
            isInput: false,
            order: 0,
        },
    });

    return file;
}

export { prisma };
