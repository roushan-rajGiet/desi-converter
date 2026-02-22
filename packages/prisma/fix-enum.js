
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const types = [
        'PDF_TO_WORD',
        'WORD_TO_PDF',
        'OCR',
        'PDF_TO_IMAGE',
        'PROTECT',
        'UNLOCK',
        'WATERMARK',
        'SIGN'
    ];

    for (const type of types) {
        try {
            console.log(`Adding ${type} to JobType enum...`);
            await prisma.$executeRawUnsafe(`ALTER TYPE "JobType" ADD VALUE '${type}'`);
            console.log(`Added ${type}`);
        } catch (e) {
            if (e.message.includes('already exists')) {
                console.log(`${type} already exists`);
            } else {
                console.error(`Failed to add ${type}:`, e.message);
            }
        }
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
