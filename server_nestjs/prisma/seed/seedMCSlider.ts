import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting MCSlider test data seeding...');

  try {
    // Create a test user if not exists
    const testUser = await prisma.user.upsert({
      where: { email: 'mcslider.test@example.com' },
      update: {},
      create: {
        email: 'mcslider.test@example.com',
        firstname: 'MCSlider',
        lastname: 'Tester',
        password: '$2b$10$YourHashedPasswordHere', // This should be a properly hashed password
        globalRole: 'STUDENT',
      },
    });

    console.log('✅ Test user created/found:', testUser.email);

    // Create a test module if not exists
    const testModule = await prisma.module.upsert({
      where: { name: 'MCSlider Test Module' },
      update: {},
      create: {
        name: 'MCSlider Test Module',
        description: 'Module for testing MCSlider functionality',
      },
    });

    console.log('✅ Test module created/found:', testModule.name);

    // Create a content node
    const contentNode = await prisma.contentNode.create({
      data: {
        name: 'MCSlider Test Bereich',
        description: 'Testbereich für MCSlider-Komponente',
        position: 1,
      },
    });

    console.log('✅ Content node created:', contentNode.name);

    // Create MCSlider questions
    const questions = [
      {
        name: 'MCSlider Test Frage 1',
        text: 'Was ist die Hauptstadt von Deutschland?',
        description: 'Erste Frage im MCSlider-Test',
        correctAnswer: 'Berlin',
      },
      {
        name: 'MCSlider Test Frage 2',
        text: 'Was ist 2 + 2?',
        description: 'Zweite Frage im MCSlider-Test',
        correctAnswer: '4',
      },
      {
        name: 'MCSlider Test Frage 3',
        text: 'Welches Element hat das Symbol "O"?',
        description: 'Dritte Frage im MCSlider-Test',
        correctAnswer: 'Sauerstoff',
      },
    ];

    for (const [index, questionData] of questions.entries()) {
      // Create the question
      const question = await prisma.question.create({
        data: {
          name: questionData.name,
          description: questionData.description,
          score: 10,
          type: 'MCSlider',
          level: 1,
          mode: 'practise',
          text: questionData.text,
          isApproved: true,
          version: 1,
          author: {
            connect: { id: testUser.id },
          },
        },
      });

      // Create MCQuestion
      const mcQuestion = await prisma.mCQuestion.create({
        data: {
          question: {
            connect: { id: question.id },
          },
          textHTML: `<p>${questionData.text}</p>`,
          shuffleoptions: true,
          isSC: true,
        },
      });

      // Create MCOption (correct answer)
      const mcOption = await prisma.mCOption.create({
        data: {
          text: questionData.correctAnswer,
          is_correct: true,
        },
      });

      // Connect MCOption to MCQuestion
      await prisma.mCQuestionOption.create({
        data: {
          mcQuestionId: mcQuestion.id,
          mcOptionId: mcOption.id,
        },
      });

      // Create content element for the question
      const contentElement = await prisma.contentElement.create({
        data: {
          type: 'QUESTION',
          title: `MCSlider Element ${index + 1}`,
          text: questionData.text,
          question: {
            connect: { id: question.id },
          },
        },
      });

      // Create content view to link content element to content node
      await prisma.contentView.create({
        data: {
          contentNode: {
            connect: { id: contentNode.id },
          },
          contentElement: {
            connect: { id: contentElement.id },
          },
          position: index + 1,
        },
      });

      console.log(`✅ Created MCSlider question ${index + 1}: ${questionData.name}`);
    }

    // Create a concept node and training relationship
    const conceptNode = await prisma.conceptNode.create({
      data: {
        name: 'MCSlider Test Concept',
        description: 'Test concept for MCSlider questions',
      },
    });

    await prisma.training.create({
      data: {
        contentNode: {
          connect: { id: contentNode.id },
        },
        conceptNode: {
          connect: { id: conceptNode.id },
        },
        awards: 10,
      },
    });

    console.log('✅ Created concept node and training relationship');

    // Verify the data
    const contentViews = await prisma.contentView.findMany({
      where: { contentNodeId: contentNode.id },
      include: {
        contentElement: {
          include: {
            question: {
              include: {
                mcQuestion: {
                  include: {
                    MCQuestionOption: {
                      include: {
                        option: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log('\n📊 Verification - Created content views:', contentViews.length);
    contentViews.forEach((cv, index) => {
      const q = cv.contentElement.question;
      if (q && q.mcQuestion.length > 0) {
        const mcq = q.mcQuestion[0];
        const option = mcq.MCQuestionOption[0]?.option;
        console.log(`   ${index + 1}. ${q.text} -> Answer: ${option?.text}`);
      }
    });

    console.log('\n✅ MCSlider test data seeded successfully!');
    console.log('\n🧪 To test the component:');
    console.log('1. Start the Angular development server: npm start');
    console.log('2. Navigate to a content list page');
    console.log('3. Look for "MCSlider Test Bereich" content');
    console.log('4. Click on any MCSlider question to test the component');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });