/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable prettier/prettier */

import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import * as path from 'path';

const prisma = new PrismaClient({
  // Enable query logging in development
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

interface VideoFile {
  name: string;
  type: string;
}

// Cache for transcript files to avoid redundant reads
const transcriptCache = new Map<string, string>();

export async function seedTranscriptsToConceptNodes() {
  console.log('Starting transcript seeding process...');

  try {
    // Use a single transaction for the entire operation
    const result = await prisma.$transaction(async (tx) => {
      // Fetch all concept nodes with their relationships in a single query
      const conceptNodes = await tx.conceptNode.findMany({
        select: {
          id: true,
          name: true,
          transcript: true,
          requiredBy: {
            select: {
              contentNode: {
                select: {
                  ContentView: {
                    select: {
                      contentElement: {
                        select: {
                          file: {
                            select: {
                              name: true,
                              type: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          trainedBy: {
            select: {
              contentNode: {
                select: {
                  ContentView: {
                    select: {
                      contentElement: {
                        select: {
                          file: {
                            select: {
                              name: true,
                              type: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      console.log(`Processing ${conceptNodes.length} concept nodes...`);

      // Process all nodes concurrently
      const updates = await Promise.all(
        conceptNodes.map(node => processConceptNode(node, tx))
      );

      // Handle the special case for Schleifen/while-Schleife
      await handleSchleifenCopy(tx);

      return updates.filter(Boolean).length;
    }, {
      maxWait: 15000, // Maximum time to wait for transaction
      timeout: 30000, // Maximum time for the transaction to complete
    });

    console.log(`Successfully processed ${result} concept nodes`);
  } catch (error) {
    console.error('Error in seedTranscriptsToConceptNodes:', error);
    throw error;
  }
}

async function processConceptNode(conceptNode: any, tx: any) {
  const videoFiles = new Set<VideoFile>();

  // Extract all video files
  extractVideoFiles(conceptNode.requiredBy, videoFiles);
  extractVideoFiles(conceptNode.trainedBy, videoFiles);

  if (videoFiles.size === 0) {
    return null;
  }

  try {
    const transcripts = await Promise.all(
      Array.from(videoFiles).map(file => getTranscript(file))
    );

    const combinedTranscript = transcripts
      .filter(Boolean)
      .join('\n\n')
      .trim();

    if (combinedTranscript.length > 0) {
      // Update the node with the combined transcript
      await tx.conceptNode.update({
        where: { id: conceptNode.id },
        data: { transcript: combinedTranscript },
      });

      console.log(`Updated ConceptNode ${conceptNode.id} with ${combinedTranscript.length} chars`);
      return true;
    }
  } catch (error) {
    console.error(`Error processing ConceptNode ${conceptNode.id}:`, error);
  }

  return null;
}

function extractVideoFiles(relationships: any[], videoFiles: Set<VideoFile>) {
  for (const relation of relationships) {
    for (const contentView of relation.contentNode?.ContentView || []) {
      const file = contentView.contentElement?.file;
      if (file?.type === 'VIDEO') {
        videoFiles.add(file);
      }
    }
  }
}

async function getTranscript(videoFile: VideoFile): Promise<string> {
  const srtFileName = videoFile.name.replace('.mp4', '.srt');
  const transcriptsPath = path.resolve(__dirname, '..', '..', 'files', 'AUD', 'Transkripte');
  const filePath = path.join(transcriptsPath, srtFileName);

  // Check cache first
  if (transcriptCache.has(filePath)) {
    return transcriptCache.get(filePath)!;
  }

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const transcriptText = parseTranscript(fileContent);

    if (transcriptText.length > 0) {
      transcriptCache.set(filePath, transcriptText);
      console.log(`Cached transcript for ${srtFileName} (${transcriptText.length} chars)`);
    }

    return transcriptText;
  } catch (error) {
    console.log(`Failed to read SRT file: ${filePath}`);
    return '';
  }
}

function parseTranscript(content: string): string {
  // Optimized regex for SRT parsing
  const pattern = /\d+\r?\n\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}\r?\n(.*?)(?=\r?\n\r?\n\d+|$)/gs;
  const textParts: string[] = [];

  for (const match of content.matchAll(pattern)) {
    const text = match[1].replace(/\r?\n/g, ' ').trim();
    if (text) {
      textParts.push(text);
    }
  }

  return textParts.join(' ');
}

async function handleSchleifenCopy(tx: any) {
  console.log('Processing Schleifen to while-Schleife copy...');

  try {
    // Fetch both nodes in a single query
    const [schleifenNode, whileSchleifeNode] = await Promise.all([
      tx.conceptNode.findFirst({
        where: { name: 'Schleifen' },
        select: { transcript: true },
      }),
      tx.conceptNode.findFirst({
        where: { name: 'while-Schleife' },
        select: { id: true, transcript: true },
      }),
    ]);

    if (!schleifenNode?.transcript || !whileSchleifeNode) {
      console.log('Required nodes or transcript not found for Schleifen copy');
      return;
    }

    if (whileSchleifeNode.transcript?.trim()) {
      console.log('while-Schleife already has content, skipping copy');
      return;
    }

    await tx.conceptNode.update({
      where: { id: whileSchleifeNode.id },
      data: { transcript: schleifenNode.transcript },
    });

    console.log('Successfully copied Schleifen transcript to while-Schleife');
  } catch (error) {
    console.error('Error in handleSchleifenCopy:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  // Configure Prisma for better performance
  prisma.$use(async (params, next) => {
    const startTime = Date.now();
    const result = await next(params);
    const endTime = Date.now();

    if (process.env.NODE_ENV === 'development') {
      console.log(`Query ${params.model}.${params.action} took ${endTime - startTime}ms`);
    }

    return result;
  });

  seedTranscriptsToConceptNodes()
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
}
