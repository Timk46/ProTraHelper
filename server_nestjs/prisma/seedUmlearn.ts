import { PrismaClient } from '@prisma/client';
import { connect } from 'http2';

const prisma = new PrismaClient();

export const seedUmlearn = async (user_id: number) => {

  // NUR ZUM TESTEN
  console.log('Seed Umlearn');

  const adminUser = await prisma.user.findFirst({
    where: {
      firstname: 'Admin',
    },
  });

  const testTaskBestellsystemInitial = await prisma.question.create({
    data: {
      name: 'Bestellsystem',
      description: 'Per Seed importierte UML Aufgabe.',
      text: 'Modelliere ein Bestellsystem.',
      score: 100,
      type: 'UML',
      level: 3,
      mode: 'practise',
      author: {
        connect: {
          id: adminUser.id,
        },
      },
      isApproved: true,
      version: 1,
      conceptNode: {
        connect: {
          id: 4,
        },
      },
    }
  });

  // Set origin to itself
  await prisma.question.update({
    where: {
      id: testTaskBestellsystemInitial.id,
    },
    data: {
      origin: {
        connect: {
          id: testTaskBestellsystemInitial.id,
        },
      }
    },
  });

  const testTaskBestellsystem = await prisma.umlQuestion.create({
    data: {
      question: {
        connect: {
          id: testTaskBestellsystemInitial.id,
        },
      },
      title: 'Bestellsystem',
      editorData: {"nodes":[{"identification":"testNode","type":"Klasse","id":"d8aecfc0-b088-11ee-b8f1-71aa4cc95fd4","position":{"x":0,"y":0},"width":100,"height":100,"title":"Kunde","attributes":[{"name":"name","dataType":"string","visibility":"-"},{"name":"adresse","dataType":"string","visibility":"-"}],"methods":[]},{"identification":"testNode","type":"Klasse","id":"e6f7bba0-b088-11ee-b8f1-71aa4cc95fd4","position":{"x":380.9375,"y":0},"width":100,"height":100,"title":"Bestellung","attributes":[{"name":"datum","dataType":"undefined","visibility":"-"},{"name":"status","dataType":"string","visibility":"-"}],"methods":[{"name":"berechneNetto()","dataType":"","visibility":"+"},{"name":"berechneMwSt()","dataType":"","visibility":"+"},{"name":"berechneBrutto()","dataType":"","visibility":"+"},{"name":"berechneGewicht()","dataType":"","visibility":"+"}]},{"identification":"testNode","type":"Abstrakte Klasse","id":"3f8a7230-b089-11ee-b8f1-71aa4cc95fd4","position":{"x":380.9375,"y":349.3020782470703},"width":100,"height":100,"title":"Zahlung","attributes":[{"name":"betrag","dataType":"number","visibility":"-"}],"methods":[]},{"identification":"testNode","type":"Klasse","id":"608a0450-b089-11ee-b8f1-71aa4cc95fd4","position":{"x":64.91071428571429,"y":676.8601117815289},"width":100,"height":100,"title":"Bar","attributes":[{"name":"rabatt","dataType":"number","visibility":""}],"methods":[]},{"identification":"testNode","type":"Klasse","id":"62aa2530-b089-11ee-b8f1-71aa4cc95fd4","position":{"x":383.2291666666666,"y":673.8367970784504},"width":100,"height":100,"title":"Scheck","attributes":[{"name":"name","dataType":"string","visibility":"-"},{"name":"bankID","dataType":"string","visibility":"-"}],"methods":[{"name":"autorisiert()","dataType":"","visibility":"+"}]},{"identification":"testNode","type":"Klasse","id":"645d7a80-b089-11ee-b8f1-71aa4cc95fd4","position":{"x":701.5624999999998,"y":675.503463745117},"width":100,"height":100,"title":"Kredit","attributes":[{"name":"nummer","dataType":"string","visibility":"-"},{"name":"typ","dataType":"string","visibility":"-"},{"name":"ablaufdatum","dataType":"undefined","visibility":"-"}],"methods":[{"name":"authorisiert()","dataType":"","visibility":"+"}]},{"identification":"testNode","type":"Klasse","id":"3d26c330-b08a-11ee-b8f1-71aa4cc95fd4","position":{"x":749.8958333333333,"y":0},"width":100,"height":100,"title":"Bestell Details","attributes":[{"name":"quantität","dataType":"number","visibility":"-"},{"name":"MwSt","dataType":"string","visibility":"-"}],"methods":[{"name":"berechneNetto()","dataType":"","visibility":"+"},{"name":"berechneGewicht()","dataType":"","visibility":"+"},{"name":"berechneMwSt()","dataType":"","visibility":"+"}]},{"identification":"testNode","type":"Klasse","id":"4b2586b0-b08a-11ee-b8f1-71aa4cc95fd4","position":{"x":1074.895833333333,"y":0},"width":100,"height":100,"title":"Artikel","attributes":[{"name":"transportgewicht","dataType":"number","visibility":"-"},{"name":"beschreibung","dataType":"string","visibility":"-"}],"methods":[{"name":"getPreisFuerAnzahl()","dataType":"","visibility":"+"},{"name":"getMwSt()","dataType":"","visibility":"+"},{"name":"aufLager()","dataType":"","visibility":"+"}]}],"edges":[{"identification":"TODO:identiHash","type":"Assoziation","id":"2afc4cd0-b089-11ee-b8f1-71aa4cc95fd4","start":"d8aecfc0-b088-11ee-b8f1-71aa4cc95fd4","end":"e6f7bba0-b088-11ee-b8f1-71aa4cc95fd4","cardinalityStart":"1","cardinalityEnd":"0..*","description":"gibt auf"},{"identification":"TODO:identiHash","type":"Assoziation","id":"50cbdd90-b089-11ee-b8f1-71aa4cc95fd4","start":"e6f7bba0-b088-11ee-b8f1-71aa4cc95fd4","end":"3f8a7230-b089-11ee-b8f1-71aa4cc95fd4","cardinalityStart":"1","cardinalityEnd":"1..*"},{"identification":"TODO:identiHash","type":"Implementierung / Realisierung","id":"2c903dd0-b08a-11ee-b8f1-71aa4cc95fd4","start":"608a0450-b089-11ee-b8f1-71aa4cc95fd4","end":"3f8a7230-b089-11ee-b8f1-71aa4cc95fd4"},{"identification":"TODO:identiHash","type":"Implementierung / Realisierung","id":"30fbfc60-b08a-11ee-b8f1-71aa4cc95fd4","start":"62aa2530-b089-11ee-b8f1-71aa4cc95fd4","end":"3f8a7230-b089-11ee-b8f1-71aa4cc95fd4"},{"identification":"TODO:identiHash","type":"Implementierung / Realisierung","id":"333d39d0-b08a-11ee-b8f1-71aa4cc95fd4","start":"645d7a80-b089-11ee-b8f1-71aa4cc95fd4","end":"3f8a7230-b089-11ee-b8f1-71aa4cc95fd4"},{"identification":"TODO:identiHash","type":"Aggregation","id":"48cc2d60-b08a-11ee-b8f1-71aa4cc95fd4","start":"3d26c330-b08a-11ee-b8f1-71aa4cc95fd4","end":"e6f7bba0-b088-11ee-b8f1-71aa4cc95fd4","cardinalityStart":"1..*","description":"listet auf","cardinalityEnd":"1"},{"identification":"TODO:identiHash","type":"Gerichtete Assoziation","id":"4ecc4790-b08a-11ee-b8f1-71aa4cc95fd4","start":"3d26c330-b08a-11ee-b8f1-71aa4cc95fd4","end":"4b2586b0-b08a-11ee-b8f1-71aa4cc95fd4","cardinalityStart":"0..*","cardinalityEnd":"1"}]},
      taskSettings: {"editorModel":"classdiagram","allowedNodeTypes":[{"id":1,"element":"Klasse","elementType":"node","title":"Klasse","description":"Klasse in einem Klassendiagramm. Kann Attribute und Methoden enthalten.","editorModelId":1,"data":"no data"},{"id":3,"element":"Abstrakte Klasse","elementType":"node","title":"Abstrakte Klasse","description":"Abstrakte Klasse in einem Klassendiagramm. Kann Methoden und Attribute enthalten.","editorModelId":1,"data":"no data"}],"allowedEdgeTypes":[{"id":4,"element":"Assoziation","elementType":"edge","title":"Assoziation","description":"Gewöhnliche Beziehung zwischen zwei Klassen.","editorModelId":1,"data":"no data"},{"id":9,"element":"Implementierung / Realisierung","elementType":"edge","title":"Implementierung","description":"Implementierung eines Interfaces durch eine Klasse.","editorModelId":1,"data":"no data"},{"id":7,"element":"Aggregation","elementType":"edge","title":"Aggregation","description":"Eine Klasse besitzt eine andere Klasse.","editorModelId":1,"data":"no data"},{"id":5,"element":"Gerichtete Assoziation","elementType":"edge","title":"Gerichtete Assoziation","description":"Gewöhnliche Beziehung von einer Klasse zur anderen.","editorModelId":1,"data":"no data"}]},
    },
  });

  console.log('Seed Umlearn done');

}

async function main() {
  seedUmlearn(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
