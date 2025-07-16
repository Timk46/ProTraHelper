import { Inject, Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { TranscriptChunk } from '@DTOs/index';
import { TranscriptEmbedding } from '@prisma/client';
import { Prisma, PrismaClient } from '@prisma/client';
// Notes:
// Currently this is only providing similarity search on lecture transcripts and the pgvectorstore.
// To develop a full RAG system we need to connect this with the llmBasicPrompt.service.ts like here: https://js.langchain.com/docs/expression_language/cookbook/retrieval

const db = new PrismaClient();
const vectorStore = PrismaVectorStore.withModel<TranscriptEmbedding>(db).create(
  new OpenAIEmbeddings(),
  {
    prisma: Prisma,
    tableName: 'TranscriptEmbedding',
    vectorColumnName: 'vector',
    columns: {
      id: PrismaVectorStore.IdColumn,
      content: PrismaVectorStore.ContentColumn,
    },
  },
);
@Injectable()
export class RagService {
  constructor() {}

  /**
   * Performs a similarity search on lecture transcripts in a PGVectorStore based on a given question.
   * @param question - The question to search for similarities.
   * @param k - The number of similar results to retrieve.
   * @returns A Promise that resolves to an array of similarity search results.
   */
  public async lectureSimilaritySearch(question: string, k: number): Promise<TranscriptChunk[]> {
    const tempSimilaritySearchResult = await vectorStore.similaritySearch(question, k);

    const similaritySearchResult = this.transformToTranscriptChunks(
      JSON.stringify(tempSimilaritySearchResult),
    );
    return similaritySearchResult; // @Jappaha TODO: Check if this is the right way to return the results. Its a new format now (TranscriptChunk[]).
  }

  // Da der Prisma Vectorstore für pgVector keine Metadaten abfragen kann, sind diese alle als JSON-String als Text im Content und werden hier wieder zurückgeparsed.
  private transformToTranscriptChunks(jsonString: string): TranscriptChunk[] {
    try {
      // Zunächst den String in ein JSON-Objekt umwandeln
      const parsedData = JSON.parse(jsonString);

      // Überprüfen, ob das geparste Objekt ein Array ist
      if (!Array.isArray(parsedData)) {
        throw new Error('Parsed data is not an array');
      }

      // Das Array von Objekten in das gewünschte Format mappen
      const transcriptChunks: TranscriptChunk[] = parsedData.map(item => {
        // Sicherstellen, dass pageContent existiert und ein JSON-String ist
        if (typeof item.pageContent !== 'string') {
          throw new Error('pageContent is missing or not a string');
        }

        // pageContent von String zu JSON umwandeln
        const pageContent = JSON.parse(item.pageContent);

        // Die Struktur validieren und anpassen
        if (
          typeof pageContent !== 'object' ||
          typeof pageContent.TranscriptChunkContent !== 'string' ||
          typeof pageContent.metadata !== 'object'
        ) {
          throw new Error('Invalid pageContent structure');
        }

        // Rückgabe des neu strukturierten Objekts
        return {
          TranscriptChunkContent: pageContent.TranscriptChunkContent,
          metadata: {
            filename: pageContent.metadata.filename,
            timestamp: pageContent.metadata.timestamp,
            markdownLink: pageContent.metadata.markdownLink,
            uuid: pageContent.metadata.uuid,
            lectureName: pageContent.metadata.lectureName,
          },
        };
      });

      return transcriptChunks;
    } catch (error) {
      console.error('Error mapping to TranscriptChunk array:', error);
      return [];
    }
  }
}
