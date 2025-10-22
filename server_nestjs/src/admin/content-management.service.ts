/**
 * Content Management Service
 *
 * This service handles the export and import of learning content data while strictly
 * excluding all personal user data and user-specific progress information.
 *
 * PRINCIPLE: CONTENT ONLY - NO PERSONAL DATA
 *
 * EXPORTED (Learning Content):
 * - Subjects, Modules, Concept structures
 * - Questions of all types (MC, FreeText, Graph, Coding, CodeGame, Fillin, UML, Upload)
 * - Question metadata, scaffolds, solutions, tests
 * - Content elements, files, and educational materials
 * - UML editor configurations
 * - Learning structure relationships and dependencies
 *
 * NOT EXPORTED (Personal Data):
 * - User accounts, authentication, roles
 * - User progress, submissions, answers
 * - User interactions: discussions, messages, votes
 * - Notifications, chat sessions, event logs
 * - Feedback, ratings, personal assessments
 * - File uploads by individual users
 *
 * This ensures that exported content can be safely shared between environments
 * while preserving user privacy and complying with data protection requirements.
 */

import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ContentManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async exportContent() {
    console.log('Starting content export...');

    // Try to get uploadQuestions, but handle if it doesn't exist yet
    let uploadQuestions = [];
    try {
      uploadQuestions = await this.prisma.uploadQuestion.findMany();
    } catch (error) {
      console.log('Note: uploadQuestion table not found, skipping...');
      uploadQuestions = [];
    }

    const [
      subjects,
      modules,
      moduleConceptGoals,
      moduleHighlightConcepts,
      moduleSettings,
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
      questionVersions,
      mcQuestions,
      mcOptions,
      mcQuestionOptions,
      freeTextQuestions,
      graphQuestions,
      codingQuestions,
      codeGerueste,
      modelSolutions,
      automatedTests,
      codeGameQuestions,
      codeGameScaffolds,
      fillinQuestions,
      blanks,
      umlQuestions,
      mcSliderQuestions,
      groupReviewGates,
      questionCollections,
      questionCollectionLinks,
      umlEditorModels,
      umlEditorElements,
      files,
    ] = await Promise.all([
      this.prisma.subject.findMany(),
      this.prisma.module.findMany(),
      this.prisma.moduleConceptGoal.findMany(),
      this.prisma.moduleHighlightConcepts.findMany(),
      this.prisma.moduleSetting.findMany(),
      this.prisma.conceptGraph.findMany(),
      this.prisma.conceptNode.findMany(),
      this.prisma.conceptEdge.findMany(),
      this.prisma.conceptFamily.findMany(),
      this.prisma.contentNode.findMany(),
      this.prisma.contentElement.findMany({
        include: {
          ContentView: true,
          file: true,
          question: true,
        },
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
          // Rhino integration fields
          rhinoEnabled: true,
          rhinoGrasshopperFile: true,
          rhinoSettings: true,
          rhinoAutoLaunch: true,
          rhinoAutoFocus: true,
          // Exclude authorId as it will be set during import
        },
      }),
      this.prisma.questionVersion.findMany(),
      this.prisma.mCQuestion.findMany(),
      this.prisma.mCOption.findMany(),
      this.prisma.mCQuestionOption.findMany(),
      this.prisma.freeTextQuestion.findMany(),
      this.prisma.graphQuestion.findMany(),
      this.prisma.codingQuestion.findMany(),
      this.prisma.codeGeruest.findMany(),
      this.prisma.modelSolution.findMany(),
      this.prisma.automatedTest.findMany(),
      this.prisma.codeGameQuestion.findMany(),
      this.prisma.codeGameScaffold.findMany(),
      this.prisma.fillinQuestion.findMany(),
      this.prisma.blank.findMany(),
      this.prisma.umlQuestion.findMany(),
      this.prisma.mCSliderQuestion.findMany(),
      this.prisma.groupReviewGate.findMany(),
      this.prisma.questionCollection.findMany(),
      this.prisma.questionCollectionLink.findMany(),
      this.prisma.umlEditorModel.findMany({
        include: {
          EditorElement: true,
        },
      }),
      this.prisma.umlEditorElement.findMany(),
      // Export only non-user files (exclude file uploads by individual users)
      this.prisma.file.findMany({
        where: {
          fileUploads: { none: {} },
        },
      }),
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
        moduleHighlightConcepts,
        moduleSettings,
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
        questionVersions,
        mcQuestions,
        mcOptions,
        mcQuestionOptions,
        freeTextQuestions,
        graphQuestions,
        codingQuestions,
        codeGerueste,
        modelSolutions,
        automatedTests,
        codeGameQuestions,
        codeGameScaffolds,
        fillinQuestions,
        blanks,
        umlQuestions,
        mcSliderQuestions,
        groupReviewGates,
        questionCollections,
        questionCollectionLinks,
        umlEditorModels,
        umlEditorElements,
        uploadQuestions,
        files,
      },
    };
  }

  async importContent(data: any) {
    const { version, data: content } = data;

    // Resolve admin user once for setting ownership on imported records (author, updatedBy, etc.)
    const adminUser = await this.prisma.user.findFirst({
      where: { globalRole: 'ADMIN' },
    });
    if (!adminUser) {
      throw new Error('No admin user found in the system. Please create an admin user first.');
    }

    // Phase 1: Database cleanup in separate transaction
    await this.prisma.$transaction(
      async prisma => {
        console.log('Starting database cleanup...');
        // Clear existing data in reverse order of dependencies
        console.log('Clearing user data and feedback...');
        // First clear chats and notifications
        await Promise.all([
          prisma.chatBotMessage.deleteMany(),
          prisma.notification.deleteMany(),
          prisma.chatSession.deleteMany(),
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
          prisma.userUploadAnswer.deleteMany(),
          prisma.userUmlQuestionAnswer.deleteMany(),
          prisma.codeGameScaffoldAnswer.deleteMany(),
          prisma.codeGameAnswer.deleteMany(),
          prisma.feedback.deleteMany(),
          prisma.graphAIFeedback.deleteMany(),
          prisma.codeSubmissionFile.deleteMany(),
          prisma.codeSubmission.deleteMany(),
          prisma.generatedFeedback.deleteMany(),
          prisma.kIFeedback.deleteMany(),
          prisma.userMCOptionSelected.deleteMany(),
          prisma.userMCAnswer.deleteMany(),
        ]);

        // Evaluation system data (personal assessments and interactions)
        await Promise.all([
          prisma.evaluationCommentVote.deleteMany(),
          prisma.evaluationComment.deleteMany(),
          prisma.evaluationRating.deleteMany(),
        ]);
        await Promise.all([
          prisma.evaluationSubmission.deleteMany(),
          prisma.evaluationSessionCategory.deleteMany(),
          prisma.evaluationSession.deleteMany(),
          prisma.evaluationCategory.deleteMany(),
        ]);

        // Misc user-related data
        await Promise.all([
          prisma.eventLog.deleteMany(),
          prisma.refreshToken.deleteMany(),
          prisma.fileUpload.deleteMany(),
        ]);

        // Finally clear user answers and references
        await prisma.userAnswer.deleteMany();
      },
      { timeout: 60000 },
    );

    // Phase 2: Clear learning content in separate transaction
    await this.prisma.$transaction(
      async prisma => {
        console.log('Clearing learning content...');
        // Clear question-related data
        await Promise.all([
          prisma.questionCollectionLink.deleteMany(),
          prisma.userUploadAnswer.deleteMany(),
          prisma.userUmlQuestionAnswer.deleteMany(),
          prisma.codeGameScaffoldAnswer.deleteMany(),
          prisma.codeGameAnswer.deleteMany(),
          prisma.blank.deleteMany(),
          prisma.automatedTest.deleteMany(),
          prisma.modelSolution.deleteMany(),
          prisma.codeGeruest.deleteMany(),
          prisma.codeGameScaffold.deleteMany(),
          prisma.mCQuestionOption.deleteMany(),
          prisma.mCOption.deleteMany(),
          prisma.groupReviewGate.deleteMany(),
          prisma.mCSliderQuestion.deleteMany(),
          prisma.umlQuestion.deleteMany(),
          ...(content.uploadQuestions && content.uploadQuestions.length > 0
            ? [prisma.uploadQuestion.deleteMany()]
            : []),
          prisma.fillinQuestion.deleteMany(),
          prisma.codeGameQuestion.deleteMany(),
          prisma.codingQuestion.deleteMany(),
          prisma.graphQuestion.deleteMany(),
          prisma.freeTextQuestion.deleteMany(),
          prisma.mCQuestion.deleteMany(),
          prisma.questionVersion.deleteMany(),
          prisma.questionCollection.deleteMany(),
          prisma.question.deleteMany(),
        ]);

        // Clear content-related data
        await Promise.all([
          prisma.contentView.deleteMany(),
          prisma.contentElement.deleteMany(),
          prisma.contentEdge.deleteMany(),
          prisma.requirement.deleteMany(),
          prisma.training.deleteMany(),
          prisma.moduleHighlightConcepts.deleteMany(),
          prisma.moduleSetting.deleteMany(),
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
          prisma.umlEditorElement.deleteMany(),
          prisma.umlEditorModel.deleteMany(),
          prisma.module.deleteMany(),
          prisma.transcriptEmbedding.deleteMany(),
          prisma.file.deleteMany(),
        ]);

        // Important: We do NOT clear subjects to preserve UserSubject relationships
        console.log('Note: Preserving subjects to maintain user enrollments');
        console.log('Database cleanup completed');
      },
      { timeout: 60000 },
    );

    console.log('\n=== Starting Import Process ===');

    // Phase 3: Import base entities
    await this.prisma.$transaction(
      async prisma => {
        console.log('=== Phase 1/7: Base Entities ===');
        console.log(`Subjects to import: ${content.subjects.length}`);
        console.log(`Files to import: ${content.files.length}`);
        console.log(`Modules to import: ${content.modules.length}`);

        // Update existing subjects and create new ones if needed
        console.log('Updating/creating subjects...');
        for (const subject of content.subjects) {
          await prisma.subject.upsert({
            where: { id: subject.id },
            update: subject,
            create: subject,
          });
        }

        // Create new files and modules
        await Promise.all([
          prisma.file.createMany({ data: content.files }),
          prisma.module.createMany({ data: content.modules }),
        ]);

        // Import module settings (don't depend on other entities)
        if (content.moduleSettings && content.moduleSettings.length > 0) {
          // Ensure updatedBy references a valid user in this environment
          await prisma.moduleSetting.createMany({
            data: content.moduleSettings.map(ms => ({
              ...ms,
              updatedBy: adminUser.id,
            })),
          });
        }
      },
      { timeout: 60000 },
    );

    // Phase 4: Import concept structure
    await this.prisma.$transaction(
      async prisma => {
        console.log('\n=== Phase 2/7: Concept Structure ===');
        console.log(`Concept nodes to import: ${content.conceptNodes.length}`);
        await prisma.conceptNode.createMany({ data: content.conceptNodes });

        // Now import moduleHighlightConcepts after concept nodes exist
        if (content.moduleHighlightConcepts && content.moduleHighlightConcepts.length > 0) {
          await prisma.moduleHighlightConcepts.createMany({
            data: content.moduleHighlightConcepts,
          });
        }
      },
      { timeout: 60000 },
    );

    // Phase 5: Import concept graphs and relationships
    await this.prisma.$transaction(
      async prisma => {
        console.log('\n=== Phase 3/7: Concept Graphs ===');
        console.log(`Concept graphs to import: ${content.conceptGraphs.length}`);
        await prisma.conceptGraph.createMany({ data: content.conceptGraphs });

        console.log('\n=== Phase 4/7: Concept Relationships ===');
        console.log(`Module concept goals to import: ${content.moduleConceptGoals.length}`);
        console.log(`Concept edges to import: ${content.conceptEdges.length}`);
        console.log(`Concept families to import: ${content.conceptFamilies.length}`);
        await Promise.all([
          prisma.moduleConceptGoal.createMany({ data: content.moduleConceptGoals }),
          prisma.conceptEdge.createMany({ data: content.conceptEdges }),
          prisma.conceptFamily.createMany({ data: content.conceptFamilies }),
        ]);
      },
      { timeout: 60000 },
    );

    // Phase 6: Import content structure
    await this.prisma.$transaction(
      async prisma => {
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
      },
      { timeout: 60000 },
    );

    // Phase 7: Import questions
    await this.prisma.$transaction(
      async prisma => {
        const totalEntities = [
          content.questions.length,
          content.mcQuestions.length,
          content.freeTextQuestions.length,
          content.graphQuestions.length,
          content.codingQuestions.length,
          content.codeGameQuestions.length,
          content.fillinQuestions.length,
          content.umlQuestions.length,
          (content.uploadQuestions || []).length,
        ].reduce((a, b) => a + b, 0);

        console.log('=== Phase 6/7: Questions Import ===');
        console.log(`Total questions to import: ${totalEntities}`);

        // First find an admin user to set as author
        const adminUser = await prisma.user.findFirst({
          where: {
            globalRole: 'ADMIN',
          },
        });

        console.log('Using admin user with ID:', adminUser.id, 'as question author');

        // Import UML editor models first (independent entities)
        if (content.umlEditorModels && content.umlEditorModels.length > 0) {
          console.log('Importing UML editor models...');
          for (const model of content.umlEditorModels) {
            const { EditorElement: editorElements, ...cleanModelData } = model;
            await prisma.umlEditorModel.create({
              data: cleanModelData,
            });
          }
        }

        if (content.umlEditorElements && content.umlEditorElements.length > 0) {
          console.log('Importing UML editor elements...');
          await prisma.umlEditorElement.createMany({ data: content.umlEditorElements });
        }

        await prisma.question.createMany({
          data: content.questions.map(q => ({
            ...q,
            authorId: adminUser.id, // Set the admin user as author
          })),
        });

        console.log('Importing question types...');
        // Respect FK constraints: create versions first, then MCQuestion, then other question-type tables
        await prisma.questionVersion.createMany({ data: content.questionVersions });
        await prisma.mCQuestion.createMany({ data: content.mcQuestions });
        await Promise.all([
          prisma.mCOption.createMany({ data: content.mcOptions }),
          prisma.freeTextQuestion.createMany({ data: content.freeTextQuestions }),
          prisma.graphQuestion.createMany({ data: content.graphQuestions }),
          prisma.codingQuestion.createMany({ data: content.codingQuestions }),
          prisma.codeGameQuestion.createMany({ data: content.codeGameQuestions }),
          prisma.fillinQuestion.createMany({ data: content.fillinQuestions }),
          prisma.umlQuestion.createMany({ data: content.umlQuestions }),
          ...(content.uploadQuestions && content.uploadQuestions.length > 0
            ? [prisma.uploadQuestion.createMany({ data: content.uploadQuestions })]
            : []),
          prisma.mCSliderQuestion.createMany({ data: content.mcSliderQuestions }),
          prisma.groupReviewGate.createMany({ data: content.groupReviewGates }),
        ]);

        if (content.questionCollections && content.questionCollections.length > 0) {
          console.log('Importing question collections...');
          await prisma.questionCollection.createMany({ data: content.questionCollections });
        }

        console.log('Importing question details...');
        await Promise.all([
          prisma.mCQuestionOption.createMany({ data: content.mcQuestionOptions }),
          prisma.codeGeruest.createMany({ data: content.codeGerueste }),
          prisma.modelSolution.createMany({ data: content.modelSolutions }),
          prisma.automatedTest.createMany({ data: content.automatedTests }),
          prisma.codeGameScaffold.createMany({ data: content.codeGameScaffolds }),
          prisma.blank.createMany({ data: content.blanks }),
        ]);

        console.log('Questions import completed');
      },
      { timeout: 120000 },
    );

    // Phase 8: Content Elements Import (separate transaction with batching)
    const totalElements = content.contentElements.length;
    console.log('=== Phase 7/7: Content Elements Import ===');
    console.log(`Total content elements to import: ${totalElements}`);

    const contentNodes = await this.prisma.contentNode.findMany({
      select: { id: true },
    });

    const BATCH_SIZE = 10;
    for (let i = 0; i < content.contentElements.length; i += BATCH_SIZE) {
      const batch = content.contentElements.slice(i, i + BATCH_SIZE);
      await this.prisma.$transaction(
        async prisma => {
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
                questionId: question?.id,
              },
            });

            // Create the content views if they exist
            if (contentViews && contentViews.length > 0) {
              const validContentViews = contentViews.filter(view => {
                const isValid = contentNodes.some(node => node.id === view.contentNodeId);
                if (!isValid) {
                  console.warn(
                    `Warning: ContentNode with ID ${view.contentNodeId} not found, skipping view creation`,
                  );
                }
                return isValid;
              });

              if (validContentViews.length > 0) {
                await prisma.contentView.createMany({
                  data: validContentViews.map(view => ({
                    contentNodeId: view.contentNodeId,
                    contentElementId: createdElement.id,
                    position: view.position,
                    isVisible: view.isVisible,
                  })),
                });
              }
            }
          }
        },
        { timeout: 60000 },
      );
    }

    console.log('Content elements import completed');

    // Phase 9: Import remaining relationships
    await this.prisma.$transaction(
      async prisma => {
        if (content.questionCollectionLinks && content.questionCollectionLinks.length > 0) {
          console.log('Importing question collection links...');
          await prisma.questionCollectionLink.createMany({ data: content.questionCollectionLinks });
        }
      },
      { timeout: 60000 },
    );

    // Phase 10: Reset autoincrement sequences (separate operation)
    console.log('Resetting autoincrement sequences for all tables...');

    const tablesToReset = [
      'File',
      'Module',
      'ModuleSetting',
      'ConceptNode',
      'ModuleHighlightConcepts',
      'ConceptGraph',
      'ModuleConceptGoal',
      'ConceptEdge',
      'ConceptFamily',
      'ContentNode',
      'ContentEdge',
      'Requirement',
      'Training',
      'UmlEditorModel',
      'UmlEditorElement',
      'Question',
      'QuestionVersion',
      'MCQuestion',
      'MCOption',
      'FreeTextQuestion',
      'GraphQuestion',
      'CodingQuestion',
      'CodeGameQuestion',
      'FillinQuestion',
      'UmlQuestion',
      'MCSliderQuestion',
      'GroupReviewGate',
      'QuestionCollection',
      'QuestionCollectionLink',
      'MCQuestionOption',
      'CodeGeruest',
      'ModelSolution',
      'AutomatedTest',
      'CodeGameScaffold',
      'Blank',
      'ContentElement',
      'ContentView',
    ];

    if (content.uploadQuestions && content.uploadQuestions.length > 0) {
      tablesToReset.push('UploadQuestion');
    }

    for (const table of tablesToReset) {
      try {
        console.log(`Resetting sequence for table: ${table}`);
        await this.prisma.$executeRawUnsafe(
          `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), true);`,
        );
      } catch (e) {
        console.error(`Could not reset sequence for table ${table}:`, e.message);
      }
    }

    console.log('All autoincrement sequences reset successfully');
  }
}
