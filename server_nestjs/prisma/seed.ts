import { PrismaClient } from '@prisma/client';
import { seedOFP } from './seedOFP';
import { seedAUD } from './seedAUD';
import { seedTraKo } from './seedTraKo';
import { seedTranscriptsToConceptNodes } from './processTranscripts';
import { seedUmlearn } from './seedUmlearnModelData';
import { seedMCSlider } from './seed/seedMCSlider';
import { seedTWL } from './seedTWl';
const prisma = new PrismaClient();

async function main() {
  //await seedAUD();
  //await seedOFP();
  await seedTraKo();
  //await seedTranscriptsToConceptNodes();
  //await seedUmlearn();

}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
