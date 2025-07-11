import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; // Adjust path if needed based on actual structure
import type { LearnerModelDto } from '@Interfaces/tutorKaiDtos/LearnerModel.dto';
import type { KIFeedback, CodeSubmission } from '@prisma/client';
import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

@Injectable()
export class LearnerModelToolService {
  // Renamed class
  private readonly logger = new Logger(LearnerModelToolService.name);

  // Instantiate ChatOpenAI - assumes OPENAI_API_KEY is in environment variables
  private readonly chatModel = new ChatOpenAI({
    temperature: 0.2,
  });

  constructor(private readonly prisma: PrismaService) {}

  // Renamed method to be more descriptive for tool usage
  async getLearnerModelData(
    userId: number,
    codingQuestionId: number,
    // currentSubmissionTimestamp: Date, // Timestamp might not be needed if tool is called before submission processing
    conceptNodeId: number | null,
  ): Promise<LearnerModelDto> {
    this.logger.log(
      `Fetching learner model data for tool: user ${userId}, question ${codingQuestionId}, concept ${conceptNodeId}`,
    );

    // Fetch task history first, as it might be needed for time calculations if we add them back
    // Note: If the tool is called *before* the current submission is saved, we fetch *all* history for the task.
    const taskHistory = await this.getTaskHistory(userId, codingQuestionId);

    // --- Fetch other data concurrently ---
    const promises: Promise<any>[] = [
      this.getOverallCodingPerformance(userId),
      // conceptPromise and prerequisitePromise depend on conceptNodeId
    ];

    const conceptPromise =
      conceptNodeId !== null
        ? this.getConceptPerformance(userId, conceptNodeId)
        : Promise.resolve(null);
    const prerequisitePromise =
      conceptNodeId !== null
        ? this.getPrerequisitePerformance(userId, conceptNodeId)
        : Promise.resolve([]);

    promises.push(conceptPromise, prerequisitePromise);

    // We already have taskHistory, so only await the others
    const [overallPerformance, conceptData, prerequisiteData] = await Promise.all(promises);

    // --- Calculate Recent Activity ---
    // This might need adjustment depending on when the tool is called relative to submission saving
    const lastOverallSubmission = await this.prisma.codeSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    // Time since last attempt on *this* task. Requires careful handling of current time vs last submission time.
    // For simplicity, let's omit this specific calculation for now, as the tool context might not have the 'currentSubmissionTimestamp'
    const timeSinceLastAttemptSeconds = null; // Placeholder - revisit if needed

    // --- Generate Task Summary ---
    const taskHistorySummary = await this.generateTaskSummary(taskHistory);

    // --- Assemble DTO ---
    const learnerModel: LearnerModelDto = {
      performanceOnCurrentConcept: conceptData,
      performanceOnPrerequisites: prerequisiteData,
      overallCodingPerformance: overallPerformance,
      recentActivity: {
        lastSubmissionDate: lastOverallSubmission.createdAt ?? null,
        timeSinceLastAttemptSeconds: timeSinceLastAttemptSeconds, // Using placeholder
      },
      taskHistorySummary: taskHistorySummary,
    };

    this.logger.log(`Learner model data fetched successfully for user ${userId}`);
    return learnerModel;
  }

  private async getOverallCodingPerformance(
    userId: number,
  ): Promise<{ totalSubmissions: number; overallAvgScore: number | null }> {
    const submissions = await this.prisma.codeSubmission.findMany({
      where: { userId: userId, score: { not: null } },
      select: { score: true },
    });
    const totalSubmissions = await this.prisma.codeSubmission.count({ where: { userId: userId } });

    if (submissions.length === 0) {
      return { totalSubmissions, overallAvgScore: null };
    }

    const sum = submissions.reduce((acc, sub) => acc + (sub.score ?? 0), 0);
    const avgScore = sum / submissions.length;
    return { totalSubmissions, overallAvgScore: parseFloat(avgScore.toFixed(2)) };
  }

