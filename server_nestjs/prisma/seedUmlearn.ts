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
      text: 'Modelliere ein Gebrauchtwagenhaus.',
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
      text: 'Modellieren Sie das im folgenden Text spezifizierte Problem durch Zeichnen eines UML-Klassendiagrammes der Analyse-Phase. Dabei soll nur die Struktur der Problemstellung modelliert werden, d.h. es sind keine Attribute und Operationen zu den einzelnen Klassen anzugeben. Es sind jedoch Beziehungen (Assoziationen und Generalisierungen) der Klassen zueinander sowie die Multiplizitäten darzustellen. Ein Gebrauchtwagenhaus hat Mitarbeiter und Kunden. Die Kunden kaufen ein oder mehrere Fahrzeuge. Bei jedem Kauf-Vorgang wird eine Rechnung erstellt, die Positionen für mehrere Fahrzeuge beinhalten kann. Eine Rechnung hat mindestens eine Rechnungsposition und maximal 20. Die Rechnung muss vom Kunden sowie von einem Mitarbeiter unterschrieben werden. Ein Fahrzeug kann ein LKW, ein PKW oder ein Motorrad sein.',
      textHTML: '<p>Modellieren Sie das im folgenden Text spezifizierte Problem durch&nbsp;Zeichnen eines UML-Klassendiagrammes der Analyse-Phase. Dabei soll nur die&nbsp;Struktur der Problemstellung modelliert werden, d.h. es sind<strong> keine Attribute und&nbsp;Operationen</strong> zu den einzelnen Klassen anzugeben. Es sind jedoch Beziehungen (Assoziationen und Generalisierungen) der Klassen zueinander sowie die Multiplizit&auml;ten&nbsp;darzustellen.</p><ul><li>Ein Gebrauchtwagenhaus hat Mitarbeiter und Kunden.</li><li>Die Kunden kaufen ein oder mehrere Fahrzeuge. Bei jedem Kauf-Vorgang wird eine<br>Rechnung erstellt, die Positionen f&uuml;r mehrere Fahrzeuge beinhalten kann.</li><li>Eine Rechnung hat mindestens eine Rechnungsposition und maximal 20. Die Rechnung muss vom Kunden sowie von einem Mitarbeiter unterschrieben werden.</li><li>Ein Fahrzeug kann ein LKW, ein PKW oder ein Motorrad sein.</li></ul>',
      editorData: {"edges": [{"id": "40f7c980-2427-11ef-bf90-db71b816d0f3", "end": "7f2345f0-2426-11ef-bf90-db71b816d0f3", "type": "Gerichtete Assoziation", "start": "78f53df0-2426-11ef-bf90-db71b816d0f3", "identification": "TODO:identiHash", "startDirection": "top", "startDirectionOffset": 4.000015258789062}, {"id": "457a6b70-2427-11ef-bf90-db71b816d0f3", "end": "7f2345f0-2426-11ef-bf90-db71b816d0f3", "type": "Gerichtete Assoziation", "start": "80d69b40-2426-11ef-bf90-db71b816d0f3", "identification": "TODO:identiHash", "startDirection": "top", "startDirectionOffset": -6.333414713541667}, {"id": "50bfb440-2427-11ef-bf90-db71b816d0f3", "end": "80d69b40-2426-11ef-bf90-db71b816d0f3", "type": "Gerichtete Assoziation", "start": "822dede0-2426-11ef-bf90-db71b816d0f3", "endDirection": "left", "identification": "TODO:identiHash", "startDirection": "top", "endDirectionOffset": 9.682235717773438, "startDirectionOffset": -2.000020345052083}, {"id": "5309cb50-2427-11ef-bf90-db71b816d0f3", "end": "80d69b40-2426-11ef-bf90-db71b816d0f3", "type": "Gerichtete Assoziation", "start": "832b1290-2426-11ef-bf90-db71b816d0f3", "endDirection": "right", "identification": "TODO:identiHash", "startDirection": "top", "endDirectionOffset": 13.15628051757812, "startDirectionOffset": 1.666666666666667}, {"id": "5b008560-2427-11ef-bf90-db71b816d0f3", "end": "822dede0-2426-11ef-bf90-db71b816d0f3", "type": "Assoziation", "start": "84b89060-2426-11ef-bf90-db71b816d0f3", "cardinalityEnd": "", "identification": "TODO:identiHash", "cardinalityStart": "0,1"}, {"id": "5de9e9b0-2427-11ef-bf90-db71b816d0f3", "end": "832b1290-2426-11ef-bf90-db71b816d0f3", "type": "Aggregation", "start": "86267840-2426-11ef-bf90-db71b816d0f3", "cardinalityEnd": "1", "identification": "TODO:identiHash", "cardinalityStart": "1...8"}], "nodes": [{"id": "78f53df0-2426-11ef-bf90-db71b816d0f3", "type": "Klasse", "title": "PKW", "width": 100, "height": 100, "methods": [], "position": {"x": 356.1681547619048, "y": 546.7046130952381}, "attributes": [], "identification": "testNode"}, {"id": "7f2345f0-2426-11ef-bf90-db71b816d0f3", "type": "Klasse", "title": "Fahrzeuge", "width": 100, "height": 100, "methods": [], "position": {"x": 586.6666666666665, "y": 374.3489583333333}, "attributes": [], "identification": "testNode"}, {"id": "80d69b40-2426-11ef-bf90-db71b816d0f3", "type": "Klasse", "title": "LKW", "width": 100, "height": 100, "methods": [], "position": {"x": 824.7619047619047, "y": 566.9680059523808}, "attributes": [], "identification": "testNode"}, {"id": "822dede0-2426-11ef-bf90-db71b816d0f3", "type": "Klasse", "title": "Offene LKW", "width": 100, "height": 100, "methods": [], "position": {"x": 678.8095238095236, "y": 843.8727678571428}, "attributes": [], "identification": "testNode"}, {"id": "832b1290-2426-11ef-bf90-db71b816d0f3", "type": "Klasse", "title": "Geschlossene LKW", "width": 100, "height": 100, "methods": [], "position": {"x": 979.9999999999998, "y": 842.6822916666665}, "attributes": [], "identification": "testNode"}, {"id": "84b89060-2426-11ef-bf90-db71b816d0f3", "type": "Klasse", "title": "Anhänger", "width": 100, "height": 100, "methods": [], "position": {"x": 679.2380952380952, "y": 1200.825148809524}, "attributes": [], "identification": "testNode"}, {"id": "86267840-2426-11ef-bf90-db71b816d0f3", "type": "Klasse", "title": "Sitze", "width": 100, "height": 100, "methods": [], "position": {"x": 979.9999999999998, "y": 1197.682291666666}, "attributes": [], "identification": "testNode"}]},
      taskSettings: {"editorModel": "classdiagram", "allowedEdgeTypes": [{"id": 5, "data": "no data", "title": "Gerichtete Assoziation", "element": "Gerichtete Assoziation", "description": "Gewöhnliche Beziehung von einer Klasse zur anderen.", "elementType": "edge", "editorModelId": 1}, {"id": 4, "data": "no data", "title": "Assoziation", "element": "Assoziation", "description": "Gewöhnliche Beziehung zwischen zwei Klassen.", "elementType": "edge", "editorModelId": 1}, {"id": 7, "data": "no data", "title": "Aggregation", "element": "Aggregation", "description": "Eine Klasse besitzt eine andere Klasse.", "elementType": "edge", "editorModelId": 1}, {"id": 8, "data": "no data", "title": "Komposition", "element": "Komposition", "description": "Ein Knoten ist Teil eines anderen Knotens.", "elementType": "edge", "editorModelId": 1}, {"id": 6, "data": "no data", "title": "Bidirektionale Assoziation", "element": "Bidirektionale Assoziation", "description": "Gewöhnliche gerichtete Beziehung zwischen zwei Klassen.", "elementType": "edge", "editorModelId": 1}, {"id": 9, "data": "no data", "title": "Implementierung", "element": "Implementierung / Realisierung", "description": "Implementierung eines Interfaces durch eine Klasse.", "elementType": "edge", "editorModelId": 1}, {"id": 10, "data": "no data", "title": "Abhängigkeit", "element": "Abhängigkeit", "description": "Abhängigkeit zwischen zwei Klassen.", "elementType": "edge", "editorModelId": 1}], "allowedNodeTypes": [{"id": 1, "data": "no data", "title": "Klasse", "element": "Klasse", "description": "Klasse in einem Klassendiagramm. Kann Attribute und Methoden enthalten.", "elementType": "node", "editorModelId": 1}, {"id": 2, "data": "no data", "title": "Interface", "element": "Interface", "description": "Interface in einem Klassendiagramm. Kann Methoden enthalten.", "elementType": "node", "editorModelId": 1}, {"id": 3, "data": "no data", "title": "Abstrakte Klasse", "element": "Abstrakte Klasse", "description": "Abstrakte Klasse in einem Klassendiagramm. Kann Methoden und Attribute enthalten.", "elementType": "node", "editorModelId": 1}]},
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
