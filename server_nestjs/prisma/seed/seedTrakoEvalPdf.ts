import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds the TRAKO_EVAL.pdf file into the database
 * This allows the file to be served through the backend file service
 */
async function seedTrakoEvalPdf() {
  console.log('🚀 Starting TRAKO_EVAL.pdf seeding...');

  try {
    // Check if the file already exists
    const existingFile = await prisma.file.findUnique({
      where: { uniqueIdentifier: 'trako-eval-pdf' },
    });

    if (existingFile) {
      console.log('✅ TRAKO_EVAL.pdf already exists in database');
      return existingFile;
    }

    // Create the file entry
    const trakoFile = await prisma.file.create({
      data: {
        uniqueIdentifier: 'trako-eval-pdf',
        name: 'TRAKO_EVAL.pdf',
        path: 'Grasshopper/TRAKO_EVAL.pdf',
        type: 'application/pdf',
      },
    });

    console.log('✅ TRAKO_EVAL.pdf successfully registered in database');
    console.log('   - ID:', trakoFile.id);
    console.log('   - Unique Identifier:', trakoFile.uniqueIdentifier);
    console.log('   - Path:', trakoFile.path);
    
    // Update evaluation submissions to use this file if needed
    const submissions = await prisma.evaluationSubmission.findMany({
      where: {
        pdfFileId: null,
        title: {
          contains: 'Rahmenkonstruktion'
        }
      }
    });

    if (submissions.length > 0) {
      console.log(`📎 Found ${submissions.length} submissions to link with TRAKO_EVAL.pdf`);
      
      for (const submission of submissions) {
        await prisma.evaluationSubmission.update({
          where: { id: submission.id },
          data: { pdfFileId: trakoFile.id }
        });
        console.log(`   - Linked submission: ${submission.title}`);
      }
    }

    return trakoFile;
  } catch (error) {
    console.error('❌ Error seeding TRAKO_EVAL.pdf:', error);
    throw error;
  }
}

// Execute the seed function
seedTrakoEvalPdf()
  .then(() => {
    console.log('✨ TRAKO_EVAL.pdf seeding completed successfully');
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });