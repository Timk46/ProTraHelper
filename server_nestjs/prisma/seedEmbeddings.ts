import { FileDto } from '@DTOs/index';
// https://js.langchain.com/docs/integrations/vectorstores/prisma

// danger !
//Table names and column names (in fields such as tableName, vectorColumnName, columns and filter) are passed into SQL queries directly without parametrisation. These fields must be sanitized beforehand to avoid SQL injection.

// CREATE EXTENSION IF NOT EXISTS vector; Need to be added to migration file!

import { PrismaVectorStore } from '@langchain/community/vectorstores/prisma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PrismaClient, Prisma, TranscriptEmbedding } from '@prisma/client';
import { File } from '@prisma/client';
import { TranscriptChunk } from '@DTOs/index';

import * as fs from 'fs';
import * as uuid from 'uuid';
const path = require('path');

// Initialize Prisma client with connection pool settings
const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL + '?connection_limit=40&pool_timeout=60',
    },
  },
});

/**
 * Seeds the database with embeddings.
 * @param lectureName - The name of the lecture to seed. Must be the name of a directory in the transcripts folder.
 * @returns {Promise<void>} A promise that resolves when the seeding is complete.
 */
export const seedAllEmbeddingsForVideo = async (file: File, lectureName: string) => {
  if (file.type !== 'VIDEO') {
    return;
  }

  const vectorStore = PrismaVectorStore.withModel<TranscriptEmbedding>(db).create(
    new OpenAIEmbeddings(),
    {
      prisma: Prisma,
      tableName: 'TranscriptEmbedding',
      vectorColumnName: 'vector',
      columns: {
        id: PrismaVectorStore.IdColumn,
        content: PrismaVectorStore.ContentColumn
      },
    },
  );

  const filePath = '../../files/'+lectureName+'/Transkripte/' + file.name.split(".mp4")[0] + '.srt'; // srt file names are the same as the video file names
  const absolutePath = path.resolve(__dirname, filePath);
  if (!fs.existsSync(absolutePath)) {
    console.log(`There is no matching SRT Transcript for File ${file.name}.\n I have searched for it here: ${absolutePath}`);
    return;
  }
  const chunkSize = 512;
  const chunkOverlap = 64;

  // Generate new transcript chunks
  let transcriptChunks = generateTranscriptChunks(chunkSize, chunkOverlap, absolutePath, lectureName, file.name);

  // Add the new transcripts to the vector store in smaller batches
  const batchSize = 100;
  for (let i = 0; i < transcriptChunks.length; i += batchSize) {
    const batch = transcriptChunks.slice(i, i + batchSize);
    await vectorStore.addModels(
      await db.$transaction(
        batch.map((transcriptChunk: TranscriptChunk) => db.transcriptEmbedding.create({
          data: { content: JSON.stringify(transcriptChunk), fileId: file.id }
        }))
      )
    );
    console.log(`Processed batch ${i / batchSize + 1} of ${Math.ceil(transcriptChunks.length / batchSize)}`);
  }
}

/**
 * Generates transcript chunks from a specified directory.
 *
 * @param chunkSize - The size of each chunk.
 * @param chunkOverlap - The overlap between chunks.
 * @param filePath - The path to the SRT File.
 *
 * @returns {TranscriptChunk[]} An array of transcript chunks.
 */
function generateTranscriptChunks(chunkSize: number, chunkOverlap: number, filePath: string, lectureName: string, fileName:string): TranscriptChunk[] {
  const transcriptChunks: TranscriptChunk[] = [];

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const subs = parseSrtFile(fileContent);

  transcriptChunks.push(...genSplitOverlap(subs, chunkSize, chunkOverlap, fileName, lectureName));
  console.log(`Generated transcript chunks for ${filePath}.`);

  return transcriptChunks;
}

/**
 * Parses an SRT file into an array of timestamps and text.
 *
 * @param fileContent - The content of the SRT file.
 *
 * @returns {{ timestamp: string, text: string }[]} An array of objects, each containing a timestamp and the corresponding text.
 */
function parseSrtFile(fileContent: string): { timestamp: string, text: string }[] {
  const pattern = /(\d{2}:\d{2}:\d{2},\d{3}) --> \d{2}:\d{2}:\d{2},\d{3}\s+([\s\S]*?)(?=\d{2}:\d{2}:\d{2},\d{3}|$)/g;
  let matches;
  const results = [];

  while ((matches = pattern.exec(fileContent)) !== null) {
    results.push({
      timestamp: matches[1],
      text: matches[2].replace(/\n/g, ' ').trim() + " "
    });
  }
  return results;
}

/**
 * Generates transcript chunks with overlap.
 *
 * @param subs - The array of timestamps and text.
 * @param chunkSize - The size of each chunk.
 * @param overlap - The overlap between chunks.
 * @param fileName - The source file.
 *
 * @returns {TranscriptChunk[]} An array of transcript chunks.
 */
function genSplitOverlap(subs: { timestamp: string, text: string }[], chunkSize: number, overlap: number, fileName: string, lectureName: string): TranscriptChunk[] {
  const documents: TranscriptChunk[] = [];

  let chars: { text: string, timestamp: string }[] = []; // Change the structure to store text and timestamps

  // Convert the subs into a flat sequence, where each char retains its timestamp
  subs.forEach(sub => {
    sub.text.split('').forEach(char => {
      chars.push({ text: char, timestamp: sub.timestamp });
    });
  });
  const maxAvailableLength = chars.length;

  if (chunkSize < 1 || overlap < 0) {
    throw new Error('size must be >= 1 and overlap >= 0');
  }

  let totalLen = 0;
  let firstSubTimestamp = '';

  for (let i = 0; i < chars.length - overlap; i += chunkSize - overlap) {
    let chunkStartIndex = totalLen;
    let chunkEndIndex = chunkStartIndex + chunkSize;

    for (const sub of subs) {
      totalLen += sub.text.length;

      if (totalLen >= chunkEndIndex) {
        break;
      }
    }

    let chunk = ""
    let chunkTimestamp = ""
    // Only take chunkEndIndex if its smaller than maxAvailableLength
    let tempMax = chunkEndIndex > maxAvailableLength ? maxAvailableLength : chunkEndIndex;

    for (let j = chunkStartIndex; j < tempMax; j++) {
      if (j == chunkStartIndex) {
        chunkTimestamp = chars[j].timestamp;
      }
      chunk += chars[j].text;
    }

    const page: TranscriptChunk = {
      TranscriptChunkContent: chunk,
      metadata: {
        markdownLink: `^[[${fileName.slice(0, -4)} bei ${chunkTimestamp}](/video?fileName=${fileName.slice(0, -4)}&timeStamp=${chunkTimestamp})]`,
        filename: fileName,
        timestamp: chunkTimestamp,
        uuid: uuid.v5(fileName + firstSubTimestamp, uuid.v5.URL),
        lectureName: lectureName
      },
    };
    if (page.TranscriptChunkContent.length > 1) { // fix empty chunks at the end of a transcript
      documents.push(page);
    }
    firstSubTimestamp = '';
  }
  return documents;
}
