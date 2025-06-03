import { PrismaClient } from '@prisma/client';
import { seedOFP } from './seedOFP';
import { seedAUD } from './seedAUD';
import { seedTWL } from './seedTWL';
import { seedTranscriptsToConceptNodes } from './processTranscripts';
import { seedUmlearn } from './seedUmlearnModelData';
const prisma = new PrismaClient();

async function main() {
  //await seedAUD();
  await seedTWL();
  //await seedTranscriptsToConceptNodes(); //TODO
  //await seedUmlearn(); //TODO

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
