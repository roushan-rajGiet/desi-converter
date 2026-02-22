
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const lastFailedJob = await prisma.job.findFirst({
        where: {
            status: 'FAILED',
        },
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            files: true
        }
    });

    console.log(JSON.stringify(lastFailedJob, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
