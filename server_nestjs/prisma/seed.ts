import { PrismaClient} from '@prisma/client';
//import { seedOFP } from './seedOFP';
import { seedAUD } from './seedAUD';

const prisma = new PrismaClient();

async function main() {
  await seedAUD();
  // await seedOFP();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
