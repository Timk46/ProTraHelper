import { Inject, Injectable } from '@nestjs/common';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PGVectorStore } from 'langchain/vectorstores/pgvector';
import { PoolConfig } from 'pg';

const pg_config_lectureTranscripts = {
  // we use the pg_vector plugin for postgres so we can connect all data later in
  postgresConnectionOptions: {
    type: 'postgres',
    host: 'vectordb.bshefl0.bs.informatik.uni-siegen.de', // only accessable from vpn
    port: 3306,
    user: 'root',
    password: 'qzx5vQG9WQ2b35eZUWujPUhVb8xRr', // ToDo: Move to .env
    database: 'vectordb',
  } as PoolConfig,
  tableName: 'langchain_pg_embedding', // all embeddings are stored in this table. Lectures are seperated by collections. Filter by collection ist not used here so we get embeddings from all.
  columns: { // the metadata columns which will be returned with the search result
    idColumnName: 'uuid',
    vectorColumnName: 'embedding',
    contentColumnName: 'document',
    metadataColumnName: 'cmetadata',
  },
};

// Notes:
// Currently this is only providing similarity search on lecture transcripts and the pgvectorstore.
// To develop a full RAG system we need to connect this with the llmBasicPrompt.service.ts like here: https://js.langchain.com/docs/expression_language/cookbook/retrieval

@Injectable()
export class RagService {
  constructor() {}
  /**
   * Performs a similarity search on lecture transcripts in a PGVectorStore based on a given question.
   * @param question - The question to search for similarities.
   * @param k - The number of similar results to retrieve.
   * @returns A Promise that resolves to an array of similarity search results.
   */
  public async lectureSimilaritySearch(question: string, k: number): Promise<any> {
    const pgvectorStore = await PGVectorStore.initialize(
      new OpenAIEmbeddings(),
      pg_config_lectureTranscripts,
    );
    const similaritySearchResult = await pgvectorStore.similaritySearch(
      question,
      k,
    );
    return similaritySearchResult; // {pagecontent: Ausschnitt aus dem Transcript - sting, metadata: {source: STARTSOURCE Markdown-Footnote-Link zum Video ENDSOURCE - string, filname: string, timestamp, uuid }
  }

  /**
   * Retrieves the PGVectorStore (access embeddings in postgres with pg vector plugin).
   * @returns A promise that resolves to a PGVectorStore instance.
   */
  public async getPGVectorStore() : Promise<PGVectorStore> {
    const pgvectorStore = await PGVectorStore.initialize(
      new OpenAIEmbeddings(),
      pg_config_lectureTranscripts,
    );
    return pgvectorStore;
  }
}
