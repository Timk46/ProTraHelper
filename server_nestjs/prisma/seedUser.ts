import { PrismaClient, contentElementType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { WorkSheet, utils } from 'xlsx';
import * as fs from 'fs';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export const seedUser = async (subjectInformatik_id: number, moduleInformatik_id: number) => {
  const createUserAndSubject = async (email: string, password: string) => {
    const user = await prisma.user.create({
      data: {
        email: email,
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash(password, 10),
        globalRole: 'STUDENT',
      },
    });

    await prisma.userSubject.create({
      data: {
        userId: user.id,
        subjectId: subjectInformatik_id,
        subjectSpecificRole: 'STUDENT',
        registeredForSL: true,
      },
    });

    return user;
  };

  // PROBANDEN
  await createUserAndSubject('pferd@proband.de', 'Pferd1444'); // testaccount sven
  await createUserAndSubject('katze@proband.de', 'Katze7793');
  await createUserAndSubject('hund@proband.de', 'Hund7138');
  await createUserAndSubject('falke@proband.de', 'Falke5923');
  await createUserAndSubject('loewe@proband.de', 'Loewe8190');
  await createUserAndSubject('tiger@proband.de', 'Tiger4790');
  await createUserAndSubject('elefant@proband.de', 'Elefant4155');
  await createUserAndSubject('giraffe@proband.de', 'Giraffe5114');
  await createUserAndSubject('delphin@proband.de', 'Delphin5554');
  await createUserAndSubject('adler@proband.de', 'Adler5356');
  await createUserAndSubject('fuchs@proband.de', 'Fuchs5321');
  await createUserAndSubject('koala@proband.de', 'Koala2591');
  await createUserAndSubject('pinguin@proband.de', 'Pinguin7648');
  await createUserAndSubject('lama@proband.de', 'Lama1044');
  await createUserAndSubject('otter@proband.de', 'Otter6144');
  await createUserAndSubject('baer@proband.de', 'Baer4285');
  await createUserAndSubject('zebra@proband.de', 'Zebra1135');
  await createUserAndSubject('hase@proband.de', 'Hase3623');
  await createUserAndSubject('schildkroete@proband.de', 'Schildkroete8530');
  await createUserAndSubject('papagei@proband.de', 'Papagei3231');
  await createUserAndSubject('orca@proband.de', 'Orca4577');
  await createUserAndSubject('panther@proband.de', 'Panther6922');
  await createUserAndSubject('wal@proband.de', 'Wal9050');
  await createUserAndSubject('kaenguru@proband.de', 'Kaenguru1389');
  await createUserAndSubject('nashorn@proband.de', 'Nashorn6770');

  // Additional 50 users with animal names
  await createUserAndSubject('affe@proband.de', 'Affe2345');
  await createUserAndSubject('biber@proband.de', 'Biber6789');
  await createUserAndSubject('chamäleon@proband.de', 'Chamäleon1234');
  await createUserAndSubject('dachs@proband.de', 'Dachs5678');
  await createUserAndSubject('eichhörnchen@proband.de', 'Eichhörnchen9012');
  await createUserAndSubject('flamingo@proband.de', 'Flamingo3456');
  await createUserAndSubject('gorilla@proband.de', 'Gorilla7890');
  await createUserAndSubject('hai@proband.de', 'Hai1234');
  await createUserAndSubject('igel@proband.de', 'Igel5678');
  await createUserAndSubject('jaguar@proband.de', 'Jaguar9012');
  await createUserAndSubject('krokodil@proband.de', 'Krokodil3456');
  await createUserAndSubject('lemur@proband.de', 'Lemur7890');
  await createUserAndSubject('maulwurf@proband.de', 'Maulwurf1234');
  await createUserAndSubject('nilpferd@proband.de', 'Nilpferd5678');
  await createUserAndSubject('opossum@proband.de', 'Opossum9012');
  await createUserAndSubject('panda@proband.de', 'Panda3456');
  await createUserAndSubject('qualle@proband.de', 'Qualle7890');
  await createUserAndSubject('reh@proband.de', 'Reh1234');
  await createUserAndSubject('schimpanse@proband.de', 'Schimpanse5678');
  await createUserAndSubject('tapir@proband.de', 'Tapir9012');
  await createUserAndSubject('uhu@proband.de', 'Uhu3456');
  await createUserAndSubject('vielfraß@proband.de', 'Vielfraß7890');
  await createUserAndSubject('waschbär@proband.de', 'Waschbär1234');
  await createUserAndSubject('yak@proband.de', 'Yak5678');
  await createUserAndSubject('ziegenbock@proband.de', 'Ziegenbock9012');
  await createUserAndSubject('albatros@proband.de', 'Albatros3456');
  await createUserAndSubject('bison@proband.de', 'Bison7890');
  await createUserAndSubject('chinchilla@proband.de', 'Chinchilla1234');
  await createUserAndSubject('dromedar@proband.de', 'Dromedar5678');
  await createUserAndSubject('emu@proband.de', 'Emu9012');
  await createUserAndSubject('frettchen@proband.de', 'Frettchen3456');
  await createUserAndSubject('gepard@proband.de', 'Gepard7890');
  await createUserAndSubject('hermelin@proband.de', 'Hermelin1234');
  await createUserAndSubject('ibis@proband.de', 'Ibis5678');
  await createUserAndSubject('kamel@proband.de', 'Kamel9012');
  await createUserAndSubject('luchs@proband.de', 'Luchs3456');
  await createUserAndSubject('marder@proband.de', 'Marder7890');
  await createUserAndSubject('nutria@proband.de', 'Nutria1234');
  await createUserAndSubject('okapi@proband.de', 'Okapi5678');
  await createUserAndSubject('pelikan@proband.de', 'Pelikan9012');
  await createUserAndSubject('quokka@proband.de', 'Quokka3456');
  await createUserAndSubject('rotkehlchen@proband.de', 'Rotkehlchen7890');
  await createUserAndSubject('seehund@proband.de', 'Seehund1234');
  await createUserAndSubject('tukan@proband.de', 'Tukan5678'); // gneutzt von Kathy Albuts zum Testen der C++ Aufgaben.

  console.log('Users seeded successfully');
};

async function main() {
  // This function is empty in the original file, so I'm leaving it as is
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
