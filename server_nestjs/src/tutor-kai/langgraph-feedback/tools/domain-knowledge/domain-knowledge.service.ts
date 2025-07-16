import { OnModuleInit } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TranscriptEmbedding } from '@prisma/client';
import { Prisma, PrismaClient } from '@prisma/client';
import { OpenAIEmbeddings } from '@langchain/openai';
// PrismaVectorStoreArgs might not be exported; remove explicit type later
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { Document } from '@langchain/core/documents';
import { CohereRerank } from '@langchain/cohere'; // Added Cohere Reranker
import { TranscriptChunk } from '@DTOs/index'; // Assuming DTO is accessible

@Injectable()
export class DomainKnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(DomainKnowledgeService.name);
  // Provide required generic arguments: Model, ModelName, SelectType, FilterType
  private vectorStore: PrismaVectorStore<TranscriptEmbedding, 'TranscriptEmbedding', any, any>;
  private cohereReranker: CohereRerank; // Added Cohere Reranker instance
  private readonly db: PrismaClient; // Direct PrismaClient instance

  constructor(private readonly configService: ConfigService) {
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
      this.vectorStore = PrismaVectorStore.withModel<TranscriptEmbedding>(this.db).create(
        embeddings,
        vectorStoreArgs,
      );

      this.logger.log('PrismaVectorStore initialized successfully.');
    } catch (error) {
      this.logger.error('Failed to initialize PrismaVectorStore:', error);
      // Handle initialization error appropriately
    }

    // Initialize Cohere Reranker
    try {
      const cohereApiKey = this.configService.get<string>('COHERE_API_KEY');
      if (!cohereApiKey) {
        this.logger.error('COHERE_API_KEY is not configured. Reranker will not function.');
        // Reranker will be undefined, searchLectureContent needs to handle this
      } else {
        this.cohereReranker = new CohereRerank({
          apiKey: cohereApiKey,
          model: 'rerank-v3.5',
          topN: 3, // Default topN for the instance, compressDocuments uses this
        });
        this.logger.log('CohereReranker (multilingual) initialized successfully.');
      }
    } catch (error) {
      this.logger.error('Failed to initialize CohereReranker:', error);
      // Handle initialization error appropriately
    }
  }

  /**
   * Searches the vector store for lecture content relevant to the query.
   * @param query The search query (e.g., a programming concept).
   * @param k The number of results to return (default: 3).
   * @returns An array of relevant transcript chunks.
   */
  async searchLectureContent(query: string, k = 20): Promise<TranscriptChunk[]> {
    if (!this.vectorStore) {
      this.logger.error('Vector store is not initialized.');
      // Consider throwing an error or returning an empty array
      return [];
    }

    this.logger.log(`Searching lecture content for query: "${query}" (k=${k})`);
    try {
      const initialResults: Document[] = await this.vectorStore.similaritySearch(query, k);
      this.logger.log(`Found ${initialResults.length} initial results from vector search.`);
      // Clean the content of initial results before logging and reranking
      const cleanedInitialResults = initialResults.map(doc => this.cleanDocumentContent(doc));

      let finalResults: Document[];

      // Rerank if the reranker is available
      // Rerank if the reranker is available
      if (this.cohereReranker) {
        // compressDocuments uses the topN defined in the constructor unless overridden
        // Pass cleaned results to the reranker
        const rerankedResults = await this.cohereReranker.compressDocuments(
          cleanedInitialResults,
          query,
        );

        // Filter results based on relevance score threshold
        const relevanceThreshold = 0.4;
        const filteredResults = rerankedResults.filter(doc => {
          const score = doc.metadata.relevanceScore;
          // Keep if score is missing or >= threshold
          return score === undefined || score >= relevanceThreshold;
        });
        finalResults = filteredResults; // Use the filtered results
      } else {
        this.logger.warn('Cohere Reranker not available. Returning results without reranking.');
        // Fallback: Use top 5 from the *cleaned* initial results if reranker failed
        finalResults = cleanedInitialResults.slice(0, 5);
        this.logger.log(
          `Returning top ${finalResults.length} results without reranking (no score filtering applied).`,
        );
      }

      // Transform the final set of documents
      const transcriptChunks = this.transformDocumentsToTranscriptChunks(finalResults);
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
  private transformDocumentsToTranscriptChunks(documents: Document[]): TranscriptChunk[] {
    // Note: Ensure the TranscriptChunk DTO in '@DTOs/index' is updated
    // to include `relevanceScore?: number;` in its metadata interface.
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
          // Extract relevance score if available from reranker metadata
          const relevanceScore = doc.metadata.relevanceScore;

          transcriptChunks.push({
            TranscriptChunkContent: pageContent.TranscriptChunkContent,
            metadata: {
              filename: pageContent.metadata.filename,
              timestamp: pageContent.metadata.timestamp,
              markdownLink: pageContent.metadata.markdownLink,
              uuid: pageContent.metadata.uuid,
              lectureName: pageContent.metadata.lectureName,
              relevanceScore: relevanceScore, // Add relevance score
            },
          });
        } else {
          this.logger.warn(
            `Skipping document with unexpected pageContent structure: ${doc.pageContent}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error parsing pageContent for document ID ${doc.metadata.id ?? 'unknown'}: ${
            doc.pageContent
          }`,
          error,
        );
      }
    }
    return transcriptChunks;
  }

  /**
   * Cleans the TranscriptChunkContent within a Document's pageContent JSON.
   * Removes patterns like '\r' and '\r 68'.
   * @param doc The original Document.
   * @returns A new Document with cleaned pageContent, or the original if cleaning fails.
   */
  private cleanDocumentContent(doc: Document): Document {
    try {
      const pageContentObj = JSON.parse(doc.pageContent);

      // Ensure the structure is as expected before cleaning
      if (typeof pageContentObj?.TranscriptChunkContent === 'string') {
        // Regex to remove '\r' optionally followed by spaces and digits
        const cleanedContent = pageContentObj.TranscriptChunkContent.replace(/\r\s*\d*/g, '');

        // Create a new object with the cleaned content
        const cleanedPageContentObj = {
          ...pageContentObj,
          TranscriptChunkContent: cleanedContent,
        };

        // Return a new Document with the cleaned content stringified
        return new Document({
          pageContent: JSON.stringify(cleanedPageContentObj),
          metadata: doc.metadata, // Preserve original metadata
        });
      } else {
        this.logger.warn(
          `Skipping cleaning for document with unexpected pageContent structure: ${doc.pageContent}`,
        );
        return doc; // Return original document if structure is wrong
      }
    } catch (error) {
      this.logger.error(
        `Error cleaning pageContent for document ID ${doc.metadata.id ?? 'unknown'}: ${
          doc.pageContent
        }`,
        error,
      );
      return doc; // Return original document on error
    }
  }
}
