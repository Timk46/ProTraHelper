import { PrismaClient } from '@prisma/client';
import { EvaluationPhase, EvaluationStatus, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedEvaluationComplete() {
  console.log('🚀 Starting comprehensive evaluation system seeding...');

  try {
    // 1. Create test users if they don't exist
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

    const testStudent2 = await prisma.user.upsert({
      where: { email: 'student2.test@uni-siegen.de' },
      update: {},
      create: {
        email: 'student2.test@uni-siegen.de',
        firstname: 'Anna',
        lastname: 'Schmidt',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    const testStudent3 = await prisma.user.upsert({
      where: { email: 'student3.test@uni-siegen.de' },
      update: {},
      create: {
        email: 'student3.test@uni-siegen.de',
        firstname: 'Lisa',
        lastname: 'Mueller',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    const testStudent4 = await prisma.user.upsert({
      where: { email: 'student4.test@uni-siegen.de' },
      update: {},
      create: {
        email: 'student4.test@uni-siegen.de',
        firstname: 'Tom',
        lastname: 'Weber',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    console.log(
      '✅ Test users created/verified (now includes 5 students + 1 lecturer for comprehensive voting tests)',
    );

    // 1.5. Create dedicated anonymous users for seed comments (non-colliding IDs)
    const seedAnonymousUser1 = await prisma.user.upsert({
      where: { email: 'seed.anonymous1@seed.local' },
      update: {},
      create: {
        email: 'seed.anonymous1@seed.local',
        firstname: 'Seed',
        lastname: 'Anonymous1',
        password: await bcrypt.hash('seed-only-user', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    const seedAnonymousUser2 = await prisma.user.upsert({
      where: { email: 'seed.anonymous2@seed.local' },
      update: {},
      create: {
        email: 'seed.anonymous2@seed.local',
        firstname: 'Seed',
        lastname: 'Anonymous2',
        password: await bcrypt.hash('seed-only-user', 10),
        globalRole: GlobalRole.TEACHER,
      },
    });

    const seedAnonymousUser3 = await prisma.user.upsert({
      where: { email: 'seed.anonymous3@seed.local' },
      update: {},
      create: {
        email: 'seed.anonymous3@seed.local',
        firstname: 'Seed',
        lastname: 'Anonymous3',
        password: await bcrypt.hash('seed-only-user', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    console.log('✅ Dedicated seed anonymous users created/verified');

    // 2. Create test module
    const testModule = await prisma.module.upsert({
      where: { name: 'Baukonstruktion und Tragwerkslehre' },
      update: {},
      create: {
        name: 'Baukonstruktion und Tragwerkslehre',
        description: 'Grundlagen der Baukonstruktion mit Fokus auf stabile Rahmenkonstruktionen',
      },
    });

    console.log('✅ Test module created/verified');

    // 3. Create test PDF files
    const pdfFile1 = await prisma.file.upsert({
      where: { uniqueIdentifier: 'eval-pdf-001' },
      update: {},
      create: {
        uniqueIdentifier: 'eval-pdf-001',
        name: 'stabile-rahmenkonstruktion.pdf',
        path: '/uploads/evaluation/eval-pdf-001.pdf',
        type: 'application/pdf',
      },
    });

    const pdfFile2 = await prisma.file.upsert({
      where: { uniqueIdentifier: 'eval-pdf-002' },
      update: {},
      create: {
        uniqueIdentifier: 'eval-pdf-002',
        name: 'innovative-konstruktion.pdf',
        path: '/uploads/evaluation/eval-pdf-002.pdf',
        type: 'application/pdf',
      },
    });

    console.log('✅ Test PDF files created/verified');

    // 4. Create evaluation session with categories
    const evaluationSession = await prisma.evaluationSession.upsert({
      where: { id: 1000 },
      update: {},
      create: {
        id: 1000,
        title: 'Peer-Review: Stabile Rahmenkonstruktionen WS2024',
        description:
          'Peer-Review Sitzung für eingereichte Entwürfe zu stabilen Rahmenkonstruktionen',
        moduleId: testModule.id,
        createdById: testLecturer.id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-02-15'),
        phase: EvaluationPhase.DISCUSSION,
        isAnonymous: true,
        isActive: true,
      },
    });

    console.log('✅ Evaluation session created/verified');

    // 5. Create evaluation categories
    const categories = [
      {
        name: 'Vollständigkeit',
        displayName: 'Funktionalität',
        description: 'Vollständigkeit der Konstruktionselemente und Dokumentation',
        order: 1,
      },
      {
        name: 'Grafische Darstellungsqualität',
        displayName: 'Ästhetische Qualität',
        description: 'Qualität der technischen Zeichnungen und Visualisierungen',
        order: 2,
      },
      {
        name: 'Vergleichbarkeit',
        displayName: 'Grafische Qualität',
        description: 'Vergleichbarkeit mit anderen Lösungsansätzen',
        order: 3,
      },
      {
        name: 'Komplexität',
        displayName: 'sonstiges',
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

    // 6. Create evaluation submissions
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

    console.log('✅ Evaluation submissions created - anonymous display handled in comments');

    // 8. Create 5 evaluation comments (one per student) distributed across different categories
    const commentsData = [
      {
        submissionId: submission1.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        content:
          'Ich vermisse die Angaben zu den Lastannahmen. Ohne diese ist schwer zu beurteilen, ob die Dimensionierung stimmt.',
        userId: testStudent2.id,
        voteDetails: { userVotes: {} },
        upvotes: 3,
        downvotes: 0,
        anonymousDisplayName: 'Student Anna',
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        content: 'Die Linienführung ist sehr sauber und professionell. Alle Maße sind gut lesbar.',
        userId: testStudent.id,
        voteDetails: { userVotes: {} },
        upvotes: 2,
        downvotes: 0,
        anonymousDisplayName: 'Student Max',
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        content:
          'Die Schnittdarstellung ist etwas unübersichtlich. Eine Explosionszeichnung wäre hilfreicher gewesen.',
        userId: testStudent3.id,
        voteDetails: { userVotes: {} },
        upvotes: 1,
        downvotes: 1,
        anonymousDisplayName: 'Student Lisa',
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[2].id, // Vergleichbarkeit
        content:
          'Der Maßstab ist konsistent, aber die Legende könnte ausführlicher sein für bessere Vergleichbarkeit.',
        userId: testStudent4.id,
        voteDetails: { userVotes: {} },
        upvotes: 1,
        downvotes: 0,
        anonymousDisplayName: 'Student Tom',
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[3].id, // Komplexität
        content:
          'Die Lösung ist angemessen komplex für die Aufgabenstellung. Nicht zu einfach, aber auch nicht übertrieben.',
        userId: testLecturer.id,
        voteDetails: { userVotes: {} },
        upvotes: 2,
        downvotes: 0,
        anonymousDisplayName: 'Dozent',
      },
    ];

    for (const commentData of commentsData) {
      await prisma.evaluationComment.create({
        data: commentData,
      });
    }

    console.log(
      '✅ Evaluation comments created (5 comments - one per student across different categories)',
    );

    // 9. Create evaluation ratings
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
        create: ratingData,
      });
    }

    console.log('✅ Evaluation ratings created');

    // 10. Output important IDs for testing
    console.log('\n📋 WICHTIGE TEST-IDs für Frontend:');
    console.log('=================================');
    console.log(`🎯 Submission ID 1: ${submission1.id}`);
    console.log(`🎯 Submission ID 2: ${submission2.id}`);
    console.log(`📚 Session ID: ${evaluationSession.id}`);
    console.log(`👤 Test Student 1 ID: ${testStudent.id} (Max Mustermann)`);
    console.log(`👤 Test Student 2 ID: ${testStudent2.id} (Anna Schmidt)`);
    console.log(`👤 Test Student 3 ID: ${testStudent3.id} (Lisa Mueller)`);
    console.log(`👤 Test Student 4 ID: ${testStudent4.id} (Tom Weber)`);
    console.log(`👨‍🏫 Test Lecturer ID: ${testLecturer.id} (Prof. Dr. Lehmann)`);
    console.log(
      `🎭 Seed Anonymous User IDs: ${seedAnonymousUser1.id}, ${seedAnonymousUser2.id}, ${seedAnonymousUser3.id}`,
    );
    console.log('\n🌐 Frontend Test URLs:');
    console.log(`http://localhost:4200/evaluation-forum/${submission1.id}`);
    console.log(`http://localhost:4200/evaluation-forum/${submission2.id}`);
    console.log('\n🔧 Use these submission IDs to test the evaluation forum!');
    console.log(
      '\n✅ Seed comments now use dedicated anonymous users - no collision with real user logins!',
    );

    console.log('\n✅ Comprehensive evaluation system seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during evaluation seeding:', error);
    throw error;
  }
}

// Export for manual execution
export default seedEvaluationComplete;

// For direct script execution
if (require.main === module) {
  seedEvaluationComplete()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
