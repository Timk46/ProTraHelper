import { PrismaClient } from '@prisma/client';
import { seedOFP } from './seedOFP';
import { seedAUD } from './seedAUD';
import { seedTraKo } from './seedTraKo';
import { seedTranscriptsToConceptNodes } from './processTranscripts';
import { seedUmlearn } from './seedUmlearnModelData';
import { seedMCSlider } from './seed/seedMCSlider';
import { seedTWL } from './seedTWl';
import seedEvaluationCompleteFix from './seed/seedEvaluationCompleteFix';
import { seedEvaluationDemo } from './seed/seedEvaluationDemo';
import seedTraKoCombined from './seed/seedTraKoCombined';
import seedEvaluationComplete from './seed/seedEvaluationComplete';
const prisma = new PrismaClient();

async function main() {
  //await seedAUD();
  //await seedOFP();
  //await seedTraKo();
  await seedTraKoCombined();
  //await seedTranscriptsToConceptNodes();
  //await seedUmlearn();
  //await seedMCSlider();
  //await seedEvaluationCompleteFix();
  await seedEvaluationComplete();
  //await seedEvaluationDemo();
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
