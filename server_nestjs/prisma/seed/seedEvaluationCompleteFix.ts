import { PrismaClient } from '@prisma/client';
import { EvaluationPhase, EvaluationStatus, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedEvaluationCompleteFix() {
  console.log('🚀 Starting corrected evaluation system seeding...');

  try {
    // 1. Check for required dependencies first
    const subjectInformatik = await prisma.subject.findFirst({
      where: { name: 'Tragkonstruktion 3' },
    });

    if (!subjectInformatik) {
      throw new Error('Subject "Informatik" not found. Please run basic seeding first.');
    }

    console.log('✅ Dependencies verified');

    // 2. Create test users with proper password hashing
    const testStudent = await prisma.user.upsert({
      where: { email: 'student.test@uni-siegen.de' },
      update: {},
      create: {
        email: 'student.test@uni-siegen.de',
        firstname: 'Max',
        lastname: 'Mustermann',
        password: await bcrypt.hash('password123', 10), // Proper password hashing
        globalRole: GlobalRole.STUDENT, // Correct enum name
      },
    });

    // Create UserSubject relationship for student
    await prisma.userSubject.upsert({
      where: {
        userId_subjectId: {
          userId: testStudent.id,
          subjectId: subjectInformatik.id,
        },
      },
      update: {},
      create: {
        userId: testStudent.id,
        subjectId: subjectInformatik.id,
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

    // Create UserSubject relationship for lecturer
    await prisma.userSubject.upsert({
      where: {
        userId_subjectId: {
          userId: testLecturer.id,
          subjectId: subjectInformatik.id,
        },
      },
      update: {},
      create: {
        userId: testLecturer.id,
        subjectId: subjectInformatik.id,
        subjectSpecificRole: 'TEACHER',
        registeredForSL: true,
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

    // Create UserSubject relationship for student2
    await prisma.userSubject.upsert({
      where: {
        userId_subjectId: {
          userId: testStudent2.id,
          subjectId: subjectInformatik.id,
        },
      },
      update: {},
      create: {
        userId: testStudent2.id,
        subjectId: subjectInformatik.id,
        subjectSpecificRole: 'STUDENT',
        registeredForSL: true,
      },
    });

    console.log('✅ Test users created/verified with proper relationships');

    // 3. Create test module (no auto-managed timestamps)
    const testModule = await prisma.module.upsert({
      where: { name: 'Bachelor Architektur' },
      update: {},
      create: {
        name: 'Tragkonstruktion 3',
        description: 'Grundlagen der Baukonstruktion mit Fokus auf stabile Rahmenkonstruktionen',
      },
    });

    console.log('✅ Test module created/verified');

    // 4. Create test PDF files with proper unique identifiers
    let pdfFile1 = await prisma.file.findFirst({
      where: { uniqueIdentifier: 'eval-pdf-001' },
    });

    if (!pdfFile1) {
      pdfFile1 = await prisma.file.create({
        data: {
          uniqueIdentifier: 'eval-pdf-001',
          name: 'stabile-rahmenkonstruktion.pdf',
          path: '/uploads/evaluation/eval-pdf-001.pdf',
          type: 'application/pdf', // Correct MIME type
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

    // 5. Create evaluation session with fixed ID for consistency
    const evaluationSession = await prisma.evaluationSession.upsert({
      where: { id: 1000 }, // Use fixed ID for demo
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

    // 6. Create evaluation categories with proper compound key upsert
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

    // 7. Create evaluation submissions (with CUID generation)
    const submission1 = await prisma.evaluationSubmission.upsert({
      where: { id: 'demo-submission-001' }, // Use fixed CUID for demo
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
      where: { id: 'demo-submission-002' }, // Use fixed CUID for demo
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

    // 8. Create realistic evaluation comments (using create, not upsert)
    const commentsData = [
      {
        id: 'demo-comment-001',
        submissionId: submission1.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        content:
          'Die Zeichnung scheint alle geforderten Bauteile zu enthalten. Mir ist aber nicht klar, ob die Bemaßung vollständig ist.',
        userId: testStudent2.id,
        voteDetails: {},
        upvotes: 1,
        downvotes: 0,
        anonymousDisplayName: 'Student B',
      },
      {
        id: 'demo-comment-002',
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        content:
          'Guter Punkt. Die Hauptkomponenten sind da, aber es fehlen einige Detailansichten, die im Lastenheft gefordert waren.',
        userId: testLecturer.id,
        voteDetails: {},
        upvotes: 2,
        downvotes: 0,
        anonymousDisplayName: 'Dozent',
      },
      {
        id: 'demo-comment-003',
        submissionId: submission1.id,
        categoryId: createdCategories[2].id, // Vergleichbarkeit
        content:
          'Stimmt, Anhang B.2 wurde nicht berücksichtigt. Das macht die Abgabe unvollständig.',
        userId: testStudent.id,
        voteDetails: {},
        upvotes: 1,
        downvotes: 1,
        anonymousDisplayName: 'Student C',
      },
    ];

    for (const commentData of commentsData) {
      // Check if comment exists before creating
      const existingComment = await prisma.evaluationComment.findUnique({
        where: { id: commentData.id },
      });

      if (!existingComment) {
        await prisma.evaluationComment.create({
          data: {
            id: commentData.id,
            submissionId: commentData.submissionId,
            categoryId: commentData.categoryId,
            userId: commentData.userId,
            content: commentData.content,
            voteDetails: commentData.voteDetails,
            upvotes: commentData.upvotes,
            downvotes: commentData.downvotes,
            anonymousDisplayName: commentData.anonymousDisplayName,
          },
        });
      }
    }

    console.log('✅ Evaluation comments created');

    // 9. Create evaluation ratings with proper compound key
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

    // 10. Output important IDs for testing
    console.log('\n📋 WICHTIGE TEST-IDs für Frontend:');
    console.log('=================================');
    console.log(`🎯 Submission ID 1: ${submission1.id}`);
    console.log(`🎯 Submission ID 2: ${submission2.id}`);
    console.log(`📚 Session ID: ${evaluationSession.id}`);
    console.log(`👤 Test Student ID: ${testStudent.id}`);
    console.log(`👨‍🏫 Test Lecturer ID: ${testLecturer.id}`);
    console.log('\n🌐 Frontend Test URLs:');
    console.log(`http://localhost:4200/evaluation-forum/${submission1.id}`);
    console.log(`http://localhost:4200/evaluation-forum/${submission2.id}`);
    console.log('\n🔧 Use these submission IDs to test the evaluation forum!');

    console.log('\n✅ Corrected evaluation system seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during evaluation seeding:', error);
    throw error;
  }
}

// Export for manual execution
export default seedEvaluationCompleteFix;

// For direct script execution
if (require.main === module) {
  seedEvaluationCompleteFix()
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
