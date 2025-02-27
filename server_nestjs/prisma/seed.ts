import { PrismaClient } from '@prisma/client';
import { seedOFP } from './seedOFP';
import { seedAUD } from './seedAUD';
import { seedTranscriptsToConceptNodes } from './processTranscripts';
const prisma = new PrismaClient();

async function main() {
  //await seedAUD();
  await seedOFP();
  await seedTranscriptsToConceptNodes();

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
