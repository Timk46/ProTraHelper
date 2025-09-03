import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds evaluation demo data for demo-submission-001
 * This creates the necessary database records for the frontend to work properly
 */
export async function seedEvaluationDemo() {
  console.log('🌱 Seeding evaluation demo data...');

  try {
    // First, get existing users from database
    const existingUsers = await prisma.user.findMany({
      select: { id: true, email: true },
      orderBy: { id: 'asc' }
    });
    
    console.log(`📊 Found ${existingUsers.length} existing users`);
    
    // Ensure we have enough users for the demo
    if (existingUsers.length < 5) {
      throw new Error(`Not enough users in database. Found ${existingUsers.length}, need at least 5. Please run seedTraKo() and seedEvaluationCompleteFix() first.`);
    }
    
    // Use the last 5 users for demo comments
    const demoUsers = existingUsers.slice(-5);
    console.log('👥 Using these users for demo:', demoUsers.map(u => `ID:${u.id} (${u.email})`).join(', '));
    // 1. Create evaluation session
    const session = await prisma.evaluationSession.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        title: 'CAD Konstruktionsaufgabe - Demo Session',
        description: 'Demo session for evaluation discussion forum',
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-12-31T23:59:59Z'),
        moduleId: 1, // Assuming module 1 exists
        createdById: 1, // Assuming user 1 exists
        isActive: true,
        isAnonymous: true,
        phase: 'DISCUSSION',
      },
    });

    console.log('✅ Created evaluation session:', session.id);

    // 2. Create evaluation categories
    const categories = [
      {
        id: 1,
        sessionId: 1,
        name: 'vollstaendigkeit',
        displayName: 'Vollständigkeit',
        description: 'Vollständigkeit der Lösung',
        icon: 'check_circle',
        color: '#4CAF50',
        order: 1,
      },
      {
        id: 2,
        sessionId: 1,
        name: 'grafische_darstellung',
        displayName: 'Grafische Darstellungsqualität',
        description: 'Qualität der grafischen Darstellung',
        icon: 'palette',
        color: '#2196F3',
        order: 2,
      },
      {
        id: 3,
        sessionId: 1,
        name: 'vergleichbarkeit',
        displayName: 'Vergleichbarkeit',
        description: 'Vergleichbarkeit mit anderen Lösungen',
        icon: 'compare',
        color: '#FF9800',
        order: 3,
      },
      {
        id: 4,
        sessionId: 1,
        name: 'komplexitaet',
        displayName: 'Komplexität',
        description: 'Komplexität der Lösung',
        icon: 'settings',
        color: '#9C27B0',
        order: 4,
      },
    ];

    for (const category of categories) {
      await prisma.evaluationCategory.upsert({
        where: { id: category.id },
        update: {},
        create: category,
      });
    }

    console.log('✅ Created evaluation categories:', categories.length);

    // 3. Create evaluation submission
    const submission = await prisma.evaluationSubmission.upsert({
      where: { id: 'demo-submission-001' },
      update: {},
      create: {
        id: 'demo-submission-001',
        title: 'Entwurf "Stabile Rahmenkonstruktion"',
        description: 'Innovativer Entwurf für eine stabile Rahmenkonstruktion mit modernen Materialien und optimierter Statik.',
        authorId: demoUsers[0].id, // Use first demo user
        pdfFileId: 9, // Assuming file 9 exists
        sessionId: 1,
        status: 'SUBMITTED',
        phase: 'DISCUSSION',
        submittedAt: new Date('2024-01-20T00:00:00Z'),
      },
    });

    console.log('✅ Created evaluation submission:', submission.id);

    // 4. Create demo comments for each category using dynamic user IDs
    const demoComments = [
      {
        id: 'demo-comment-001',
        submissionId: 'demo-submission-001',
        categoryId: 1,
        userId: demoUsers[1].id, // Second demo user
        content: 'Die Konstruktion wirkt sehr durchdacht. Alle wesentlichen Bauteile sind klar erkennbar und sinnvoll dimensioniert.',
        anonymousDisplayName: 'Student B',
        upvotes: 2,
        downvotes: 0,
        voteDetails: { userVotes: { [demoUsers[2].id]: 'UP', [demoUsers[3].id]: 'UP' } },
      },
      {
        id: 'demo-comment-002',
        submissionId: 'demo-submission-001',
        categoryId: 1,
        userId: demoUsers[2].id, // Third demo user
        content: 'Mir fehlen einige Details bei den Verbindungselementen. Wie sollen die Träger miteinander verbunden werden?',
        anonymousDisplayName: 'Student C',
        upvotes: 1,
        downvotes: 0,
        voteDetails: { userVotes: { [demoUsers[1].id]: 'UP' } },
      },
      {
        id: 'demo-comment-003',
        submissionId: 'demo-submission-001',
        categoryId: 2,
        userId: demoUsers[1].id, // Second demo user again
        content: 'Sehr saubere technische Zeichnung! Die Bemaßung ist vollständig und korrekt dargestellt.',
        anonymousDisplayName: 'Student B',
        upvotes: 3,
        downvotes: 0,
        voteDetails: { userVotes: { [demoUsers[2].id]: 'UP', [demoUsers[3].id]: 'UP', [demoUsers[4].id]: 'UP' } },
      },
      {
        id: 'demo-comment-004',
        submissionId: 'demo-submission-001',
        categoryId: 3,
        userId: demoUsers[3].id, // Fourth demo user
        content: 'Standardisierte CAD-Symbole verwendet - das ist gut für Vergleiche mit anderen Entwürfen.',
        anonymousDisplayName: 'Student D',
        upvotes: 2,
        downvotes: 1,
        voteDetails: { userVotes: { [demoUsers[1].id]: 'UP', [demoUsers[2].id]: 'DOWN', [demoUsers[4].id]: 'UP' } },
      },
    ];

    for (const comment of demoComments) {
      await prisma.evaluationComment.upsert({
        where: { id: comment.id },
        update: {},
        create: comment,
      });
    }

    console.log('✅ Created demo comments:', demoComments.length);

    console.log('🎉 Evaluation demo data seeded successfully!');
    console.log('✅ Ready to test: http://localhost:4200/forum/demo-submission-001');

  } catch (error) {
    console.error('❌ Error seeding evaluation demo data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedEvaluationDemo()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}