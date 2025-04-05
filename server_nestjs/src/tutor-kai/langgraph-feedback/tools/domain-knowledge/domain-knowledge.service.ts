import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient, TranscriptEmbedding } from '@prisma/client';
import { OpenAIEmbeddings } from '@langchain/openai';
// PrismaVectorStoreArgs might not be exported; remove explicit type later
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { Document } from '@langchain/core/documents';
import { TranscriptChunk } from '@DTOs/index'; // Assuming DTO is accessible

@Injectable()
export class DomainKnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(DomainKnowledgeService.name);
  // Provide required generic arguments: Model, ModelName, SelectType, FilterType
  private vectorStore: PrismaVectorStore<
    TranscriptEmbedding,
    'TranscriptEmbedding',
    any, // Prisma.TranscriptEmbeddingSelect - Use 'any' for now
    any // Prisma.TranscriptEmbeddingWhereInput - Use 'any' for now
  >;
  private db: PrismaClient; // Direct PrismaClient instance

  // TODO: Inject PrismaService instead of creating a new PrismaClient instance
  // constructor(private prisma: PrismaService, private configService: ConfigService) {}
  constructor(private configService: ConfigService) {
    // Temporary direct instantiation - replace with proper injection
    this.db = new PrismaClient();
  }

  async onModuleInit() {
    this.logger.log('Initializing Domain Knowledge Service...');
    const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!openAIApiKey) {
      // Log error but don't throw, allow service to exist but fail on use
      this.logger.error('OPENAI_API_KEY is not configured. Vector store will not function.');
      return;
    }

    try {
      const embeddings = new OpenAIEmbeddings({ apiKey: openAIApiKey });

      // Remove explicit PrismaVectorStoreArgs type annotation and explicit columns
      // Let the .create method infer columns based on tableName and vectorColumnName
      const vectorStoreArgs = {
        prisma: Prisma, // The Prisma namespace from @prisma/client
        tableName: 'TranscriptEmbedding' as const,
        vectorColumnName: 'vector',
        // Use symbols with 'as any' cast due to stricter typing in newer library versions
        columns: {
          id: PrismaVectorStore.IdColumn as any,
          content: PrismaVectorStore.ContentColumn as any,
        },
        db: this.db, // Pass the PrismaClient instance
        filter: undefined, // Add filter if needed, e.g., by lecture ID
      };

      // Simplify generic for withModel - it primarily needs the model type
      this.vectorStore = PrismaVectorStore.withModel<TranscriptEmbedding>(
        this.db,
      ).create(embeddings, vectorStoreArgs);

      this.logger.log('PrismaVectorStore initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize PrismaVectorStore:', error);
      // Handle initialization error appropriately
    }
  }

  /**
   * Searches the vector store for lecture content relevant to the query.
   * @param query The search query (e.g., a programming concept).
   * @param k The number of results to return (default: 3).
   * @returns An array of relevant transcript chunks.
   */
  async searchLectureContent(
    query: string,
    k = 10,
  ): Promise<TranscriptChunk[]> {
    if (!this.vectorStore) {
      this.logger.error('Vector store is not initialized.');
      // Consider throwing an error or returning an empty array
      return [];
    }

    this.logger.log(`Searching lecture content for query: "${query}" (k=${k})`);
    try {
      const results: Document[] = await this.vectorStore.similaritySearch(query, k);
      this.logger.log(`Found ${results.length} potential results.`);
      // The content column in TranscriptEmbedding likely stores the JSON string
      // from the original feedback_rag.service.ts logic. We need to parse it.
      const transcriptChunks = this.transformDocumentsToTranscriptChunks(results);
      return transcriptChunks;
    } catch (error) {
      this.logger.error(`Error during similarity search for query "${query}":`, error);
      return []; // Return empty on error
    }
  }

  /**
   * Transforms raw Documents from similarity search into TranscriptChunk objects.
   * Assumes the document's pageContent is a JSON stringified TranscriptChunk structure.
   * Adapted from feedback_rag.service.ts.
   */
  private transformDocumentsToTranscriptChunks(
    documents: Document[],
  ): TranscriptChunk[] {
    const transcriptChunks: TranscriptChunk[] = [];
    for (const doc of documents) {
      try {
        // The 'content' column mapped in vectorStoreArgs holds the stringified JSON
        const pageContent = JSON.parse(doc.pageContent);

        // Validate structure (basic check)
        if (
          typeof pageContent === 'object' &&
          pageContent !== null &&
          typeof pageContent.TranscriptChunkContent === 'string' &&
          typeof pageContent.metadata === 'object' &&
          pageContent.metadata !== null
        ) {
          transcriptChunks.push({
            TranscriptChunkContent: pageContent.TranscriptChunkContent,
            metadata: {
              filename: pageContent.metadata.filename,
              timestamp: pageContent.metadata.timestamp,
              markdownLink: pageContent.metadata.markdownLink,
              uuid: pageContent.metadata.uuid,
              lectureName: pageContent.metadata.lectureName,
            },
          });
        } else {
          this.logger.warn(
            `Skipping document with unexpected pageContent structure: ${doc.pageContent}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error parsing pageContent for document ID ${doc.metadata?.id ?? 'unknown'}: ${doc.pageContent}`,
          error,
        );
      }
    }
    return transcriptChunks;
  }
}
