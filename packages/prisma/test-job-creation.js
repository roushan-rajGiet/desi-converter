
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to create PDF_TO_WORD job...');
    try {
        const job = await prisma.job.create({
            data: {
                type: 'PDF_TO_WORD',
                status: 'UPLOADED',
                // We'll skip userId for simplicity, or use a dummy one if needed (it's nullable in schema? let's check. Yes nullable)
                files: {
                    create: []
                }
            }
        });
        console.log('Job created successfully:', job);
    } catch (e) {
        console.error('Job creation failed:', e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
