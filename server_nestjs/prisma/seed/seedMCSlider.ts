import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedMCSlider() {
  console.log('🎯 Seeding MCSlider test data...');

  try {
    // Clean up existing MCSlider test data
    await cleanupMCSliderTestData();

    // Get existing user (use first available user)
    const testUser = await prisma.user.findFirst({
      where: { globalRole: 'ARCHSTUDENT', email: 'hund@proband.de' },
    });

    if (!testUser) {
      throw new Error('No users found in database. Please run basic seeding first.');
    }

    // Get existing ConceptNode (use first available)
    const existingConcept = await prisma.conceptNode.findFirst();

    if (!existingConcept) {
      throw new Error('No ConceptNodes found in database. Please run basic seeding first.');
    }

    // Get existing ContentNode (use first available)
    const existingContentNode = await prisma.contentNode.findFirst();

    if (!existingContentNode) {
      throw new Error('No ContentNodes found in database. Please run basic seeding first.');
    }

    // Test Questions Data
    const testQuestions = [
      {
        name: 'MCSlider: Geografie Hauptstädte',
        text: 'Welche Hauptstädte gehören zu welchen Ländern?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Berlin - Deutschland', correct: true },
          { text: 'Paris - Frankreich', correct: true },
          { text: 'Madrid - Italien', correct: false },
          { text: 'Rom - Italien', correct: true },
          { text: 'London - Spanien', correct: false },
        ],
      },
      {
        name: 'MCSlider: Mathematik Grundlagen',
        text: 'Welche Aussagen über Grundrechenarten sind korrekt?',
        score: 2,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: '2 + 2 = 4', correct: true },
          { text: '5 * 3 = 15', correct: true },
          { text: '10 / 2 = 4', correct: false },
          { text: '7 - 3 = 4', correct: true },
        ],
      },
      {
        name: 'MCSlider: Naturwissenschaften',
        text: 'Welche Aussagen über Naturphänomene sind richtig?',
        score: 4,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Wasser gefriert bei 0°C', correct: true },
          { text: 'Die Sonne ist ein Planet', correct: false },
          { text: 'Licht breitet sich mit ca. 300.000 km/s aus', correct: true },
          { text: 'Ein Jahr hat 365 Tage', correct: true },
          { text: 'Gold ist magnetisch', correct: false },
        ],
      },
      {
        name: 'MCSlider: Einfachauswahl Test',
        text: 'Was ist die Hauptstadt von Deutschland? (Einfachauswahl)',
        score: 1,
        type: 'MCSlider',
        isSC: true,
        options: [
          { text: 'München', correct: false },
          { text: 'Berlin', correct: true },
          { text: 'Hamburg', correct: false },
          { text: 'Köln', correct: false },
        ],
      },
    ];

    // Create questions and their options
    for (const questionData of testQuestions) {
      // Create the main question
      const question = await prisma.question.create({
        data: {
          name: questionData.name,
          text: questionData.text,
          score: questionData.score,
          type: questionData.type,
          authorId: testUser.id,
          conceptNodeId: existingConcept.id,
          isApproved: true,
          level: 1,
          mode: 'practise',
        },
      });

      // Create MCQuestion entry
      const mcQuestion = await prisma.mCQuestion.create({
        data: {
          questionId: question.id,
          textHTML: `<p>${questionData.text}</p>`,
          isSC: questionData.isSC,
          shuffleoptions: true,
        },
      });

      // Create options
      for (const optionData of questionData.options) {
        const mcOption = await prisma.mCOption.create({
          data: {
            text: optionData.text,
            is_correct: optionData.correct,
          },
        });

        // Link option to question
        await prisma.mCQuestionOption.create({
          data: {
            mcQuestionId: mcQuestion.id,
            mcOptionId: mcOption.id,
          },
        });
      }

      // Create ContentElement for the question
      const contentElement = await prisma.contentElement.create({
        data: {
          type: 'QUESTION',
          title: questionData.name,
          text: questionData.text,
          questionId: question.id,
        },
      });

      // Create ContentView to link ContentElement to ContentNode
      await prisma.contentView.create({
        data: {
          contentNodeId: existingContentNode.id,
          contentElementId: contentElement.id,
          position: testQuestions.indexOf(questionData) + 1,
        },
      });
    }

    console.log('✅ MCSlider test data seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - Used existing ConceptNode: "${existingConcept.name}"`);
    console.log(`   - Used existing ContentNode: "${existingContentNode.name}"`);
    console.log(`   - ${testQuestions.length} Questions with MCSlider type`);
    console.log(
      `   - ${testQuestions.reduce((sum, q) => sum + q.options.length, 0)} Answer options`,
    );
    console.log(`   - ${testQuestions.length} ContentElements`);
    console.log(`   - ${testQuestions.length} ContentViews`);

    return {
      conceptNode: existingConcept,
      contentNode: existingContentNode,
      questionsCount: testQuestions.length,
    };
  } catch (error) {
    console.error('❌ Error seeding MCSlider test data:', error);
    throw error;
  }
}

async function cleanupMCSliderTestData() {
  console.log('🧹 Cleaning up existing MCSlider test data...');

  try {
    // Find MCSlider questions by name pattern (more reliable than text content)
    const mcSliderQuestions = await prisma.question.findMany({
      where: {
        type: 'MCSlider',
        name: {
          startsWith: 'MCSlider:',
        },
      },
    });

    console.log(`Found ${mcSliderQuestions.length} existing MCSlider questions to clean up`);

    for (const question of mcSliderQuestions) {
      // Delete related data in correct order

      // 1. Delete ContentViews first
      await prisma.contentView.deleteMany({
        where: {
          contentElement: {
            questionId: question.id,
          },
        },
      });

      // 2. Delete ContentElements
      await prisma.contentElement.deleteMany({
        where: { questionId: question.id },
      });

      // 3. Delete MCQuestionOptions and MCOptions
      const mcQuestion = await prisma.mCQuestion.findFirst({
        where: { questionId: question.id },
      });

      if (mcQuestion) {
        const mcQuestionOptions = await prisma.mCQuestionOption.findMany({
          where: { mcQuestionId: mcQuestion.id },
        });

        // Delete MCOptions
        for (const mqo of mcQuestionOptions) {
          await prisma.mCOption.deleteMany({
            where: { id: mqo.mcOptionId },
          });
        }

        // Delete MCQuestionOptions
        await prisma.mCQuestionOption.deleteMany({
          where: { mcQuestionId: mcQuestion.id },
        });

        // Delete MCQuestion
        await prisma.mCQuestion.deleteMany({
          where: { id: mcQuestion.id },
        });
      }

      // 4. Delete Question
      await prisma.question.deleteMany({
        where: { id: question.id },
      });
    }

    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    // Don't throw here, just log - we want to continue with seeding
  }
}

// Helper function to run only MCSlider seeding
export async function runMCSliderSeed() {
  try {
    await seedMCSlider();
    console.log('🎉 MCSlider seeding completed successfully!');
  } catch (error) {
    console.error('💥 MCSlider seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runMCSliderSeed();
}
