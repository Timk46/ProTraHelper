import { PrismaClient, GlobalRole, EvaluationPhase, EvaluationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

const prisma = new PrismaClient();

// Flag to control embedding creation
const createEmbeddings = process.env.CREATE_EMBEDDINGS === 'true';

/**
 * Combined seed function that creates TraKo base data (modules, users, concepts)
 *
 * NOTE: Evaluation system data has been moved to a separate seed file: seedEvaluationOnly.ts
 * Run this seed first, then run seedEvaluationOnly.ts to add evaluation data.
 *
 * This creates:
 * - Modules and Subjects
 * - Admin and basic test users
 * - Concept structure (nodes, graphs, relationships)
 * - Base system setup for TraKo
 */
export async function seedTraKoCombined() {
  console.log('🚀 Starting TraKo base seeding...');

  try {
    // 1. Create Module (use upsert to avoid conflicts)
    const moduleArchitektur = await prisma.module.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'Bachelor Architektur',
        description: 'Beschreibung für den Studiengang Architektur mit Tragkonstruktion.',
      },
    });

    console.log('✅ Module created/verified:', moduleArchitektur.name);

    // 2. Create Subject (use upsert to avoid conflicts)
    const subjectTraKo = await prisma.subject.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'Tragkonstruktion 3',
        description: 'Beschreibung für die Veranstaltung Tragkonstruktion 3.',
        modules: { connect: { id: moduleArchitektur.id } },
      },
    });

    console.log('✅ Subject created/verified:', subjectTraKo.name);

    // 3. Create Admin User
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@admin.de' },
      update: {},
      create: {
        email: 'admin@admin.de',
        firstname: 'Admin',
        lastname: 'User',
        password: await bcrypt.hash('AdminSAdmin!4411', 10),
        globalRole: GlobalRole.ADMIN,
      },
    });

    // Create UserSubject relationship for admin
    await prisma.userSubject.upsert({
      where: {
        userId_subjectId: {
          userId: adminUser.id,
          subjectId: subjectTraKo.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        subjectId: subjectTraKo.id,
        subjectSpecificRole: 'ADMIN',
        registeredForSL: true,
      },
    });

    console.log('✅ Admin user created/verified');

    // 4. Create test users for evaluation system
    // NOTE: Evaluation users moved to seedEvaluationOnly.ts
    // We only keep a minimal set of users for the base system
    const testStudent = await prisma.user.upsert({
      where: { email: 'student.test@uni-siegen.de' },
      update: {},
      create: {
        email: 'student.test@uni-siegen.de',
        firstname: 'Max',
        lastname: 'Mustermann',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    await prisma.userSubject.upsert({
      where: {
        userId_subjectId: {
          userId: testStudent.id,
          subjectId: subjectTraKo.id,
        },
      },
      update: {},
      create: {
        userId: testStudent.id,
        subjectId: subjectTraKo.id,
        subjectSpecificRole: 'STUDENT',
        registeredForSL: true,
      },
    });

    const testLecturer = await prisma.user.upsert({
      where: { email: 'lecturer.test@uni-siegen.de' },
      update: {},
      create: {
        email: 'lecturer.test@uni-siegen.de',
        firstname: 'Prof. Dr.',
        lastname: 'Lehmann',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.TEACHER,
      },
    });

    await prisma.userSubject.upsert({
      where: {
        userId_subjectId: {
          userId: testLecturer.id,
          subjectId: subjectTraKo.id,
        },
      },
      update: {},
      create: {
        userId: testLecturer.id,
        subjectId: subjectTraKo.id,
        subjectSpecificRole: 'TEACHER',
        registeredForSL: true,
      },
    });

    console.log('✅ Base test users created/verified');

    // 5. Create root concept node
    const conceptNode = await prisma.conceptNode.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        name: 'root',
        description: 'root description',
      },
    });

    // Check if UserConcept already exists
    const existingUserConcept = await prisma.userConcept.findFirst({
      where: {
        userId: adminUser.id,
        conceptNodeId: conceptNode.id,
      },
    });

    if (!existingUserConcept) {
      await prisma.userConcept.create({
        data: {
          user: { connect: { id: adminUser.id } },
          concept: { connect: { id: conceptNode.id } },
          level: 10,
          expanded: true,
        },
      });
    }

    // Check if ModuleConceptGoal already exists
    const existingModuleConceptGoal = await prisma.moduleConceptGoal.findFirst({
      where: {
        moduleId: moduleArchitektur.id,
        conceptNodeId: conceptNode.id,
      },
    });

    if (!existingModuleConceptGoal) {
      await prisma.moduleConceptGoal.create({
        data: {
          moduleId: moduleArchitektur.id,
          conceptNodeId: conceptNode.id,
          level: 10,
        },
      });
    }

    // 6. Create concept graph
    const conceptGraph = await prisma.conceptGraph.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Concept Graph 1',
        root: { connect: { id: conceptNode.id } },
      },
    });

    console.log('✅ Concept structure created/verified');

    // 7. Create PDF files for evaluation system
    // NOTE: Evaluation system setup moved to separate seed file: seedEvaluationOnly.ts
    // Run that seed after this one to add evaluation data
    /*
    let pdfFile1 = await prisma.file.findFirst({
      where: { uniqueIdentifier: 'eval-pdf-001' },
    });

    if (!pdfFile1) {
      pdfFile1 = await prisma.file.create({
        data: {
          uniqueIdentifier: 'eval-pdf-001',
          name: 'stabile-rahmenkonstruktion.pdf',
          path: '/uploads/evaluation/eval-pdf-001.pdf',
          type: 'application/pdf',
        },
      });
    }

    let pdfFile2 = await prisma.file.findFirst({
      where: { uniqueIdentifier: 'eval-pdf-002' },
    });

    if (!pdfFile2) {
      pdfFile2 = await prisma.file.create({
        data: {
          uniqueIdentifier: 'eval-pdf-002',
          name: 'innovative-konstruktion.pdf',
          path: '/uploads/evaluation/eval-pdf-002.pdf',
          type: 'application/pdf',
        },
      });
    }

    console.log('✅ Test PDF files created/verified');

    // 8. Create evaluation session
    const evaluationSession = await prisma.evaluationSession.upsert({
      where: { id: 1000 },
      update: {},
      create: {
        id: 1000,
        title: 'Peer-Review: Stabile Rahmenkonstruktionen WS2024',
        description:
          'Peer-Review Sitzung für eingereichte Entwürfe zu stabilen Rahmenkonstruktionen',
        moduleId: moduleArchitektur.id,
        createdById: testLecturer.id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-02-15'),
        phase: EvaluationPhase.DISCUSSION,
        isAnonymous: true,
        isActive: true,
      },
    });

    console.log('✅ Evaluation session created/verified');
    */

    /*
    // 9-12. Create evaluation categories, submissions, comments, ratings (MOVED TO seedEvaluationOnly.ts)
    const categories = [
      {
        name: 'Vollständigkeit',
        displayName: 'Vollständigkeit',
        description: 'Vollständigkeit der Konstruktionselemente und Dokumentation',
        order: 1,
      },
      {
        name: 'Grafische Darstellungsqualität',
        displayName: 'Grafische Darstellungsqualität',
        description: 'Qualität der technischen Zeichnungen und Visualisierungen',
        order: 2,
      },
      {
        name: 'Vergleichbarkeit',
        displayName: 'Vergleichbarkeit',
        description: 'Vergleichbarkeit mit anderen Lösungsansätzen',
        order: 3,
      },
      {
        name: 'Komplexität',
        displayName: 'Komplexität',
        description: 'Angemessene Komplexität der Konstruktionslösung',
        order: 4,
      },
    ];

    const createdCategories = [];
    for (const categoryData of categories) {
      const category = await prisma.evaluationCategory.upsert({
        where: {
          sessionId_name: {
            sessionId: evaluationSession.id,
            name: categoryData.name,
          },
        },
        update: {},
        create: {
          sessionId: evaluationSession.id,
          name: categoryData.name,
          displayName: categoryData.displayName,
          description: categoryData.description,
          order: categoryData.order,
        },
      });
      createdCategories.push(category);
    }

    console.log('✅ Evaluation categories created/verified');

    // 10. Create evaluation submissions
    const submission1 = await prisma.evaluationSubmission.upsert({
      where: { id: 'demo-submission-001' },
      update: {},
      create: {
        id: 'demo-submission-001',
        title: 'Entwurf "Stabile Rahmenkonstruktion"',
        description:
          'Innovativer Entwurf für eine stabile Rahmenkonstruktion mit modernen Materialien und optimierter Statik.',
        authorId: testStudent.id,
        pdfFileId: pdfFile1.id,
        sessionId: evaluationSession.id,
        status: EvaluationStatus.SUBMITTED,
        phase: EvaluationPhase.DISCUSSION,
        submittedAt: new Date('2024-01-20'),
      },
    });

    const submission2 = await prisma.evaluationSubmission.upsert({
      where: { id: 'demo-submission-002' },
      update: {},
      create: {
        id: 'demo-submission-002',
        title: 'Innovative Konstruktionslösung',
        description:
          'Alternative Lösung mit nachhaltigen Materialien und kostenoptimierter Bauweise.',
        authorId: testStudent2.id,
        pdfFileId: pdfFile2.id,
        sessionId: evaluationSession.id,
        status: EvaluationStatus.SUBMITTED,
        phase: EvaluationPhase.DISCUSSION,
        submittedAt: new Date('2024-01-22'),
      },
    });

    console.log('✅ Evaluation submissions created/verified');

    // 11. Create evaluation comments
    const commentsData = [
      {
        id: 'demo-comment-001',
        submissionId: submission1.id,
        categoryId: createdCategories[0].id,
        content:
          'Ich vermisse die Angaben zu den Lastannahmen. Ohne diese ist schwer zu beurteilen, ob die Dimensionierung stimmt.',
        userId: testStudent2.id,
        voteDetails: { userVotes: {} },
        upvotes: 3,
        downvotes: 0,
        anonymousDisplayName: 'Student Anna',
      },
      {
        id: 'demo-comment-002',
        submissionId: submission1.id,
        categoryId: createdCategories[1].id,
        content: 'Die Linienführung ist sehr sauber und professionell. Alle Maße sind gut lesbar.',
        userId: testStudent.id,
        voteDetails: { userVotes: {} },
        upvotes: 2,
        downvotes: 0,
        anonymousDisplayName: 'Student Max',
      },
      {
        id: 'demo-comment-003',
        submissionId: submission1.id,
        categoryId: createdCategories[1].id,
        content:
          'Die Schnittdarstellung ist etwas unübersichtlich. Eine Explosionszeichnung wäre hilfreicher gewesen.',
        userId: testStudent3.id,
        voteDetails: { userVotes: {} },
        upvotes: 1,
        downvotes: 1,
        anonymousDisplayName: 'Student Lisa',
      },
      {
        id: 'demo-comment-004',
        submissionId: submission1.id,
        categoryId: createdCategories[2].id,
        content:
          'Der Maßstab ist konsistent, aber die Legende könnte ausführlicher sein für bessere Vergleichbarkeit.',
        userId: testLecturer.id,
        voteDetails: { userVotes: {} },
        upvotes: 1,
        downvotes: 0,
        anonymousDisplayName: 'Dozent',
      },
    ];

    for (const commentData of commentsData) {
      const existingComment = await prisma.evaluationComment.findUnique({
        where: { id: commentData.id },
      });

      if (!existingComment) {
        await prisma.evaluationComment.create({
          data: {
            id: commentData.id,
            submissionId: commentData.submissionId,
            categoryId: commentData.categoryId,
            content: commentData.content,
            userId: commentData.userId,
            voteDetails: commentData.voteDetails,
            upvotes: commentData.upvotes,
            downvotes: commentData.downvotes,
            anonymousDisplayName: commentData.anonymousDisplayName,
          },
        });
      }
    }

    console.log('✅ Evaluation comments created');

    // 12. Create evaluation ratings
    const ratingsData = [
      {
        submissionId: submission1.id,
        categoryId: createdCategories[0].id,
        userId: testStudent2.id,
        rating: 7,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id,
        userId: testStudent2.id,
        rating: 8,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[2].id,
        userId: testLecturer.id,
        rating: 6,
      },
    ];

    for (const ratingData of ratingsData) {
      await prisma.evaluationRating.upsert({
        where: {
          submissionId_categoryId_userId: {
            submissionId: ratingData.submissionId,
            categoryId: ratingData.categoryId,
            userId: ratingData.userId,
          },
        },
        update: {},
        create: {
          submissionId: ratingData.submissionId,
          categoryId: ratingData.categoryId,
          userId: ratingData.userId,
          rating: ratingData.rating,
        },
      });
    }

    console.log('✅ Evaluation ratings created');
    */

    // 13. Import concepts from CSV (if file exists)
    await importTraKoConcepts(moduleArchitektur);

    // 14. Update users to have current concept node
    await prisma.user.updateMany({
      data: {
        currentconceptNodeId: conceptNode.id,
      },
    });

    console.log('✅ User concept nodes updated');

    // 15. Output important IDs for testing
    console.log('\n📋 WICHTIGE TEST-IDs für Frontend:');
    console.log('=================================');
    console.log(`‍ Admin ID: ${adminUser.id} (Admin User)`);
    console.log(`🏗️ Module ID: ${moduleArchitektur.id} (${moduleArchitektur.name})`);
    console.log(`📚 Subject ID: ${subjectTraKo.id} (${subjectTraKo.name})`);
    console.log(`🧠 Root Concept Node ID: ${conceptNode.id}`);
    console.log('\n📋 NOTE: For Evaluation System Test IDs, run seedEvaluationOnly.ts');

    console.log('\n✅ TraKo base seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during combined seeding:', error);
    throw error;
  }
}

