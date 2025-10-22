import { PrismaClient, EvaluationPhase, EvaluationStatus, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Creates or updates a user with hashed password
 * @param email - Unique email address
 * @param firstname - User's first name
 * @param lastname - User's last name
 * @param globalRole - User's global role
 * @returns Created/updated user entity
 */
async function upsertUser(
  email: string,
  firstname: string,
  lastname: string,
  globalRole: GlobalRole,
) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstname,
      lastname,
      password: await bcrypt.hash('password123', 10),
      globalRole,
    },
  });
}

/**
 * Enrolls a user in a subject with specified role
 * @param userId - User ID to enroll
 * @param subjectId - Subject ID to enroll in
 * @param role - Subject-specific role (STUDENT or TEACHER)
 * @returns UserSubject entity
 */
async function enrollUserInSubject(
  userId: number,
  subjectId: number,
  role: 'STUDENT' | 'TEACHER',
) {
  return prisma.userSubject.upsert({
    where: {
      userId_subjectId: { userId, subjectId },
    },
    update: {},
    create: {
      userId,
      subjectId,
      subjectSpecificRole: role,
      registeredForSL: true,
    },
  });
}

/**
 * Creates or retrieves a PDF file entity
 * @param uniqueId - Unique identifier for file
 * @param filename - Display filename
 * @param filepath - Storage path
 * @returns File entity
 */
async function upsertPdfFile(uniqueId: string, filename: string, filepath: string) {
  let file = await prisma.file.findFirst({
    where: { uniqueIdentifier: uniqueId },
  });

  if (!file) {
    file = await prisma.file.create({
      data: {
        uniqueIdentifier: uniqueId,
        name: filename,
        path: filepath,
        type: 'application/pdf',
      },
    });
  }

  return file;
}

/**
 * Creates or updates a FileUpload association
 * @param userId - User who uploaded the file
 * @param fileId - File entity ID
 * @param moduleId - Associated module ID
 * @returns FileUpload entity
 */
async function upsertFileUpload(userId: number, fileId: number, moduleId: number) {
  return prisma.fileUpload.upsert({
    where: {
      userId_fileId_moduleId: { userId, fileId, moduleId },
    },
    update: {},
    create: { userId, fileId, moduleId },
  });
}

/**
 * Creates or updates comment votes in bulk to avoid N+1 queries
 * @param votePlans - Array of vote plans per comment
 */
async function upsertCommentVotesBulk(
  votePlans: Array<{
    commentId: number;
    votes: Array<{ userId: number; voteCount: number }>;
  }>,
) {
  const allVotes = votePlans.flatMap(vp =>
    vp.votes.map(v => ({
      commentId: vp.commentId,
      userId: v.userId,
      voteCount: v.voteCount,
    })),
  );

  // Fetch existing votes in ONE query
  const existingVotes = await prisma.evaluationCommentVote.findMany({
    where: {
      OR: allVotes.map(v => ({
        commentId: v.commentId,
        userId: v.userId,
      })),
    },
  });

  const existingKeys = new Set(existingVotes.map(ev => `${ev.commentId}-${ev.userId}`));

  // Separate updates and creates
  const updates = allVotes
    .filter(v => existingKeys.has(`${v.commentId}-${v.userId}`))
    .map(v => {
      const existing = existingVotes.find(
        ev => ev.commentId === v.commentId && ev.userId === v.userId,
      );
      return prisma.evaluationCommentVote.update({
        where: { id: existing!.id },
        data: { voteCount: v.voteCount },
      });
    });

  const creates = allVotes
    .filter(v => !existingKeys.has(`${v.commentId}-${v.userId}`))
    .map(v =>
      prisma.evaluationCommentVote.create({
        data: {
          commentId: v.commentId,
          userId: v.userId,
          voteCount: v.voteCount,
        },
      }),
    );

  // Execute in parallel
  await Promise.all([...updates, ...creates]);
}

// ========================================
// MAIN SEED FUNCTION
// ========================================

