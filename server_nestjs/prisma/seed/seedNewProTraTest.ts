import { PrismaClient, EvaluationPhase, EvaluationStatus, GlobalRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { join } from 'path';

const prisma = new PrismaClient();

/**
 * Seed script for ProTraTest database
 *
 * @description Creates complete test environment for group-based evaluation forum:
 * - 14 Users (1 Admin, 1 Teacher, 12 Students)
 * - 3 UserGroups with 4 students each
 * - 1 EvaluationSession with 4 categories
 * - 6 Submissions (2 per group)
 * - ~16 Comments (respects group membership)
 * - ~20 Comment Votes
 *
 * Database: ProTraTest
 */

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates or updates a user with hashed password
 * @param email - Unique email address
 * @param firstname - User's first name
 * @param lastname - User's last name
 * @param password - Plain text password (will be hashed)
 * @param globalRole - User's global role
 * @returns Created/updated user entity
 */
async function upsertUser(
  email: string,
  firstname: string,
  lastname: string,
  password: string,
  globalRole: GlobalRole,
) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      firstname,
      lastname,
      password: hashedPassword,
      globalRole,
      hasAcceptedPrivacyPolicy: true,
    },
  });
}

/**
 * Enrolls a user in a subject with specified role
 * @param userId - User ID to enroll
 * @param subjectId - Subject ID to enroll in
 * @param role - Subject-specific role (STUDENT or TEACHER)
 * @param registeredForSL - Whether user is registered for self-learning
 * @returns UserSubject entity
 */
async function enrollUserInSubject(
  userId: number,
  subjectId: number,
  role: string = 'STUDENT',
  registeredForSL: boolean = true,
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
      registeredForSL,
    },
  });
}

/**
 * Creates a user group for collaborative work
 * @param name - Group name
 * @param maxSize - Maximum number of members
 * @returns UserGroup entity
 */
async function createUserGroup(name: string, maxSize: number) {
  return prisma.userGroup.upsert({
    where: { id: 0 }, // Dummy where since name is not unique
    update: {},
    create: {
      name,
      maxSize,
    },
  });
}

/**
 * Adds a user to a user group
 * @param userId - User ID to add
 * @param groupId - Group ID to add user to
 * @returns UserGroupMembership entity
 */
async function addUserToGroup(userId: number, groupId: number) {
  return prisma.userGroupMembership.upsert({
    where: {
      userId_groupId: { userId, groupId },
    },
    update: {},
    create: {
      userId,
      groupId,
    },
  });
}

/**
 * Creates or updates a concept node in the knowledge graph
 * @param name - Concept name
 * @param description - Concept description
 * @param conceptGraphId - ID of the parent concept graph
 * @returns ConceptNode entity
 */