  // Modified: Doesn't need currentSubmissionTimestamp if fetching all history for the tool
  private async getTaskHistory(
    userId: number,
    codingQuestionId: number,
  ): Promise<(CodeSubmission & { kiFeedback: KIFeedback[] })[]> {
    return this.prisma.codeSubmission.findMany({
      where: {
        userId: userId,
        codingQuestionId: codingQuestionId,
        // Removed timestamp filter to get all history for the tool context
      },
      include: {
        kiFeedback: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  private async generateTaskSummary(
    taskHistory: (CodeSubmission & { kiFeedback: KIFeedback[] })[],
  ): Promise<string | null> {
    if (taskHistory.length === 0) {
      return null;
    }

    this.logger.log(
      `Generating task summary for ${taskHistory.length} past attempts using Langchain`,
    );

    const formattedHistory = taskHistory
      .map((attempt, index) => {
        let errorSummary = attempt.compilerOutput ? `Compiler: ${attempt.compilerOutput}` : '';
        if (attempt.unitTestResults) {
          try {
            const tests =
              typeof attempt.unitTestResults === 'string'
                ? JSON.parse(attempt.unitTestResults)
                : attempt.unitTestResults;
            const resultsArray = Array.isArray(tests) ? tests : [];
            const failedTests = resultsArray
              .filter(t => t?.status === 'failed')
              .map(t => t?.name || 'Unnamed test');
            if (failedTests.length > 0) {
              errorSummary +=
                (errorSummary ? '; ' : '') + `Failed tests: ${failedTests.join(', ')}`;
            } else if (!errorSummary && resultsArray.length > 0) {
              errorSummary = 'Tests passed or no results.';
            } else if (!errorSummary) {
              errorSummary = 'No test results found.';
            }
          } catch (e) {
            this.logger.warn(
              `Could not parse test results for submission ${attempt.id}: ${e.message}`,
            );
            errorSummary += (errorSummary ? '; ' : '') + 'Could not parse test results.';
          }
        }
        if (!errorSummary) errorSummary = 'No explicit errors recorded.';
        const feedbackGiven =
          attempt.kiFeedback.map(f => f.flavor || 'unknown').join(', ') || 'None';
        const truncatedErrorSummary =
          errorSummary.length > 250 ? errorSummary.substring(0, 250) + '...' : errorSummary;

        // Corrected template literal for the return string
        return `Attempt ${index + 1} (${attempt.createdAt.toISOString()}):\n        Score: ${
          attempt.score ?? 'N/A'
        }\n        Errors/Output Summary: ${truncatedErrorSummary}\n        Feedback Given: ${feedbackGiven}`;
      })
      .join('\n\n');

    // Corrected template literal definition
    const template = `You are an assistant summarizing a student's history on a specific programming task.
Based on the following attempts (oldest first), provide a concise narrative summary (max 3-4 sentences) focusing on:
1. Number of prior attempts.
2. Error trajectory (types of errors, evolution/persistence).
3. Sequence of feedback types received.
4. Inferred responsiveness to feedback (did they seem to address the previous feedback?).

Do NOT include raw code or full error messages. Be factual and neutral.

History:
{history}

Concise Summary:`;

    const prompt = PromptTemplate.fromTemplate(template);
    const chain = prompt.pipe(this.chatModel).pipe(new StringOutputParser());

    try {
      const summary = await chain.invoke({ history: formattedHistory });
      this.logger.log(`Generated summary: ${summary}`); // Corrected template literal
      return summary.trim();
    } catch (error) {
      this.logger.error('Error generating task summary with Langchain:', error);
      return `(Error generating summary: ${error.message})`; // Corrected template literal
    }
  }

  // Stubbed method implementation - Ensure these are defined in the class
  private async getConceptPerformance(
    userId: number,
    conceptId: number,
  ): Promise<LearnerModelDto['performanceOnCurrentConcept']> {
    this.logger.log(`Fetching performance for concept ${conceptId} for user ${userId} (STUBBED)`); // Corrected template literal
    // Placeholder logic
    return {
      attempts: 0,
      avgScore: null,
      commonErrorTypes: [],
      lastFeedbackTypes: [],
    };
  }

  // Stubbed method implementation - Ensure these are defined in the class
  private async getPrerequisitePerformance(
    userId: number,
    conceptId: number,
  ): Promise<LearnerModelDto['performanceOnPrerequisites']> {
    this.logger.log(
      `Fetching prerequisite performance for concept ${conceptId} for user ${userId} (STUBBED)`,
    ); // Corrected template literal
    // Placeholder logic
    return [];
  }
} // End of LearnerModelToolService class
