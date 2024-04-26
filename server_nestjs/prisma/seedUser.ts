
import { PrismaClient, contentElementType } from '@prisma/client';
import * as XLSX from 'xlsx';
import { WorkSheet, utils } from 'xlsx';
import * as fs from 'fs';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();


export const seedUser = async (moduleInformatik_id: number) => {


    /*
    const teacherUser = await prisma.user.create({
      data: {
        email: 'lehrer@lehrer.de',
        firstname: 'Lehrer',
        lastname: 'User',
        password:  await bcrypt.hash("sjdfAios4357843#!ddfGs3", 10), // plain = lehrer
        globalRole: 'TEACHER',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    // Student
    const probandUser = await prisma.user.create({
      data: {
        email: 'pferd@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password:  await bcrypt.hash("pferd12356", 10), // plain = student
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    // Sven
    const svenUser = await prisma.user.create({
      data: {
        email: 'sven@student.de',
        firstname: 'Sven',
        lastname: 'Jacobs',
        password: '$2b$10$VPheWSunU2/ntaC/s5wBkO5ZjYN8ogxqtdAJis5n3Bvgmm99Fkxxm', // plain = student
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });
    */
    // PROBANDEN
    const pferdUser = await prisma.user.create({
      data: {
        email: 'pferd@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Pferd1444", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const katzeUser = await prisma.user.create({
      data: {
        email: 'katze@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Katze7793", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const hundUser = await prisma.user.create({
      data: {
        email: 'hund@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Hund7138", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const falkeUser = await prisma.user.create({
      data: {
        email: 'falke@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Falke5923", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const loeweUser = await prisma.user.create({
      data: {
        email: 'loewe@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Loewe8190", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });
    const tigerUser = await prisma.user.create({
      data: {
        email: 'tiger@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Tiger4790", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const elefantUser = await prisma.user.create({
      data: {
        email: 'elefant@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Elefant4155", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const giraffeUser = await prisma.user.create({
      data: {
        email: 'giraffe@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Giraffe5114", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const delphinUser = await prisma.user.create({
      data: {
        email: 'delphin@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Delphin5554", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const adlerUser = await prisma.user.create({
      data: {
        email: 'adler@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Adler5356", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });
    const fuchsUser = await prisma.user.create({
      data: {
        email: 'fuchs@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Fuchs5321", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const koalaUser = await prisma.user.create({
      data: {
        email: 'koala@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Koala2591", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const pinguinUser = await prisma.user.create({
      data: {
        email: 'pinguin@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Pinguin7648", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const lamaUser = await prisma.user.create({
      data: {
        email: 'lama@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Lama1044", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const otterUser = await prisma.user.create({
      data: {
        email: 'otter@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Otter6144", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const baerUser = await prisma.user.create({
      data: {
        email: 'baer@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Baer4285", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const zebraUser = await prisma.user.create({
      data: {
        email: 'zebra@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Zebra1135", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const haseUser = await prisma.user.create({
      data: {
        email: 'hase@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Hase3623", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const schildkroeteUser = await prisma.user.create({
      data: {
        email: 'schildkroete@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Schildkroete8530", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const papageiUser = await prisma.user.create({
      data: {
        email: 'papagei@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Papagei3231", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const orcaUser = await prisma.user.create({
      data: {
        email: 'orca@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Orca4577", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const pantherUser = await prisma.user.create({
      data: {
        email: 'panther@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Panther6922", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const walUser = await prisma.user.create({
      data: {
        email: 'wal@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Wal9050", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const kaenguruUser = await prisma.user.create({
      data: {
        email: 'kaenguru@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Kaenguru1389", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });

    const nashornUser = await prisma.user.create({
      data: {
        email: 'nashorn@proband.de',
        firstname: 'Proband',
        lastname: 'User',
        password: await bcrypt.hash("Nashorn6770", 10),
        globalRole: 'STUDENT',
        modules: { connect: [{ id: moduleInformatik_id }] },
      },
    });


}

async function main() {

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