async function upsertConceptNode(
  name: string,
  description: string,
  conceptGraphId: number,
) {
  return prisma.conceptNode.upsert({
    where: { id: 0 }, // Dummy where
    update: {},
    create: {
      name,
      description,
      conceptGraphId,
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
        privacy: 'RESTRICTED', // Only group members can access
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
    create: {
      userId,
      fileId,
      moduleId,
    },
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

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('🌱 Starting ProTraTest seed...\n');

  // ==========================================================================
  // 0. ENABLE PGVECTOR EXTENSION
  // ==========================================================================

  console.log('🔧 Enabling pgvector extension...');
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('  ✅ pgvector extension enabled');
  } catch (error) {
    console.log('  ⚠️  pgvector extension already exists or no permissions (continuing anyway)');
  }

  // ==========================================================================
  // 1. BASIS-INFRASTRUKTUR
  // ==========================================================================

  console.log('\n📦 Creating base infrastructure...');

  // Module
  const module = await prisma.module.upsert({
    where: { name: 'Tragkonstruktionen' },
    update: {},
    create: {
      name: 'Tragkonstruktionen',
      description: 'Grundlagen der Tragkonstruktionen und Tragwerksplanung',
    },
  });
  console.log(`  ✅ Module: ${module.name} (ID: ${module.id})`);

  // Subject
  const subject = await prisma.subject.upsert({
    where: { name: 'Tragkonstruktion 3' },
    update: {},
    create: {
      name: 'Tragkonstruktion 3',
      description: 'Test-Kurs für Tragkonstruktionen Peer-Review',
      modules: {
        connect: { id: module.id },
      },
    },
  });
  console.log(`  ✅ Subject: ${subject.name} (ID: ${subject.id})`);

  // ConceptGraph
  const conceptGraph = await prisma.conceptGraph.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Tragwerke Grundlagen',
    },
  });
  console.log(`  ✅ ConceptGraph: ${conceptGraph.name} (ID: ${conceptGraph.id})`);

  // ConceptNodes
  const conceptNodeSeil = await upsertConceptNode(
    'Seil',
    'Seiltragwerke und Hängestrukturen - Zugbeanspruchte Konstruktionen',
    conceptGraph.id,
  );
  console.log(`  ✅ ConceptNode: Seil (ID: ${conceptNodeSeil.id})`);

  const conceptNodeBogen = await upsertConceptNode(
    'Bogen',
    'Bogentragwerke und Gewölbe - Druckbeanspruchte Konstruktionen',
    conceptGraph.id,
  );
  console.log(`  ✅ ConceptNode: Bogen (ID: ${conceptNodeBogen.id})`);

  const conceptNodeRahmen = await upsertConceptNode(
    'Rahmen',
    'Rahmenkonstruktionen - Biegebeanspruchte Stabwerke',
    conceptGraph.id,
  );
  console.log(`  ✅ ConceptNode: Rahmen (ID: ${conceptNodeRahmen.id})`);

  const conceptNodeFlaeche = await upsertConceptNode(
    'Flächentragwerk',
    'Platten und Schalen - Flächentragwerke',
    conceptGraph.id,
  );
  console.log(`  ✅ ConceptNode: Flächentragwerk (ID: ${conceptNodeFlaeche.id})`);

  // ==========================================================================
  // 1B. MODULE HIGHLIGHT CONCEPTS (for HighlightView)
  // ==========================================================================

  console.log('\n🎨 Creating ModuleHighlightConcepts with images...');

  await prisma.moduleHighlightConcepts.createMany({
    data: [
      {
        moduleId: module.id,
        conceptNodeId: conceptNodeSeil.id,
        alias: 'Seil',
        description: 'Seiltragwerke und Hängestrukturen',
        pictureData: 'https://images.unsplash.com/photo-1518893063132-36e46dbe2428?w=300&h=200&fit=crop',
        position: 1,
        isUnlocked: true,
      },
      {
        moduleId: module.id,
        conceptNodeId: conceptNodeBogen.id,
        alias: 'Bogen',
        description: 'Bogentragwerke und Gewölbe',
        pictureData: 'https://images.unsplash.com/photo-1527838832700-5059252407fa?w=300&h=200&fit=crop',
        position: 2,
        isUnlocked: true,
      },
      {
        moduleId: module.id,
        conceptNodeId: conceptNodeRahmen.id,
        alias: 'Rahmen',
        description: 'Rahmenkonstruktionen',
        pictureData: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=300&h=200&fit=crop',
        position: 3,
        isUnlocked: true,
      },
      {
        moduleId: module.id,
        conceptNodeId: conceptNodeFlaeche.id,
        alias: 'Flächentragwerk',
        description: 'Platten und Schalen',
        pictureData: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=300&h=200&fit=crop',
        position: 4,
        isUnlocked: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log('  ✅ Created 4 ModuleHighlightConcepts with image URLs');

  // ==========================================================================
  // 2. NUTZER
  // ==========================================================================

  console.log('\n👥 Creating users...');

  // Admin
  const admin = await upsertUser('admin@test.de', 'Admin', 'User', 'admin123', GlobalRole.ADMIN);
  console.log(`  ✅ Admin: ${admin.email} (ID: ${admin.id})`);

  // Teacher
  const teacher = await upsertUser('teacher@test.de', 'Prof. Dr.', 'Müller', 'teacher123', GlobalRole.TEACHER);
  console.log(`  ✅ Teacher: ${teacher.email} (ID: ${teacher.id})`);
  await enrollUserInSubject(teacher.id, subject.id, 'TEACHER', false);

  // Students - Gruppe A
  const student1 = await upsertUser('student1@test.de', 'Max', 'Mustermann', 'student123', GlobalRole.STUDENT);
  const student2 = await upsertUser('student2@test.de', 'Anna', 'Schmidt', 'student123', GlobalRole.STUDENT);
  const student3 = await upsertUser('student3@test.de', 'Tom', 'Weber', 'student123', GlobalRole.STUDENT);
  const student4 = await upsertUser('student4@test.de', 'Lisa', 'Fischer', 'student123', GlobalRole.STUDENT);
  console.log(`  ✅ Gruppe A Students: student1-4 (IDs: ${student1.id}-${student4.id})`);

  // Students - Gruppe B
  const student5 = await upsertUser('student5@test.de', 'Paul', 'Wagner', 'student123', GlobalRole.STUDENT);
  const student6 = await upsertUser('student6@test.de', 'Emma', 'Bauer', 'student123', GlobalRole.STUDENT);
  const student7 = await upsertUser('student7@test.de', 'Leon', 'Hoffmann', 'student123', GlobalRole.STUDENT);
  const student8 = await upsertUser('student8@test.de', 'Mia', 'Schäfer', 'student123', GlobalRole.STUDENT);
  console.log(`  ✅ Gruppe B Students: student5-8 (IDs: ${student5.id}-${student8.id})`);

  // Students - Gruppe C
  const student9 = await upsertUser('student9@test.de', 'Felix', 'Koch', 'student123', GlobalRole.STUDENT);
  const student10 = await upsertUser('student10@test.de', 'Sophie', 'Meyer', 'student123', GlobalRole.STUDENT);
  const student11 = await upsertUser('student11@test.de', 'Lukas', 'Richter', 'student123', GlobalRole.STUDENT);
  const student12 = await upsertUser('student12@test.de', 'Hannah', 'Schneider', 'student123', GlobalRole.STUDENT);
  console.log(`  ✅ Gruppe C Students: student9-12 (IDs: ${student9.id}-${student12.id})`);

  // Enroll all students in subject
  const students = [
    student1, student2, student3, student4,
    student5, student6, student7, student8,
    student9, student10, student11, student12,
  ];
  for (const student of students) {
    await enrollUserInSubject(student.id, subject.id, 'STUDENT', true);
  }
  console.log(`  ✅ All 12 students enrolled in "${subject.name}"`);

  // ==========================================================================
  // 3. USER GROUPS
  // ==========================================================================

  console.log('\n👨‍👩‍👧‍👦 Creating user groups...');

  const groupA = await createUserGroup('Team Alpha', 4);
  await addUserToGroup(student1.id, groupA.id);
  await addUserToGroup(student2.id, groupA.id);
  await addUserToGroup(student3.id, groupA.id);
  await addUserToGroup(student4.id, groupA.id);
  console.log(`  ✅ Gruppe A: ${groupA.name} (4 members)`);

  const groupB = await createUserGroup('Team Beta', 4);
  await addUserToGroup(student5.id, groupB.id);
  await addUserToGroup(student6.id, groupB.id);
  await addUserToGroup(student7.id, groupB.id);
  await addUserToGroup(student8.id, groupB.id);
  console.log(`  ✅ Gruppe B: ${groupB.name} (4 members)`);

  const groupC = await createUserGroup('Team Gamma', 4);
  await addUserToGroup(student9.id, groupC.id);
  await addUserToGroup(student10.id, groupC.id);
  await addUserToGroup(student11.id, groupC.id);
  await addUserToGroup(student12.id, groupC.id);
  console.log(`  ✅ Gruppe C: ${groupC.name} (4 members)`);

  // ==========================================================================
  // 4. EVALUATION SESSION
  // ==========================================================================

  console.log('\n📋 Creating evaluation session...');

  const session = await prisma.evaluationSession.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: 'Peer-Review Tragkonstruktionen WS2024',
      description: 'Gruppenbasierte Peer-Review für Tragkonstruktionsentwürfe. Jede Gruppe bewertet die Submissions ihrer eigenen Gruppenmitglieder.',
      moduleId: module.id,
      createdById: teacher.id,
      startDate: new Date('2024-11-01'),
      endDate: new Date('2025-01-31'),
      isActive: true,
      isAnonymous: true,
      phase: EvaluationPhase.DISCUSSION,
    },
  });
  console.log(`  ✅ Session: ${session.title} (ID: ${session.id})`);

  // ==========================================================================
  // 5. EVALUATION CATEGORIES
  // ==========================================================================

  console.log('\n📊 Creating evaluation categories...');

  const categoryStatik = await prisma.evaluationCategory.upsert({
    where: { name: 'statik' },
    update: {},
    create: {
      name: 'statik',
      displayName: 'Statik & Tragverhalten',
      description: 'Bewertung der statischen Korrektheit, Lastverteilung und Tragfähigkeit des Entwurfs',
      shortDescription: 'Statische Korrektheit',
      icon: 'calculate',
      color: '#1976D2',
    },
  });

  const categoryKonstruktion = await prisma.evaluationCategory.upsert({
    where: { name: 'konstruktion' },
    update: {},
    create: {
      name: 'konstruktion',
      displayName: 'Konstruktive Durchbildung',
      description: 'Detaillierung, Verbindungen, Materialisierung und Ausführungsplanung',
      shortDescription: 'Details & Verbindungen',
      icon: 'engineering',
      color: '#388E3C',
    },
  });

  const categoryGrafik = await prisma.evaluationCategory.upsert({
    where: { name: 'grafik' },
    update: {},
    create: {
      name: 'grafik',
      displayName: 'Grafische Darstellung',
      description: 'Qualität der technischen Zeichnungen, Pläne und Visualisierungen',
      shortDescription: 'Zeichnungsqualität',
      icon: 'draw',
      color: '#F57C00',
    },
  });

  const categoryInnovation = await prisma.evaluationCategory.upsert({
    where: { name: 'innovation' },
    update: {},
    create: {
      name: 'innovation',
      displayName: 'Innovation & Kreativität',
      description: 'Originalität der Lösung, innovative Ansätze und kreative Lösungsstrategien',
      shortDescription: 'Kreative Lösungen',
      icon: 'lightbulb',
      color: '#7B1FA2',
    },
  });

  console.log(`  ✅ Created 4 categories`);

  // Link categories to session
  await prisma.evaluationSessionCategory.createMany({
    data: [
      { sessionId: session.id, categoryId: categoryStatik.id, order: 1, isActive: true },
      { sessionId: session.id, categoryId: categoryKonstruktion.id, order: 2, isActive: true },
      { sessionId: session.id, categoryId: categoryGrafik.id, order: 3, isActive: true },
      { sessionId: session.id, categoryId: categoryInnovation.id, order: 4, isActive: true },
    ],
    skipDuplicates: true,
  });
  console.log(`  ✅ Linked categories to session`);

  // ==========================================================================
  // 6. PDF FILES & FILE UPLOADS
  // ==========================================================================

  console.log('\n📄 Creating PDF files...');

  // Gruppe A PDFs
  const pdfMax = await upsertPdfFile(
    'protra-pdf-001',
    'seiltragwerk-max.pdf',
    '/uploads/evaluation/protra-pdf-001.pdf',
  );
  const fileUploadMax = await upsertFileUpload(student1.id, pdfMax.id, module.id);

  const pdfAnna = await upsertPdfFile(
    'protra-pdf-002',
    'bogentragwerk-anna.pdf',
    '/uploads/evaluation/protra-pdf-002.pdf',
  );
  const fileUploadAnna = await upsertFileUpload(student2.id, pdfAnna.id, module.id);

  // Gruppe B PDFs
  const pdfPaul = await upsertPdfFile(
    'protra-pdf-003',
    'rahmenkonstruktion-paul.pdf',
    '/uploads/evaluation/protra-pdf-003.pdf',
  );
  const fileUploadPaul = await upsertFileUpload(student5.id, pdfPaul.id, module.id);

  const pdfEmma = await upsertPdfFile(
    'protra-pdf-004',
    'flaechentragwerk-emma.pdf',
    '/uploads/evaluation/protra-pdf-004.pdf',
  );
  const fileUploadEmma = await upsertFileUpload(student6.id, pdfEmma.id, module.id);

  // Gruppe C PDFs
  const pdfFelix = await upsertPdfFile(
    'protra-pdf-005',
    'hybrid-felix.pdf',
    '/uploads/evaluation/protra-pdf-005.pdf',
  );
  const fileUploadFelix = await upsertFileUpload(student9.id, pdfFelix.id, module.id);

  const pdfSophie = await upsertPdfFile(
    'protra-pdf-006',
    'modulrahmen-sophie.pdf',
    '/uploads/evaluation/protra-pdf-006.pdf',
  );
  const fileUploadSophie = await upsertFileUpload(student10.id, pdfSophie.id, module.id);

  console.log(`  ✅ Created 6 PDF files with explicit uniqueIds`);

  // ==========================================================================
  // 7. EVALUATION SUBMISSIONS
  // ==========================================================================

  console.log('\n📝 Creating evaluation submissions...');

  // Gruppe A Submissions
  const submission1 = await prisma.evaluationSubmission.create({
    data: {
      title: 'Seilkonstruktion für Sportstadion',
      description: 'Zugbeanspruchte Seilkonstruktion mit zentralem Mast für Überdachung eines Leichtathletikstadions',
      authorId: student1.id,
      pdfFileId: fileUploadMax.id,
      sessionId: session.id,
      status: EvaluationStatus.SUBMITTED,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-11-15T10:00:00'),
    },
  });
  console.log(`  ✅ Submission 1: ${submission1.title} (${student1.firstname} ${student1.lastname}, Gruppe A)`);

  const submission2 = await prisma.evaluationSubmission.create({
    data: {
      title: 'Bogentragwerk Fußgängerbrücke',
      description: 'Dreigelenkbogen aus Stahlbeton für Fußgängerbrücke über Fluss (Spannweite 60m)',
      authorId: student2.id,
      pdfFileId: fileUploadAnna.id,
      sessionId: session.id,
      status: EvaluationStatus.SUBMITTED,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-11-15T11:30:00'),
    },
  });
  console.log(`  ✅ Submission 2: ${submission2.title} (${student2.firstname} ${student2.lastname}, Gruppe A)`);

  // Gruppe B Submissions
  const submission3 = await prisma.evaluationSubmission.create({
    data: {
      title: 'Rahmenkonstruktion Industriehalle',
      description: 'Stahlrahmen mit Kragarmen für Lagerhalle (Spannweite 40m, Höhe 12m)',
      authorId: student5.id,
      pdfFileId: fileUploadPaul.id,
      sessionId: session.id,
      status: EvaluationStatus.SUBMITTED,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-11-16T09:00:00'),
    },
  });
  console.log(`  ✅ Submission 3: ${submission3.title} (${student5.firstname} ${student5.lastname}, Gruppe B)`);

  const submission4 = await prisma.evaluationSubmission.create({
    data: {
      title: 'Flächentragwerk Ausstellungspavillon',
      description: 'Hyperbolische Paraboloidschale aus Stahlbeton für temporären Ausstellungspavillon',
      authorId: student6.id,
      pdfFileId: fileUploadEmma.id,
      sessionId: session.id,
      status: EvaluationStatus.SUBMITTED,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-11-16T14:00:00'),
    },
  });
  console.log(`  ✅ Submission 4: ${submission4.title} (${student6.firstname} ${student6.lastname}, Gruppe B)`);

  // Gruppe C Submissions
  const submission5 = await prisma.evaluationSubmission.create({
    data: {
      title: 'Hybride Seil-Bogen-Konstruktion',
      description: 'Kombination aus Seil und Bogen für Weitspannkonstruktion (Spannweite 80m)',
      authorId: student9.id,
      pdfFileId: fileUploadFelix.id,
      sessionId: session.id,
      status: EvaluationStatus.SUBMITTED,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-11-17T10:30:00'),
    },
  });
  console.log(`  ✅ Submission 5: ${submission5.title} (${student9.firstname} ${student9.lastname}, Gruppe C)`);

  const submission6 = await prisma.evaluationSubmission.create({
    data: {
      title: 'Modulares Rahmensystem',
      description: 'Vorgefertigtes Stahlrahmensystem für flexible Hallennutzung',
      authorId: student10.id,
      pdfFileId: fileUploadSophie.id,
      sessionId: session.id,
      status: EvaluationStatus.SUBMITTED,
      phase: EvaluationPhase.DISCUSSION,
      submittedAt: new Date('2024-11-17T16:00:00'),
    },
  });
  console.log(`  ✅ Submission 6: ${submission6.title} (${student10.firstname} ${student10.lastname}, Gruppe C)`);

  console.log(`\n  ℹ️  Keine Submissions von: Student 3, 4 (Gruppe A), Student 7, 8 (Gruppe B), Student 11, 12 (Gruppe C)`);

  // ==========================================================================
  // 8. EVALUATION COMMENTS
  // ==========================================================================

  console.log('\n💬 Creating evaluation comments...');

  // Gruppe A Comments (Submission 1 - Max)
  const comment1 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission1.id,
      categoryId: categoryStatik.id,
      userId: student2.id,
      content: 'Die Seilkonstruktion ist statisch gut durchdacht. Die Lastableitung über den zentralen Mast funktioniert. Allerdings sollte die Verankerung der Seilenden noch detaillierter dargestellt werden.',
      anonymousDisplayName: 'Reviewer Alpha 1',
    },
  });

  const comment2 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission1.id,
      categoryId: categoryGrafik.id,
      userId: student3.id,
      content: 'Die Darstellung ist übersichtlich und technisch korrekt. Die 3D-Ansichten helfen beim Verständnis der Konstruktion. Ein Detailschnitt der Mastanbindung wäre noch hilfreich.',
      anonymousDisplayName: 'Reviewer Alpha 2',
    },
  });

  // Student 4 hat KEINEN Initialkommentar!

  console.log(`  ✅ Submission 1: 2 comments (Student 2, 3) - Student 4 hat KEINEN`);

  // Gruppe A Comments (Submission 2 - Anna)
  const comment3 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission2.id,
      categoryId: categoryKonstruktion.id,
      userId: student1.id,
      content: 'Der Dreigelenkbogen ist konstruktiv sehr gut ausgearbeitet. Die Gelenke sind sauber dargestellt. Die Materialwahl Stahlbeton ist für diese Spannweite angemessen.',
      anonymousDisplayName: 'Reviewer Alpha 3',
    },
  });

  const comment4 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission2.id,
      categoryId: categoryInnovation.id,
      userId: student3.id,
      content: 'Eine klassische aber solide Lösung. Die Integration der Geländer direkt in die Bogenkonstruktion ist ein interessanter Ansatz.',
      anonymousDisplayName: 'Reviewer Alpha 2',
    },
  });

  console.log(`  ✅ Submission 2: 2 comments (Student 1, 3)`);

  // Gruppe B Comments (Submission 3 - Paul)
  const comment5 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission3.id,
      categoryId: categoryStatik.id,
      userId: student6.id,
      content: 'Die Rahmenkonstruktion ist statisch nachvollziehbar. Die Kragarme sind gut dimensioniert. Hast du Windlasten berücksichtigt? Das sollte noch ergänzt werden.',
      anonymousDisplayName: 'Reviewer Beta 1',
    },
  });

  const comment6 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission3.id,
      categoryId: categoryGrafik.id,
      userId: student7.id,
      content: 'Die technischen Zeichnungen sind präzise und gut bemaßt. Die Schnittdarstellungen zeigen alle relevanten Details. Sehr übersichtlich!',
      anonymousDisplayName: 'Reviewer Beta 2',
    },
  });

  // Student 8 hat KEINEN Initialkommentar!

  console.log(`  ✅ Submission 3: 2 comments (Student 6, 7) - Student 8 hat KEINEN`);

  // Gruppe B Comments (Submission 4 - Emma)
  const comment7 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission4.id,
      categoryId: categoryInnovation.id,
      userId: student5.id,
      content: 'Die hyperbolische Paraboloidschale ist eine sehr kreative Lösung! Die Formfindung ist mathematisch nachvollziehbar. Innovativer Ansatz für einen Pavillon.',
      anonymousDisplayName: 'Reviewer Beta 3',
    },
  });

  const comment8 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission4.id,
      categoryId: categoryKonstruktion.id,
      userId: student7.id,
      content: 'Die Schalung für diese Freiformgeometrie wird aufwendig. Hast du Alternativen wie Spritzbeton erwogen? Ansonsten sehr detailliert ausgearbeitet.',
      anonymousDisplayName: 'Reviewer Beta 2',
    },
  });

  console.log(`  ✅ Submission 4: 2 comments (Student 5, 7)`);

  // Gruppe C Comments (Submission 5 - Felix)
  const comment9 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission5.id,
      categoryId: categoryStatik.id,
      userId: student10.id,
      content: 'Die Kombination aus Seil und Bogen ist statisch anspruchsvoll aber gut gelöst. Die Lastverteilung zwischen Zug- und Druckelementen ist schlüssig dargestellt.',
      anonymousDisplayName: 'Reviewer Gamma 1',
    },
  });

  const comment10 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission5.id,
      categoryId: categoryInnovation.id,
      userId: student11.id,
      content: 'Sehr innovativer Ansatz! Die Hybridkonstruktion nutzt die Vorteile beider Tragwerkstypen optimal aus. Besonders für große Spannweiten eine clevere Lösung.',
      anonymousDisplayName: 'Reviewer Gamma 2',
    },
  });

  // Student 12 hat KEINEN Initialkommentar!

  console.log(`  ✅ Submission 5: 2 comments (Student 10, 11) - Student 12 hat KEINEN`);

  // Gruppe C Comments (Submission 6 - Sophie)
  const comment11 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission6.id,
      categoryId: categoryKonstruktion.id,
      userId: student9.id,
      content: 'Das modulare System ist konstruktiv sehr durchdacht. Die Verbindungsdetails sind gut ausgearbeitet. Die Vorfertigung ermöglicht schnellen Aufbau.',
      anonymousDisplayName: 'Reviewer Gamma 3',
    },
  });

  const comment12 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission6.id,
      categoryId: categoryGrafik.id,
      userId: student11.id,
      content: 'Die Explosionszeichnung des Modulsystems ist sehr hilfreich. Alle Einzelteile sind klar erkennbar und beschriftet. Professionelle Darstellung!',
      anonymousDisplayName: 'Reviewer Gamma 2',
    },
  });

  console.log(`  ✅ Submission 6: 2 comments (Student 9, 11)`);

  // Additional replies to create more discussion depth
  const reply1 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission1.id,
      categoryId: categoryStatik.id,
      userId: student1.id,
      content: 'Danke für das Feedback! Die Verankerungsdetails werde ich in der nächsten Version ergänzen. Habe schon Skizzen für die Fundamentanbindung.',
      parentId: comment1.id,
      anonymousDisplayName: 'Autor',
    },
  });

  const reply2 = await prisma.evaluationComment.create({
    data: {
      submissionId: submission5.id,
      categoryId: categoryInnovation.id,
      userId: student9.id,
      content: 'Vielen Dank! Die Herausforderung war tatsächlich die Balance zwischen Seil- und Bogenkräften. Die Berechnung hat einige Iterationen gebraucht.',
      parentId: comment10.id,
      anonymousDisplayName: 'Autor',
    },
  });

  console.log(`  ✅ Created 14 comments total (12 initial + 2 replies)`);
  console.log(`  ℹ️  Students ohne Initialkommentar: 4 (Lisa), 8 (Mia), 12 (Hannah)`);

  // ==========================================================================
  // 9. EVALUATION COMMENT VOTES
  // ==========================================================================

  console.log('\n👍 Creating comment votes...');

  await upsertCommentVotesBulk([
    {
      commentId: comment1.id, // Anna's comment on Max's submission
      votes: [
        { userId: student1.id, voteCount: 1 }, // Max upvotes
        { userId: student3.id, voteCount: 1 }, // Tom upvotes
      ],
    },
    {
      commentId: comment2.id, // Tom's comment on Max's submission
      votes: [
        { userId: student1.id, voteCount: 1 }, // Max upvotes
        { userId: student2.id, voteCount: 1 }, // Anna upvotes
      ],
    },
    {
      commentId: comment3.id, // Max's comment on Anna's submission
      votes: [
        { userId: student2.id, voteCount: 1 }, // Anna upvotes
        { userId: student3.id, voteCount: 1 }, // Tom upvotes
      ],
    },
    {
      commentId: comment5.id, // Emma's comment on Paul's submission
      votes: [
        { userId: student5.id, voteCount: 1 }, // Paul upvotes
        { userId: student7.id, voteCount: 1 }, // Leon upvotes
      ],
    },
    {
      commentId: comment6.id, // Leon's comment on Paul's submission
      votes: [
        { userId: student5.id, voteCount: 1 }, // Paul upvotes
        { userId: student6.id, voteCount: 1 }, // Emma upvotes
      ],
    },
    {
      commentId: comment7.id, // Paul's comment on Emma's submission - highly upvoted
      votes: [
        { userId: student6.id, voteCount: 1 }, // Emma upvotes
        { userId: student7.id, voteCount: 1 }, // Leon upvotes
      ],
    },
    {
      commentId: comment9.id, // Sophie's comment on Felix's submission
      votes: [
        { userId: student9.id, voteCount: 1 }, // Felix upvotes
        { userId: student11.id, voteCount: 1 }, // Lukas upvotes
      ],
    },
    {
      commentId: comment10.id, // Lukas's comment on Felix's submission - highly upvoted
      votes: [
        { userId: student9.id, voteCount: 1 }, // Felix upvotes
        { userId: student10.id, voteCount: 1 }, // Sophie upvotes
        { userId: student12.id, voteCount: 1 }, // Hannah upvotes
      ],
    },
    {
      commentId: comment11.id, // Felix's comment on Sophie's submission
      votes: [
        { userId: student10.id, voteCount: 1 }, // Sophie upvotes
        { userId: student11.id, voteCount: 1 }, // Lukas upvotes
      ],
    },
    {
      commentId: comment12.id, // Lukas's comment on Sophie's submission
      votes: [
        { userId: student10.id, voteCount: 1 }, // Sophie upvotes
        { userId: student9.id, voteCount: 1 }, // Felix upvotes
      ],
    },
    {
      commentId: reply1.id, // Max's reply
      votes: [
        { userId: student2.id, voteCount: 1 }, // Anna upvotes
      ],
    },
    {
      commentId: reply2.id, // Felix's reply
      votes: [
        { userId: student10.id, voteCount: 1 }, // Sophie upvotes
      ],
    },
  ]);

  console.log(`  ✅ Created 20 comment votes`);

  // ==========================================================================
  // 10. EVALUATION RATINGS (Optional)
  // ==========================================================================

  console.log('\n⭐ Creating evaluation ratings...');

  await prisma.evaluationRating.createMany({
    data: [
      // Gruppe A ratings
      { submissionId: submission1.id, categoryId: categoryStatik.id, userId: student2.id, rating: 8, comment: 'Statisch solide, Details fehlen noch' },
      { submissionId: submission1.id, categoryId: categoryKonstruktion.id, userId: student2.id, rating: 7 },
      { submissionId: submission1.id, categoryId: categoryGrafik.id, userId: student3.id, rating: 9 },

      { submissionId: submission2.id, categoryId: categoryKonstruktion.id, userId: student1.id, rating: 9, comment: 'Sehr detailliert' },
      { submissionId: submission2.id, categoryId: categoryStatik.id, userId: student3.id, rating: 8 },

      // Gruppe B ratings
      { submissionId: submission3.id, categoryId: categoryStatik.id, userId: student6.id, rating: 7, comment: 'Windlasten ergänzen' },
      { submissionId: submission3.id, categoryId: categoryGrafik.id, userId: student7.id, rating: 9 },

      { submissionId: submission4.id, categoryId: categoryInnovation.id, userId: student5.id, rating: 9, comment: 'Sehr kreativ!' },
      { submissionId: submission4.id, categoryId: categoryKonstruktion.id, userId: student7.id, rating: 8 },

      // Gruppe C ratings
      { submissionId: submission5.id, categoryId: categoryInnovation.id, userId: student10.id, rating: 10, comment: 'Herausragender Ansatz' },
      { submissionId: submission5.id, categoryId: categoryStatik.id, userId: student11.id, rating: 8 },

      { submissionId: submission6.id, categoryId: categoryKonstruktion.id, userId: student9.id, rating: 9 },
      { submissionId: submission6.id, categoryId: categoryGrafik.id, userId: student11.id, rating: 9 },
    ],
    skipDuplicates: true,
  });

  console.log(`  ✅ Created 13 ratings`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ ProTraTest Seed abgeschlossen!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('📊 Erstellte Daten:');
  console.log('  • 1 Module (Tragkonstruktionen)');
  console.log('  • 1 Subject (ProTra Test)');
  console.log('  • 1 ConceptGraph (Tragwerke Grundlagen)');
  console.log('  • 4 ConceptNodes (Seil, Bogen, Rahmen, Flächentragwerk)');
  console.log('  • 4 ModuleHighlightConcepts (with images for HighlightView)');
  console.log('  • 14 Users (1 Admin, 1 Teacher, 12 Students)');
  console.log('  • 3 UserGroups (je 4 Students)');
  console.log('  • 1 EvaluationSession');
  console.log('  • 4 EvaluationCategories');
  console.log('  • 6 EvaluationSubmissions (2 pro Gruppe)');
  console.log('  • 14 EvaluationComments (12 initial + 2 replies)');
  console.log('  • 20 EvaluationCommentVotes');
  console.log('  • 13 EvaluationRatings\n');

  console.log('👥 Test-Login-Daten:');
  console.log('  Admin:    admin@test.de / admin123');
  console.log('  Teacher:  teacher@test.de / teacher123');
  console.log('  Students: student1@test.de - student12@test.de / student123\n');

  console.log('👨‍👩‍👧‍👦 Gruppenstruktur:');
  console.log('  Gruppe A (Team Alpha):');
  console.log('    • Student 1 (Max)      - ✅ Submission 1');
  console.log('    • Student 2 (Anna)     - ✅ Submission 2');
  console.log('    • Student 3 (Tom)      - ❌ Keine Submission');
  console.log('    • Student 4 (Lisa)     - ❌ Keine Submission, KEIN Initialkommentar\n');

  console.log('  Gruppe B (Team Beta):');
  console.log('    • Student 5 (Paul)     - ✅ Submission 3');
  console.log('    • Student 6 (Emma)     - ✅ Submission 4');
  console.log('    • Student 7 (Leon)     - ❌ Keine Submission');
  console.log('    • Student 8 (Mia)      - ❌ Keine Submission, KEIN Initialkommentar\n');

  console.log('  Gruppe C (Team Gamma):');
  console.log('    • Student 9 (Felix)    - ✅ Submission 5');
  console.log('    • Student 10 (Sophie)  - ✅ Submission 6');
  console.log('    • Student 11 (Lukas)   - ❌ Keine Submission');
  console.log('    • Student 12 (Hannah)  - ❌ Keine Submission, KEIN Initialkommentar\n');

  console.log('🔗 Test-URLs (nach Server-Start):');
  console.log('  Gruppe A Submissions:');
  console.log(`    http://localhost:4200/forum/${submission1.id} (Max - Seilkonstruktion)`);
  console.log(`    http://localhost:4200/forum/${submission2.id} (Anna - Bogentragwerk)\n`);

  console.log('  Gruppe B Submissions:');
  console.log(`    http://localhost:4200/forum/${submission3.id} (Paul - Rahmenkonstruktion)`);
  console.log(`    http://localhost:4200/forum/${submission4.id} (Emma - Flächentragwerk)\n`);

  console.log('  Gruppe C Submissions:');
  console.log(`    http://localhost:4200/forum/${submission5.id} (Felix - Hybrid)`);
  console.log(`    http://localhost:4200/forum/${submission6.id} (Sophie - Modulrahmen)\n`);

  console.log('✅ Authorization-Tests:');
  console.log('  Student 1 (Gruppe A) → Zugriff auf Submission 1, 2 ✅');
  console.log('  Student 1 (Gruppe A) → Zugriff auf Submission 3 ❌ (403 Forbidden)');
  console.log('  Student 5 (Gruppe B) → Zugriff auf Submission 3, 4 ✅');
  console.log('  Student 5 (Gruppe B) → Zugriff auf Submission 1 ❌ (403 Forbidden)');
  console.log('  Teacher/Admin       → Zugriff auf ALLE ✅\n');

  console.log('═══════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// EXECUTE SEED
// ============================================================================

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
