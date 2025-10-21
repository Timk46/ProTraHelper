import { PrismaClient, EvaluationPhase, EvaluationStatus, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Evaluation-only seed function
 *
 * This seed adds evaluation system data to an existing database.
 * It assumes that the main seed (seedTraKo) has already been run.
 *
 * Prerequisites:
 * - Module with ID 1 must exist
 * - Creates its own evaluation users to avoid dependencies
 */
export async function seedEvaluationOnly() {
  console.log('🎯 Starting Evaluation-only seeding...');

  try {
    // 1. Verify prerequisites
    console.log('🔍 Verifying prerequisites...');

    const existingModule = await prisma.module.findFirst({
      where: { id: 1 },
    });

    if (!existingModule) {
      throw new Error('Module with ID 1 not found. Please run the main seed first.');
    }

    console.log(`✅ Prerequisites verified: Module "${existingModule.name}"`);

    // 2. Create evaluation-specific users
    console.log('👥 Creating evaluation users...');

    const evalStudent1 = await prisma.user.upsert({
      where: { email: 'eval.student1@uni-siegen.de' },
      update: {},
      create: {
        email: 'eval.student1@uni-siegen.de',
        firstname: 'Max',
        lastname: 'Evaluation',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    const evalStudent2 = await prisma.user.upsert({
      where: { email: 'eval.student2@uni-siegen.de' },
      update: {},
      create: {
        email: 'eval.student2@uni-siegen.de',
        firstname: 'Anna',
        lastname: 'Reviewer',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    const evalStudent3 = await prisma.user.upsert({
      where: { email: 'eval.student3@uni-siegen.de' },
      update: {},
      create: {
        email: 'eval.student3@uni-siegen.de',
        firstname: 'Lisa',
        lastname: 'Kritiker',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.STUDENT,
      },
    });

    const evalLecturer = await prisma.user.upsert({
      where: { email: 'eval.lecturer@uni-siegen.de' },
      update: {},
      create: {
        email: 'eval.lecturer@uni-siegen.de',
        firstname: 'Prof. Dr.',
        lastname: 'Evaluation',
        password: await bcrypt.hash('password123', 10),
        globalRole: GlobalRole.TEACHER,
      },
    });

    // Create UserSubject relationships for evaluation users
    const subjectTraKo = await prisma.subject.findFirst({
      where: { id: 1 },
    });

    if (subjectTraKo) {
      await Promise.all([
        prisma.userSubject.upsert({
          where: {
            userId_subjectId: {
              userId: evalStudent1.id,
              subjectId: subjectTraKo.id,
            },
          },
          update: {},
          create: {
            userId: evalStudent1.id,
            subjectId: subjectTraKo.id,
            subjectSpecificRole: 'STUDENT',
            registeredForSL: true,
          },
        }),
        prisma.userSubject.upsert({
          where: {
            userId_subjectId: {
              userId: evalStudent2.id,
              subjectId: subjectTraKo.id,
            },
          },
          update: {},
          create: {
            userId: evalStudent2.id,
            subjectId: subjectTraKo.id,
            subjectSpecificRole: 'STUDENT',
            registeredForSL: true,
          },
        }),
        prisma.userSubject.upsert({
          where: {
            userId_subjectId: {
              userId: evalStudent3.id,
              subjectId: subjectTraKo.id,
            },
          },
          update: {},
          create: {
            userId: evalStudent3.id,
            subjectId: subjectTraKo.id,
            subjectSpecificRole: 'STUDENT',
            registeredForSL: true,
          },
        }),
        prisma.userSubject.upsert({
          where: {
            userId_subjectId: {
              userId: evalLecturer.id,
              subjectId: subjectTraKo.id,
            },
          },
          update: {},
          create: {
            userId: evalLecturer.id,
            subjectId: subjectTraKo.id,
            subjectSpecificRole: 'TEACHER',
            registeredForSL: true,
          },
        }),
      ]);
    }

    console.log('✅ Evaluation users created and enrolled in subject:');
    console.log(
      `👤 Student 1: ${evalStudent1.firstname} ${evalStudent1.lastname} (ID: ${evalStudent1.id})`,
    );
    console.log(
      `👤 Student 2: ${evalStudent2.firstname} ${evalStudent2.lastname} (ID: ${evalStudent2.id})`,
    );
    console.log(
      `👤 Student 3: ${evalStudent3.firstname} ${evalStudent3.lastname} (ID: ${evalStudent3.id})`,
    );
    console.log(
      `👨‍🏫 Lecturer: ${evalLecturer.firstname} ${evalLecturer.lastname} (ID: ${evalLecturer.id})`,
    );

    // Use the created users for the rest of the seed
    const testLecturer = evalLecturer;
    const testStudent1 = evalStudent1;
    const testStudent2 = evalStudent2;
    const testStudent3 = evalStudent3;

    // 2. Create PDF files and FileUploads for evaluation system
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

    // Create FileUpload entries (EvaluationSubmission.pdfFileId references FileUpload)
    const pdfUpload1 = await prisma.fileUpload.upsert({
      where: {
        userId_fileId_moduleId: {
          userId: evalStudent1.id,
          fileId: pdfFile1.id,
          moduleId: existingModule.id,
        },
      },
      update: {},
      create: {
        userId: evalStudent1.id,
        fileId: pdfFile1.id,
        moduleId: existingModule.id,
      },
    });

    const pdfUpload2 = await prisma.fileUpload.upsert({
      where: {
        userId_fileId_moduleId: {
          userId: evalStudent2.id,
          fileId: pdfFile2.id,
          moduleId: existingModule.id,
        },
      },
      update: {},
      create: {
        userId: evalStudent2.id,
        fileId: pdfFile2.id,
        moduleId: existingModule.id,
      },
    });

    console.log('✅ Test PDF files and uploads created/verified');

    // 3. Create evaluation session
    const evaluationSession = await prisma.evaluationSession.upsert({
      where: { id: 1000 },
      update: {},
      create: {
        id: 1000,
        title: 'Peer-Review: Stabile Rahmenkonstruktionen WS2024',
        description:
          'Peer-Review Sitzung für eingereichte Entwürfe zu stabilen Rahmenkonstruktionen',
        moduleId: existingModule.id,
        createdById: testLecturer.id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-02-15'),
        phase: EvaluationPhase.DISCUSSION,
        isAnonymous: true,
        isActive: true,
      },
    });

    console.log('✅ Evaluation session created/verified');

    // 4. Create evaluation categories (global) and link them to the session via junction table
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

    const createdCategories: { id: number; name: string }[] = [];
    for (const categoryData of categories) {
      // Global category by unique name
      const category = await prisma.evaluationCategory.upsert({
        where: { name: categoryData.name },
        update: {
          displayName: categoryData.displayName,
          description: categoryData.description,
        },
        create: {
          name: categoryData.name,
          displayName: categoryData.displayName,
          description: categoryData.description,
        },
      });
      createdCategories.push({ id: category.id, name: category.name });

      // Link category to session with order via junction table
      await prisma.evaluationSessionCategory.upsert({
        where: {
          sessionId_categoryId: {
            sessionId: evaluationSession.id,
            categoryId: category.id,
          },
        },
        update: {
          order: categoryData.order,
          isActive: true,
        },
        create: {
          sessionId: evaluationSession.id,
          categoryId: category.id,
          order: categoryData.order,
          isActive: true,
        },
      });
    }

    console.log('✅ Evaluation categories created/linked to session');

    // 5. Create evaluation submissions
    let submission1 = await prisma.evaluationSubmission.findFirst({
      where: {
        title: 'Entwurf "Stabile Rahmenkonstruktion"',
        sessionId: evaluationSession.id,
        authorId: testStudent1.id,
      },
    });

    if (!submission1) {
      submission1 = await prisma.evaluationSubmission.create({
        data: {
          title: 'Entwurf "Stabile Rahmenkonstruktion"',
          description:
            'Innovativer Entwurf für eine stabile Rahmenkonstruktion mit modernen Materialien und optimierter Statik.',
          authorId: testStudent1.id,
          pdfFileId: pdfUpload1.id,
          sessionId: evaluationSession.id,
          status: EvaluationStatus.SUBMITTED,
          phase: EvaluationPhase.DISCUSSION,
          submittedAt: new Date('2024-01-20'),
        },
      });
    }

    let submission2 = await prisma.evaluationSubmission.findFirst({
      where: {
        title: 'Innovative Konstruktionslösung',
        sessionId: evaluationSession.id,
        authorId: testStudent2.id,
      },
    });

    if (!submission2) {
      submission2 = await prisma.evaluationSubmission.create({
        data: {
          title: 'Innovative Konstruktionslösung',
          description:
            'Alternative Lösung mit nachhaltigen Materialien und kostenoptimierter Bauweise.',
          authorId: testStudent2.id,
          pdfFileId: pdfUpload2.id,
          sessionId: evaluationSession.id,
          status: EvaluationStatus.SUBMITTED,
          phase: EvaluationPhase.DISCUSSION,
          submittedAt: new Date('2024-01-22'),
        },
      });
    }

    console.log('✅ Evaluation submissions created/verified');

    // 6. Create evaluation comments with realistic names based on actual users
    const commentsData = [
      {
        submissionId: submission1.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        content:
          'Ich vermisse die Angaben zu den Lastannahmen. Ohne diese ist schwer zu beurteilen, ob die Dimensionierung stimmt.',
        userId: testStudent2.id,
        anonymousDisplayName: `Student ${testStudent2.firstname}`,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        content: 'Die Linienführung ist sehr sauber und professionell. Alle Maße sind gut lesbar.',
        userId: testStudent3.id,
        anonymousDisplayName: `Student ${testStudent3.firstname}`,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        content:
          'Die Schnittdarstellung ist etwas unübersichtlich. Eine Explosionszeichnung wäre hilfreicher gewesen.',
        userId: testStudent1.id,
        anonymousDisplayName: `Student ${testStudent1.firstname}`,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[2].id, // Vergleichbarkeit
        content:
          'Der Maßstab ist konsistent, aber die Legende könnte ausführlicher sein für bessere Vergleichbarkeit.',
        userId: testLecturer.id,
        anonymousDisplayName: 'Dozent',
      },
      {
        submissionId: submission2.id,
        categoryId: createdCategories[3].id, // Komplexität
        content:
          'Die nachhaltige Materialwahl ist vorbildlich. Die Dokumentation der Materialauswahl könnte jedoch detaillierter sein.',
        userId: testLecturer.id,
        anonymousDisplayName: 'Dozent',
      },
    ];

    const createdComments = [];
    for (const commentData of commentsData) {
      let existingComment = await prisma.evaluationComment.findFirst({
        where: {
          submissionId: commentData.submissionId,
          categoryId: commentData.categoryId,
          userId: commentData.userId,
          content: commentData.content,
        },
      });

      if (!existingComment) {
        existingComment = await prisma.evaluationComment.create({
          data: {
            submissionId: commentData.submissionId,
            categoryId: commentData.categoryId,
            content: commentData.content,
            userId: commentData.userId,
            anonymousDisplayName: commentData.anonymousDisplayName,
          },
        });
      }
      createdComments.push(existingComment);
    }

    console.log('✅ Evaluation comments created (5 comments across both submissions)');

    // 6b. Create comment votes using the new junction table EvaluationCommentVote
    // We approximate previous upvote/downvote counts with unique voters
    const votePlans: Array<{
      commentId: number;
      votes: Array<{ userId: number; voteCount: number }>;
    }> = [
      {
        commentId: createdComments[0].id, // First comment (Vollständigkeit)
        votes: [
          { userId: testStudent1.id, voteCount: 1 },
          { userId: testStudent3.id, voteCount: 1 },
          { userId: testLecturer.id, voteCount: 1 },
        ],
      },
      {
        commentId: createdComments[1].id, // Second comment (Grafische Darstellungsqualität 1)
        votes: [
          { userId: testStudent1.id, voteCount: 1 },
          { userId: testLecturer.id, voteCount: 1 },
        ],
      },
      {
        commentId: createdComments[2].id, // Third comment (Grafische Darstellungsqualität 2)
        votes: [
          { userId: testLecturer.id, voteCount: 1 }, // upvote
          { userId: testStudent3.id, voteCount: -1 }, // downvote
        ],
      },
      {
        commentId: createdComments[3].id, // Fourth comment (Vergleichbarkeit)
        votes: [{ userId: testStudent1.id, voteCount: 1 }],
      },
      {
        commentId: createdComments[4].id, // Fifth comment (Komplexität)
        votes: [
          { userId: testStudent1.id, voteCount: 1 },
          { userId: testStudent3.id, voteCount: 1 },
        ],
      },
    ];

    for (const vp of votePlans) {
      for (const v of vp.votes) {
        const existing = await prisma.evaluationCommentVote.findFirst({
          where: { commentId: vp.commentId, userId: v.userId },
        });
        if (existing) {
          await prisma.evaluationCommentVote.update({
            where: { id: existing.id },
            data: { voteCount: v.voteCount },
          });
        } else {
          await prisma.evaluationCommentVote.create({
            data: { commentId: vp.commentId, userId: v.userId, voteCount: v.voteCount },
          });
        }
      }
    }

    console.log('✅ Evaluation comment votes created');

    // 7. Create evaluation ratings
    const ratingsData = [
      {
        submissionId: submission1.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        userId: testStudent2.id,
        rating: 7,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        userId: testStudent2.id,
        rating: 8,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[2].id, // Vergleichbarkeit
        userId: testLecturer.id,
        rating: 6,
      },
      {
        submissionId: submission2.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        userId: testStudent1.id,
        rating: 8,
      },
      {
        submissionId: submission2.id,
        categoryId: createdCategories[3].id, // Komplexität
        userId: testLecturer.id,
        rating: 9,
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

    console.log('✅ Evaluation ratings created (5 ratings across both submissions)');

    // 8. Output important IDs for testing
    console.log('\n📋 EVALUATION TEST-IDs für Frontend:');
    console.log('=====================================');
    console.log(`🎯 Submission ID 1: ${submission1.id}`);
    console.log(`🎯 Submission ID 2: ${submission2.id}`);
    console.log(`📚 Session ID: ${evaluationSession.id}`);
    console.log(`🏗️ Module ID: ${existingModule.id} (${existingModule.name})`);
    console.log('\n👥 Created Users for Testing:');
    console.log(
      `👤 Student 1 (Author of Submission 1): ${testStudent1.firstname} ${testStudent1.lastname} (ID: ${testStudent1.id})`,
    );
    console.log(
      `👤 Student 2 (Author of Submission 2): ${testStudent2.firstname} ${testStudent2.lastname} (ID: ${testStudent2.id})`,
    );
    console.log(
      `👨‍🏫 Lecturer (Session Creator): ${testLecturer.firstname} ${testLecturer.lastname} (ID: ${testLecturer.id})`,
    );
    console.log('\n🌐 Frontend Test URLs:');
    console.log(`http://localhost:4200/forum/${submission1.id}`);
    console.log(`http://localhost:4200/forum/${submission2.id}`);
    console.log(`http://localhost:4200/forum`);

    console.log('\n✅ Evaluation-only seeding completed successfully!');

    // 9. Summary statistics
    const stats = {
      session: 1,
      categories: createdCategories.length,
      submissions: 2,
      comments: commentsData.length,
      ratings: ratingsData.length,
      files: 2,
      fileUploads: 2,
    };

    console.log('\n📊 Created Evaluation Data:');
    console.log(`• ${stats.session} Evaluation Session`);
    console.log(`• ${stats.categories} Evaluation Categories`);
    console.log(`• ${stats.submissions} Evaluation Submissions`);
    console.log(`• ${stats.comments} Evaluation Comments`);
    console.log(`• ${stats.ratings} Evaluation Ratings`);
    console.log(`• ${stats.files} PDF Files`);
    console.log(`• ${stats.fileUploads} File Uploads (linked to submissions)`);
  } catch (error) {
    console.error('❌ Error during evaluation seeding:', error);
    throw error;
  }
}

// Export for manual execution
export default seedEvaluationOnly;

// For direct script execution
if (require.main === module) {
  seedEvaluationOnly()
    .then(() => {
      console.log('🎉 Evaluation seeding completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Evaluation seeding failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
