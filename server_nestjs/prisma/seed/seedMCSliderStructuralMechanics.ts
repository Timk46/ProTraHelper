import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds MCSlider structural mechanics questions with standardized scoring for Multiple Choice questions.
 * Creates comprehensive test data covering structural mechanics topics including thrust line analysis,
 * moment distribution, support span variations, and optimal structural design.
 * 
 * @description Initializes MCSlider structural mechanics questions with:
 *   - 8 Multiple Choice questions (3 points each)
 *   - 3 Single Choice questions (1 point each)
 *   - Associated MCOptions for each question
 *   - Links to existing users and content nodes
 * 
 * @returns {Promise<object>} Seeding result statistics including created questions count
 * @throws {Error} If required dependencies (admin user, ConceptNodes, ContentNodes) are missing
 * @throws {Error} If database operations fail during seeding process
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await seedMCSliderStructuralMechanics();
 *   console.log(`Created ${result.questionsCount} structural mechanics questions`);
 * } catch (error) {
 *   console.error('Structural mechanics seeding failed:', error);
 * }
 * ```
 * 
 * @memberof PrismaSeeding
 * @since 1.0.0
 */
export async function seedMCSliderStructuralMechanics() {
  console.log('🏗️ Seeding MCSlider structural mechanics test data...');

  try {
    // Clean up existing structural mechanics test data
    await cleanupStructuralMechanicsTestData();

    // Get existing user (use first available admin user)
    const testUser = await prisma.user.findFirst({
      where: { globalRole: 'ADMIN', email: 'admin@admin.de' },
    });

    if (!testUser) {
      throw new Error('No admin users found in database. Please run basic seeding first.');
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

    // Structural Mechanics Test Questions Data
    const structuralMechanicsQuestions = [
      {
        name: 'MCSlider: Strukturmechanik - Stützlinie und Momentenverlauf',
        text: 'Wie verhält sich die Momentenlinie in Bezug auf die Stützlinie?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Je größer der Abstand der Stützlinie zur Systemlinie, umso größer das Moment', correct: true },
          { text: 'Die Stützlinie zeigt die Richtung der Hauptspannungen an', correct: false },
          { text: 'Stützlinie und Momentenlinie sind voneinander unabhängig', correct: false },
          { text: 'Der Abstand der Stützlinie zur Systemlinie ist proportional zur Momentengröße', correct: true },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Maximale Momente',
        text: 'Wo sind die Momente in Bezug zur Stützlinie am größten?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Die Momente sind am größten, wo der Abstand der Stützlinie zur Systemlinie maximal ist', correct: true },
          { text: 'Maximale Momente treten nur an den Auflagern auf', correct: false },
          { text: 'Die größten Momente sind immer in der Feldmitte', correct: false },
          { text: 'Dort wo die Stützlinie die weiteste Auslenkung von der Systemachse hat', correct: true },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Minimale Momente',
        text: 'Wo sind die Momente in Bezug zur Stützlinie am kleinsten?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Die Momente sind am kleinsten, wo der Abstand der Stützlinie zur Systemlinie minimal ist', correct: true },
          { text: 'Minimale Momente gibt es nur an gelenkigen Verbindungen', correct: false },
          { text: 'An den Rändern der Konstruktion sind die Momente immer minimal', correct: false },
          { text: 'Dort wo sich Stützlinie und Systemlinie am nächsten kommen', correct: true },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Nullmomente',
        text: 'Wie groß sind die Momente dort, wo die Stützlinie die Systemlinie schneidet?',
        score: 1,
        type: 'MCSlider',
        isSC: true,
        options: [
          { text: 'Die Momente sind dort gleich 0', correct: true },
          { text: 'Die Momente sind dort maximal', correct: false },
          { text: 'Die Momente entsprechen der Normalkraft', correct: false },
          { text: 'Die Momente sind dort unbestimmt', correct: false },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Rahmenecken',
        text: 'Wie verhalten sich die Momente in den Ecken an Riegel und Stiel?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Die Momente sind gleich groß', correct: true },
          { text: 'Durch die Einspannung werden die Momente an den Ecken von einem Element in das andere übertragen', correct: true },
          { text: 'Rahmenecken übertragen keine Momente', correct: false },
          { text: 'Die Momente sind in Riegel und Stiel unterschiedlich', correct: false },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Momentenverhältnis',
        text: 'Wie ist das Verhältnis von Eckmomente im Riegel zu maximalem Feldmoment im Riegel?',
        score: 1,
        type: 'MCSlider',
        isSC: true,
        options: [
          { text: '1:1', correct: true },
          { text: '2:1', correct: false },
          { text: '1:2', correct: false },
          { text: '3:1', correct: false },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Stützweite Ausgangsform',
        text: 'Bei welcher Stützweite (Ausgangsform, x, y oder z) ist das Moment (der Betrag) an der Ecke und im Feld des Riegels gleich hoch?',
        score: 1,
        type: 'MCSlider',
        isSC: true,
        options: [
          { text: 'In der Ausgangsversion', correct: true },
          { text: 'Bei Version x', correct: false },
          { text: 'Bei Version y', correct: false },
          { text: 'Bei Version z', correct: false },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Eckmoment größer Feldmoment',
        text: 'Bei welcher Stützweite (Ausgangsform, x, y oder z) ist das Moment (der Betrag) an der Ecke größer als im Feld des Riegels?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Bei Version x', correct: true },
          { text: 'Bei Version y', correct: true },
          { text: 'Bei Version z', correct: false },
          { text: 'In der Ausgangsversion', correct: false },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Eckmoment kleiner Feldmoment',
        text: 'Bei welcher Stützweite (Ausgangsform, x, y oder z) ist das Moment (der Betrag) an der Ecke kleiner als im Feld des Riegels?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Bei Version z', correct: true },
          { text: 'Bei Version x', correct: false },
          { text: 'Bei Version y', correct: false },
          { text: 'In der Ausgangsversion', correct: false },
          { text: 'Bei kürzeren Spannweiten überwiegen die Feldmomente', correct: true },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Größte Momentendifferenz',
        text: 'Bei welcher Stützweite (Ausgangsform, x, y oder z) ist die Differenz der Momente (der Betrag) von Ecke und Feld am größten?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Bei Version x', correct: true },
          { text: 'Bei Version y', correct: true },
          { text: 'Bei Version z', correct: false },
          { text: 'In der Ausgangsversion', correct: false },
          { text: 'Längere Spannweiten verstärken die Momentenunterschiede', correct: true },
        ],
      },
      {
        name: 'MCSlider: Strukturmechanik - Optimale Auslastung',
        text: 'Bei welchem Verhältnis der Momente (Betrag) von Eck- und Feldmoment ist die Auslastung des Riegels optimal und kann die geringste Dimensionierung ermöglicht werden?',
        score: 3,
        type: 'MCSlider',
        isSC: false,
        options: [
          { text: 'Verhältnis Stützmoment zu Feldmoment = 1:1', correct: true },
          { text: 'Eine gleichmäßige Momentenverteilung führt zu materialeffizientem Design', correct: true },
          { text: 'Verhältnis sollte 2:1 betragen', correct: false },
          { text: 'Feldmomente sollten immer minimiert werden', correct: false },
          { text: 'Optimale Ausnutzung bei ausgeglichenen Momenten', correct: true },
        ],
      },
    ];

    // Create questions and their options
    for (const questionData of structuralMechanicsQuestions) {
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
          position: structuralMechanicsQuestions.indexOf(questionData) + 1,
        },
      });
    }

    console.log('✅ Structural mechanics test data seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`   - Used existing ConceptNode: "${existingConcept.name}"`);
    console.log(`   - Used existing ContentNode: "${existingContentNode.name}"`);
    console.log(`   - ${structuralMechanicsQuestions.length} Questions with MCSlider type`);
    console.log(
      `   - ${structuralMechanicsQuestions.reduce((sum, q) => sum + q.options.length, 0)} Answer options`,
    );
    console.log(`   - ${structuralMechanicsQuestions.length} ContentElements`);
    console.log(`   - ${structuralMechanicsQuestions.length} ContentViews`);

    return {
      conceptNode: existingConcept,
      contentNode: existingContentNode,
      questionsCount: structuralMechanicsQuestions.length,
    };
  } catch (error) {
    console.error('❌ Error seeding structural mechanics test data:', error);
    throw error;
  }
}

async function cleanupStructuralMechanicsTestData() {
  console.log('🧹 Cleaning up existing structural mechanics test data...');

  try {
    // Find structural mechanics questions by name pattern
    const structuralMechanicsQuestions = await prisma.question.findMany({
      where: {
        type: 'MCSlider',
        name: {
          startsWith: 'MCSlider: Strukturmechanik',
        },
      },
    });

    console.log(`Found ${structuralMechanicsQuestions.length} existing structural mechanics questions to clean up`);

    for (const question of structuralMechanicsQuestions) {
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

// Helper function to run only structural mechanics seeding
export async function runStructuralMechanicsSeed() {
  try {
    await seedMCSliderStructuralMechanics();
    console.log('🎉 Structural mechanics seeding completed successfully!');
  } catch (error) {
    console.error('💥 Structural mechanics seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runStructuralMechanicsSeed();
}