/**
 * Import concepts from CSV file if it exists
 */
async function importTraKoConcepts(moduleArchitektur: any) {
  console.log('📊 Importing Concepts from CSV...');

  const filePath = process.env.FILE_PATH + 'Kompetenzraster_TraKo.csv';
  if (!fs.existsSync(filePath)) {
    console.log(
      '⚠️ To import ContentNodes please save "Kompetenzraster_TraKo.csv" in the storage folder!',
    );
    return;
  }

  const traKoData: any[] = [];
  let lastTopic = 'No topic found!';

  const fastCsv = require('fast-csv');

  const options = {
    delimiter: ',',
    headers: [
      'conceptId',
      'conceptEdge',
      'contentId',
      'requiresId',
      'trainsId',
      'topic',
      'parentId',
      'moduleGoalId',
      'level',
      'elementId1',
      'elementId2',
      'elementId3',
      'elementId4',
      'elementId5',
      'contentNodeTitle',
      'description',
    ],
    skipRows: 1,
    trim: true,
  };

  return new Promise((resolve, reject) => {
    const readableStream = fs.createReadStream(filePath);

    fastCsv
      .parseStream(readableStream, options)
      .on('data', (data: any) => {
        if (data.topic != null) {
          lastTopic = data.topic;
        }
        traKoData.push({
          conceptId: data.conceptId ? +data.conceptId : null,
          conceptEdge: data.conceptEdge
            ? data.conceptEdge.toString().split(/[,.]/).map(Number)
            : null,
          contentId: data.contentId ? +data.contentId : null,
          requiresId: data.requiresId ? data.requiresId.toString().split(/[,.]/).map(Number) : null,
          trainsId: data.trainsId ? data.trainsId.toString().split(/[,.]/).map(Number) : null,
          topic: lastTopic,
          parentId: data.parentId ? +data.parentId : null,
          moduleGoalId: data.moduleGoalId ? +data.moduleGoalId : null,
          level: data.level ? +data.level : null,
          elementId1: data.elementId1 ? data.elementId1 : null,
          elementId2: data.elementId2 ? data.elementId2 : null,
          elementId3: data.elementId3 ? data.elementId3 : null,
          elementId4: data.elementId4 ? data.elementId4 : null,
          elementId5: data.elementId5 ? data.elementId5 : null,
          contentNodeTitle: data.contentNodeTitle ? data.contentNodeTitle : lastTopic,
          description: data.description ? data.description : null,
        });
      })
      .on('end', async () => {
        try {
          await createTraKoConcepts(traKoData, moduleArchitektur);
          console.log(`✅ Importing Concepts Done: ${traKoData.length} Concepts imported!`);
          resolve(true);
        } catch (error) {
          console.error('❌ Error creating TraKo concepts:', error);
          reject(error);
        }
      })
      .on('error', (error: any) => {
        console.error('❌ Error reading CSV file:', error);
        reject(error);
      });
  });
}

