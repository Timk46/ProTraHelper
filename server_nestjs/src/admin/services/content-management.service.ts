import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentManagementService {
  constructor(private prisma: PrismaService) {}

  async exportContent() {
    console.log('Starting content export...');
    const [
      subjects,
      modules,
      moduleConceptGoals,
      conceptGraphs,
      conceptNodes,
      conceptEdges,
      conceptFamilies,
      contentNodes,
      contentElements,
      contentEdges,
      requirements,
      trainings,
      questions,
      mcQuestions,
      mcOptions,
      mcQuestionOptions,
      freeTextQuestions,
      graphQuestions,
      codingQuestions,
      codeGerueste,
      modelSolutions,
      automatedTests,
      fillinQuestions,
      blanks,
      umlQuestions,
      files,
    ] = await Promise.all([
      this.prisma.subject.findMany(),
      this.prisma.module.findMany(),
      this.prisma.moduleConceptGoal.findMany(),
      this.prisma.conceptGraph.findMany(),
      this.prisma.conceptNode.findMany(),
      this.prisma.conceptEdge.findMany(),
      this.prisma.conceptFamily.findMany(),
      this.prisma.contentNode.findMany(),
      this.prisma.contentElement.findMany({
        include: {
          ContentView: true,
          file: true,
          question: true
        }
      }),
      this.prisma.contentEdge.findMany(),
      this.prisma.requirement.findMany(),
      this.prisma.training.findMany(),
      this.prisma.question.findMany({
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          description: true,
          score: true,
          type: true,
          level: true,
          mode: true,
          text: true,
          isApproved: true,
          version: true,
          originId: true,
          conceptNodeId: true,
          // Exclude authorId as it will be set during import
        }
      }),
      this.prisma.mCQuestion.findMany(),
      this.prisma.mCOption.findMany(),
      this.prisma.mCQuestionOption.findMany(),
      this.prisma.freeTextQuestion.findMany(),
      this.prisma.graphQuestion.findMany(),
      this.prisma.codingQuestion.findMany(),
      this.prisma.codeGeruest.findMany(),
      this.prisma.modelSolution.findMany(),
      this.prisma.automatedTest.findMany(),
      this.prisma.fillinQuestion.findMany(),
      this.prisma.blank.findMany(),
      this.prisma.umlQuestion.findMany(),
      this.prisma.file.findMany(),
    ]);

    console.log('Export completed successfully');
    return {
      version: '1.0',
      metadata: {
        exportDate: new Date().toISOString(),
        description: 'Learning content export',
      },
      data: {
        subjects,
        modules,
        moduleConceptGoals,
        conceptGraphs,
        conceptNodes,
        conceptEdges,
        conceptFamilies,
        contentNodes,
        contentElements,
        contentEdges,
        requirements,
        trainings,
        questions,
        mcQuestions,
        mcOptions,
        mcQuestionOptions,
        freeTextQuestions,
        graphQuestions,
        codingQuestions,
        codeGerueste,
        modelSolutions,
        automatedTests,
        fillinQuestions,
        blanks,
        umlQuestions,
        files,
      },
    };
  }

  async importContent(data: any) {
    const { version, data: content } = data;

    // Start a transaction to ensure data consistency
    await this.prisma.$transaction(async (prisma) => {
      console.log('Starting database cleanup...');
      // Clear existing data in reverse order of dependencies
      console.log('Clearing user data and feedback...');
      // First clear chats and notifications
      await Promise.all([
        prisma.chatBotMessage.deleteMany(),
        prisma.notification.deleteMany(),
      ]);

      // Then clear discussion-related data
      await Promise.all([
        prisma.vote.deleteMany(),
        prisma.message.deleteMany(),
        prisma.discussion.deleteMany(),
        prisma.anonymousUser.deleteMany(),
      ]);

      // Then clear learning progress data (preserving user subject enrollment)
      await Promise.all([
        prisma.userContentElementProgress.deleteMany(),
        prisma.userConcept.deleteMany(),
        prisma.userConceptEvent.deleteMany(),
      ]);

      // Then clear progress views (without affecting enrollments)
      await prisma.userContentView.deleteMany();

      // Then clear submissions and feedback
      await Promise.all([
        prisma.feedback.deleteMany(),
        prisma.graphAIFeedback.deleteMany(),
        prisma.codeSubmissionFile.deleteMany(),
        prisma.codeSubmission.deleteMany(),
        prisma.generatedFeedback.deleteMany(),
        prisma.kIFeedback.deleteMany(),
        prisma.userMCOptionSelected.deleteMany(),
        prisma.userMCAnswer.deleteMany(),
      ]);

      // Finally clear user answers and references
      await prisma.userAnswer.deleteMany();

      console.log('Clearing learning content...');
      // Clear question-related data
      await Promise.all([
        prisma.blank.deleteMany(),
        prisma.automatedTest.deleteMany(),
        prisma.modelSolution.deleteMany(),
        prisma.codeGeruest.deleteMany(),
        prisma.mCQuestionOption.deleteMany(),
        prisma.mCOption.deleteMany(),
        prisma.umlQuestion.deleteMany(),
        prisma.fillinQuestion.deleteMany(),
        prisma.codingQuestion.deleteMany(),
        prisma.graphQuestion.deleteMany(),
        prisma.freeTextQuestion.deleteMany(),
        prisma.mCQuestion.deleteMany(),
        prisma.question.deleteMany(),
      ]);

      // Clear content-related data
      await Promise.all([
        prisma.contentView.deleteMany(),
        prisma.contentElement.deleteMany(),
        prisma.contentEdge.deleteMany(),
        prisma.requirement.deleteMany(),
        prisma.training.deleteMany(),
        prisma.contentNode.deleteMany(),
      ]);

      // Clear concept-related data
      await Promise.all([
        prisma.conceptEdge.deleteMany(),
        prisma.conceptFamily.deleteMany(),
        prisma.moduleConceptGoal.deleteMany(),
        prisma.conceptNode.deleteMany(),
        prisma.conceptGraph.deleteMany(),
      ]);

      // Clear files and modules but preserve subjects for user enrollments
      await Promise.all([
        prisma.module.deleteMany(),
        prisma.file.deleteMany(),
      ]);

      // Important: We do NOT clear subjects to preserve UserSubject relationships
      console.log('Note: Preserving subjects to maintain user enrollments');

      console.log('Database cleanup completed');
      console.log('\n=== Starting Import Process ===');

      // Import data in the correct order to maintain relationships
      console.log('=== Phase 1/7: Base Entities ===');
      console.log(`Subjects to import: ${content.subjects.length}`);
      console.log(`Files to import: ${content.files.length}`);
      console.log(`Modules to import: ${content.modules.length}`);
      // First layer: independent entities
      // Update existing subjects and create new ones if needed
      console.log('Updating/creating subjects...');
      for (const subject of content.subjects) {
        await prisma.subject.upsert({
          where: { id: subject.id },
          update: subject,
          create: subject
        });
      }

      // Create new files and modules
      await Promise.all([
        prisma.file.createMany({ data: content.files }),
        prisma.module.createMany({ data: content.modules }),
      ]);

      // Second layer: concept nodes
      console.log('\n=== Phase 2/7: Concept Structure ===');
      console.log(`Concept nodes to import: ${content.conceptNodes.length}`);
      await prisma.conceptNode.createMany({ data: content.conceptNodes });

      // Third layer: concept graphs (depends on concept nodes for root)
      console.log('\n=== Phase 3/7: Concept Graphs ===');
      console.log(`Concept graphs to import: ${content.conceptGraphs.length}`);
      await prisma.conceptGraph.createMany({ data: content.conceptGraphs });

      // Fourth layer: concept relationships and module goals
      console.log('\n=== Phase 4/7: Concept Relationships ===');
      console.log(`Module concept goals to import: ${content.moduleConceptGoals.length}`);
      console.log(`Concept edges to import: ${content.conceptEdges.length}`);
      console.log(`Concept families to import: ${content.conceptFamilies.length}`);
      await Promise.all([
        prisma.moduleConceptGoal.createMany({ data: content.moduleConceptGoals }),
        prisma.conceptEdge.createMany({ data: content.conceptEdges }),
        prisma.conceptFamily.createMany({ data: content.conceptFamilies }),
      ]);

      // Fifth layer: content nodes
      console.log('\n=== Phase 5/7: Content Structure ===');
      console.log(`Content nodes to import: ${content.contentNodes.length}`);
      await prisma.contentNode.createMany({ data: content.contentNodes });

      console.log('Importing content relationships:');
      console.log(`Content edges to import: ${content.contentEdges.length}`);
      console.log(`Requirements to import: ${content.requirements.length}`);
      console.log(`Trainings to import: ${content.trainings.length}`);
      await Promise.all([
        prisma.contentEdge.createMany({ data: content.contentEdges }),
        prisma.requirement.createMany({ data: content.requirements }),
        prisma.training.createMany({ data: content.trainings }),
      ]);

      // Calculate total entities for progress tracking
      const totalEntities = [
        content.questions.length,
        content.mcQuestions.length,
        content.freeTextQuestions.length,
        content.graphQuestions.length,
        content.codingQuestions.length,
        content.fillinQuestions.length,
        content.umlQuestions.length
      ].reduce((a, b) => a + b, 0);

      console.log('=== Phase 6/7: Questions Import ===');
      console.log(`Total questions to import: ${totalEntities}`);
      // First find an admin user to set as author
      const adminUser = await prisma.user.findFirst({
        where: {
          globalRole: 'ADMIN'
        }
      });

      if (!adminUser) {
        throw new Error('No admin user found in the system. Please create an admin user first.');
      }

      console.log('Using admin user with ID:', adminUser.id, 'as question author');
      await prisma.question.createMany({
        data: content.questions.map(q => ({
          ...q,
          authorId: adminUser.id // Set the admin user as author
        }))
      });

      console.log('Importing question types...');
      await Promise.all([
        prisma.mCQuestion.createMany({ data: content.mcQuestions }),
        prisma.mCOption.createMany({ data: content.mcOptions }),
        prisma.freeTextQuestion.createMany({ data: content.freeTextQuestions }),
        prisma.graphQuestion.createMany({ data: content.graphQuestions }),
        prisma.codingQuestion.createMany({ data: content.codingQuestions }),
        prisma.fillinQuestion.createMany({ data: content.fillinQuestions }),
        prisma.umlQuestion.createMany({ data: content.umlQuestions }),
      ]);

      console.log('Importing question details...');
      await Promise.all([
        prisma.mCQuestionOption.createMany({ data: content.mcQuestionOptions }),
        prisma.codeGeruest.createMany({ data: content.codeGerueste }),
        prisma.modelSolution.createMany({ data: content.modelSolutions }),
        prisma.automatedTest.createMany({ data: content.automatedTests }),
        prisma.blank.createMany({ data: content.blanks }),
      ]);

      console.log('Initial import completed');
    });

    // Calculate total elements for progress tracking
    const totalElements = content.contentElements.length;
    console.log('=== Phase 7/7: Content Elements Import ===');
    console.log(`Total content elements to import: ${totalElements}`);
    const contentNodes = await this.prisma.contentNode.findMany({
      select: { id: true }
    });

    const BATCH_SIZE = 10;
    for (let i = 0; i < content.contentElements.length; i += BATCH_SIZE) {
      const batch = content.contentElements.slice(i, i + BATCH_SIZE);
      await this.prisma.$transaction(async (prisma) => {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalElements / BATCH_SIZE);
        const progress = Math.round((i / totalElements) * 100);
        console.log(`Processing batch ${batchNumber}/${totalBatches} (${progress}% complete)...`);

        for (const element of batch) {
          const { ContentView: contentViews, file, question, ...cleanElementData } = element;

          // Create the content element and get its ID
          const createdElement = await prisma.contentElement.create({
            data: {
              ...cleanElementData,
              fileId: file?.id,
              questionId: question?.id
            }
          });

          // Create the content views if they exist
          if (contentViews && contentViews.length > 0) {
            const validContentViews = contentViews.filter(view => {
              const isValid = contentNodes.some(node => node.id === view.contentNodeId);
              if (!isValid) {
                console.warn(`Warning: ContentNode with ID ${view.contentNodeId} not found, skipping view creation`);
              }
              return isValid;
            });

            if (validContentViews.length > 0) {
              await prisma.contentView.createMany({
                data: validContentViews.map(view => ({
                  contentNodeId: view.contentNodeId,
                  contentElementId: createdElement.id,
                  position: view.position
                }))
              });
            }
          }
        }
      });
    }

    console.log('Content elements import completed');
  }
}