/**
 * Evaluation-only seed function
 *
 * This seed adds evaluation system data to an existing database.
 * It assumes that the main seed (seedTraKo) has already been run.
 *
 * Prerequisites:
 * - Module with ID 1 must exist
 * - Creates its own evaluation users to avoid dependencies
 *
 * Creates:
 * - 4 evaluation users (3 students, 1 lecturer)
 * - 1 evaluation session
 * - 4 evaluation categories
 * - 2 submissions with PDF files
 * - 5 comments with votes
 * - 5 ratings
 *
 * @throws {Error} If Module with ID 1 doesn't exist
 * @returns {Promise<void>} Resolves when seeding completes
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

    const [evalStudent1, evalStudent2, evalStudent3, evalLecturer] = await Promise.all([
      upsertUser('eval.student1@uni-siegen.de', 'Max', 'Evaluation', GlobalRole.STUDENT),
      upsertUser('eval.student2@uni-siegen.de', 'Anna', 'Reviewer', GlobalRole.STUDENT),
      upsertUser('eval.student3@uni-siegen.de', 'Lisa', 'Kritiker', GlobalRole.STUDENT),
      upsertUser('eval.lecturer@uni-siegen.de', 'Prof. Dr.', 'Evaluation', GlobalRole.TEACHER),
    ]);

    // Create UserSubject relationships for evaluation users
    const subjectTraKo = await prisma.subject.findFirst({
      where: { id: 1 },
    });

    if (subjectTraKo) {
      await Promise.all([
        enrollUserInSubject(evalStudent1.id, subjectTraKo.id, 'STUDENT'),
        enrollUserInSubject(evalStudent2.id, subjectTraKo.id, 'STUDENT'),
        enrollUserInSubject(evalStudent3.id, subjectTraKo.id, 'STUDENT'),
        enrollUserInSubject(evalLecturer.id, subjectTraKo.id, 'TEACHER'),
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

    // 3. Create PDF files and FileUploads for evaluation system
    const [pdfFile1, pdfFile2] = await Promise.all([
      upsertPdfFile(
        'eval-pdf-001',
        'stabile-rahmenkonstruktion.pdf',
        '/uploads/evaluation/eval-pdf-001.pdf',
      ),
      upsertPdfFile(
        'eval-pdf-002',
        'innovative-konstruktion.pdf',
        '/uploads/evaluation/eval-pdf-002.pdf',
      ),
    ]);

    const [pdfUpload1, pdfUpload2] = await Promise.all([
      upsertFileUpload(evalStudent1.id, pdfFile1.id, existingModule.id),
      upsertFileUpload(evalStudent2.id, pdfFile2.id, existingModule.id),
    ]);

    console.log('✅ Test PDF files and uploads created/verified');

    // 4. Create evaluation session
    const evaluationSession = await prisma.evaluationSession.upsert({
      where: { id: 1000 },
      update: {},
      create: {
        id: 1000,
        title: 'Peer-Review: Stabile Rahmenkonstruktionen WS2024',
        description:
          'Peer-Review Sitzung für eingereichte Entwürfe zu stabilen Rahmenkonstruktionen',
        moduleId: existingModule.id,
        createdById: evalLecturer.id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-02-15'),
        phase: EvaluationPhase.DISCUSSION,
        isAnonymous: true,
        isActive: true,
      },
    });

    console.log('✅ Evaluation session created/verified');

    // 5. Create evaluation categories (global) and link them to the session via junction table
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

    // 6. Create evaluation submissions
    const submission1 = await prisma.evaluationSubmission.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        title: 'Entwurf "Stabile Rahmenkonstruktion"',
        description:
          'Innovativer Entwurf für eine stabile Rahmenkonstruktion mit modernen Materialien und optimierter Statik.',
        authorId: evalStudent1.id,
        pdfFileId: pdfUpload1.id,
        sessionId: evaluationSession.id,
        status: EvaluationStatus.SUBMITTED,
        phase: EvaluationPhase.DISCUSSION,
        submittedAt: new Date('2024-01-20'),
      },
    });

    const submission2 = await prisma.evaluationSubmission.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        title: 'Innovative Konstruktionslösung',
        description:
          'Alternative Lösung mit nachhaltigen Materialien und kostenoptimierter Bauweise.',
        authorId: evalStudent2.id,
        pdfFileId: pdfUpload2.id,
        sessionId: evaluationSession.id,
        status: EvaluationStatus.SUBMITTED,
        phase: EvaluationPhase.DISCUSSION,
        submittedAt: new Date('2024-01-22'),
      },
    });

    console.log('✅ Evaluation submissions created/verified');

    // 7. Create evaluation comments with realistic names based on actual users
    const commentsData = [
      {
        submissionId: submission1.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        content:
          'Ich vermisse die Angaben zu den Lastannahmen. Ohne diese ist schwer zu beurteilen, ob die Dimensionierung stimmt.',
        userId: evalStudent2.id,
        anonymousDisplayName: `Student ${evalStudent2.firstname}`,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        content: 'Die Linienführung ist sehr sauber und professionell. Alle Maße sind gut lesbar.',
        userId: evalStudent3.id,
        anonymousDisplayName: `Student ${evalStudent3.firstname}`,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        content:
          'Die Schnittdarstellung ist etwas unübersichtlich. Eine Explosionszeichnung wäre hilfreicher gewesen.',
        userId: evalStudent1.id,
        anonymousDisplayName: `Student ${evalStudent1.firstname}`,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[2].id, // Vergleichbarkeit
        content:
          'Der Maßstab ist konsistent, aber die Legende könnte ausführlicher sein für bessere Vergleichbarkeit.',
        userId: evalLecturer.id,
        anonymousDisplayName: 'Dozent',
      },
      {
        submissionId: submission2.id,
        categoryId: createdCategories[3].id, // Komplexität
        content:
          'Die nachhaltige Materialwahl ist vorbildlich. Die Dokumentation der Materialauswahl könnte jedoch detaillierter sein.',
        userId: evalLecturer.id,
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

    // 8. Create comment votes using the new junction table EvaluationCommentVote
    const votePlans: Array<{
      commentId: number;
      votes: Array<{ userId: number; voteCount: number }>;
    }> = [
      {
        commentId: createdComments[0].id, // First comment (Vollständigkeit)
        votes: [
          { userId: evalStudent1.id, voteCount: 1 },
          { userId: evalStudent3.id, voteCount: 1 },
          { userId: evalLecturer.id, voteCount: 1 },
        ],
      },
      {
        commentId: createdComments[1].id, // Second comment (Grafische Darstellungsqualität 1)
        votes: [
          { userId: evalStudent1.id, voteCount: 1 },
          { userId: evalLecturer.id, voteCount: 1 },
        ],
      },
      {
        commentId: createdComments[2].id, // Third comment (Grafische Darstellungsqualität 2)
        votes: [
          { userId: evalLecturer.id, voteCount: 1 }, // upvote
          { userId: evalStudent3.id, voteCount: -1 }, // downvote
        ],
      },
      {
        commentId: createdComments[3].id, // Fourth comment (Vergleichbarkeit)
        votes: [{ userId: evalStudent1.id, voteCount: 1 }],
      },
      {
        commentId: createdComments[4].id, // Fifth comment (Komplexität)
        votes: [
          { userId: evalStudent1.id, voteCount: 1 },
          { userId: evalStudent3.id, voteCount: 1 },
        ],
      },
    ];

    await upsertCommentVotesBulk(votePlans);

    console.log('✅ Evaluation comment votes created');

    // 9. Create evaluation ratings
    const ratingsData = [
      {
        submissionId: submission1.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        userId: evalStudent2.id,
        rating: 7,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[1].id, // Grafische Darstellungsqualität
        userId: evalStudent2.id,
        rating: 8,
      },
      {
        submissionId: submission1.id,
        categoryId: createdCategories[2].id, // Vergleichbarkeit
        userId: evalLecturer.id,
        rating: 6,
      },
      {
        submissionId: submission2.id,
        categoryId: createdCategories[0].id, // Vollständigkeit
        userId: evalStudent1.id,
        rating: 8,
      },
      {
        submissionId: submission2.id,
        categoryId: createdCategories[3].id, // Komplexität
        userId: evalLecturer.id,
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

    // 10. Output important IDs for testing
    console.log('\n📋 EVALUATION TEST-IDs für Frontend:');
    console.log('=====================================');
    console.log(`🎯 Submission ID 1: ${submission1.id}`);
    console.log(`🎯 Submission ID 2: ${submission2.id}`);
    console.log(`📚 Session ID: ${evaluationSession.id}`);
    console.log(`🏗️ Module ID: ${existingModule.id} (${existingModule.name})`);
    console.log('\n👥 Created Users for Testing:');
    console.log(
      `👤 Student 1 (Author of Submission 1): ${evalStudent1.firstname} ${evalStudent1.lastname} (ID: ${evalStudent1.id})`,
    );
    console.log(
      `👤 Student 2 (Author of Submission 2): ${evalStudent2.firstname} ${evalStudent2.lastname} (ID: ${evalStudent2.id})`,
    );
    console.log(
      `👨‍🏫 Lecturer (Session Creator): ${evalLecturer.firstname} ${evalLecturer.lastname} (ID: ${evalLecturer.id})`,
    );
    console.log('\n🌐 Frontend Test URLs:');
    console.log(`http://localhost:4200/forum/${submission1.id}`);
    console.log(`http://localhost:4200/forum/${submission2.id}`);
    console.log(`http://localhost:4200/forum`);

    console.log('\n✅ Evaluation-only seeding completed successfully!');

    // 11. Summary statistics
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