/**
 * Create TraKo concepts from CSV data
 * Note: This function needs to be implemented based on the original createTraKoConcepts function
 */
async function createTraKoConcepts(traKoData: any[], moduleArchitektur: any) {
  console.log('🏗️ Creating TraKo concepts...');
  // TODO: Implement the concept creation logic from the original seedTraKo.ts
  // This would involve creating ConceptNodes, ContentNodes, and their relationships
  console.log('⚠️ TraKo concept creation logic needs to be implemented');
}

/**
 * Helper function to create files (not used in combined version to avoid clutter)
 */
async function createFile(name: string, uniqueIdentifier: string, path: string, type: string) {
  const file = await prisma.file.create({
    data: {
      name,
      uniqueIdentifier,
      path,
      type,
    },
  });

  // Only create embeddings if flag is set
  if (createEmbeddings) {
    // Note: seedAllEmbeddingsForVideo function would need to be imported/implemented
    // await seedAllEmbeddingsForVideo(file, 'OFP');
    console.log(`📎 Embeddings creation skipped for file: ${name}`);
  }

  return file;
}

// Export for manual execution
export default seedTraKoCombined;

// For direct script execution
if (require.main === module) {
  seedTraKoCombined()
    .then(() => {
      console.log('🎉 Combined seeding completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Combined seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
