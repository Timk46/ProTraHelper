import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRhinoData() {
  console.log('🔄 Starting Rhino data migration...');

  try {
    // Find all MCSlider questions
    const mcSliderQuestions = await prisma.question.findMany({
      where: { type: 'MCSLIDER' }
    });

    console.log(`📋 Found ${mcSliderQuestions.length} MCSlider questions`);

    // Update existing MCSlider questions with Rhino integration
    for (const question of mcSliderQuestions) {
      await prisma.question.update({
        where: { id: question.id },
        data: {
          rhinoEnabled: true,
          rhinoGrasshopperFile: 'Rahmen.gh', // Default for MCSlider
          rhinoAutoLaunch: false,
          rhinoAutoFocus: true,
          rhinoSettings: {
            focusDelayMs: 1000,
            showViewport: true,
            batchMode: false
          }
        }
      });

      console.log(`✅ Updated question ${question.id}: ${question.name}`);
    }

    // Find all existing MCSlider questions that need MCSliderQuestion entries
    const mcSliderQuestionsWithoutMCSliderEntry = await prisma.question.findMany({
      where: { 
        type: 'MCSLIDER',
        mCSliderQuestion: null
      }
    });

    console.log(`🔧 Creating MCSliderQuestion entries for ${mcSliderQuestionsWithoutMCSliderEntry.length} questions`);

    // Create MCSliderQuestion entries for existing questions
    for (const question of mcSliderQuestionsWithoutMCSliderEntry) {
      await prisma.mCSliderQuestion.create({
        data: {
          questionId: question.id,
          items: [
            {
              text: 'Example slider item',
              correctValue: 5,
              minValue: 0,
              maxValue: 10,
              stepSize: 1,
              unit: '',
              tolerance: 0.5
            }
          ],
          config: {
            showLabels: true,
            showValues: true,
            allowPartialCredit: true,
            randomizeOrder: false,
            theme: 'default'
          },
          rhinoIntegration: {
            enabled: true,
            grasshopperFile: 'Rahmen.gh',
            autoLaunch: false,
            autoFocus: true,
            focusDelayMs: 1000
          }
        }
      });

      console.log(`✅ Created MCSliderQuestion entry for question ${question.id}`);
    }

    console.log('🎉 Migration completed successfully!');
    
    // Verify migration results
    const updatedQuestions = await prisma.question.count({
      where: { 
        type: 'MCSLIDER',
        rhinoEnabled: true
      }
    });

    const mcSliderEntries = await prisma.mCSliderQuestion.count();

    console.log(`✅ Verification: ${updatedQuestions} MCSlider questions with Rhino enabled`);
    console.log(`✅ Verification: ${mcSliderEntries} MCSliderQuestion entries created`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateRhinoData()
    .catch(console.error);
}

export { migrateRhinoData };