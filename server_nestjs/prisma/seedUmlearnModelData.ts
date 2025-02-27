import { EditorElement } from '../../shared/dtos/umlearnDtos/dtos/index';
import { PrismaClient } from '@prisma/client';
import { connect } from 'http2';

const prisma = new PrismaClient();

export const seedUmlearn = async (user_id: number) => {

  console.log('Seed Umlearn Model Data');

  // Editor Models
  const cdModel = await prisma.umlEditorModel.create({
    data: {
      model: "classdiagram",
      title: 'Klassendiagramm',
      description: 'Editor für die Erstellung von Klassendiagrammen',
    },
  });

  console.log('Editor models created');

  // Editor Elements
  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_CLASS,
      elementType: "node",
      title: 'Klasse',
      description: 'Klasse in einem Klassendiagramm. Kann Attribute und Methoden enthalten.',

      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_INTERFACE,
      elementType: "node",
      title: 'Interface',
      description: 'Interface in einem Klassendiagramm. Kann Methoden enthalten.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_ABSTRACT_CLASS,
      elementType: "node",
      title: 'Abstrakte Klasse',
      description: 'Abstrakte Klasse in einem Klassendiagramm. Kann Methoden und Attribute enthalten.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_ASSOCIATION,
      elementType: "edge",
      title: 'Assoziation',
      description: 'Gewöhnliche Beziehung zwischen zwei Klassen.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_DIRECTIONAL_ASSOCIATION,
      elementType: "edge",
      title: 'Gerichtete Assoziation',
      description: 'Gewöhnliche Beziehung von einer Klasse zur anderen.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_BIDIRECTIONAL_ASSOCIATION,
      elementType: "edge",
      title: 'Bidirektionale Assoziation',
      description: 'Gewöhnliche gerichtete Beziehung zwischen zwei Klassen.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });


  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_AGGREGATION,
      elementType: "edge",
      title: 'Aggregation',
      description: 'Eine Klasse besitzt eine andere Klasse.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_GENERALISATION,
      elementType: "edge",
      title: 'Generalisierung',
      description: 'Konzept der Vererbung, wobei der Pfeil auf die Oberklasse zeigt. ',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_COMPOSITION,
      elementType: "edge",
      title: 'Komposition',
      description: 'Ein Knoten ist Teil eines anderen Knotens.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_IMPLEMENTATION,
      elementType: "edge",
      title: 'Implementierung',
      description: 'Implementierung eines Interfaces durch eine Klasse.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  await prisma.umlEditorElement.create({
    data: {
      element: EditorElement.CD_DEPENDENCY,
      elementType: "edge",
      title: 'Abhängigkeit',
      description: 'Abhängigkeit zwischen zwei Klassen.',
      editorModel: {
        connect: {
          id: cdModel.id,
        },
      },
      data: "no data",
    },
  });

  console.log('Editor elements created');

  console.log('Seed Umlearn Model Data done');

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
