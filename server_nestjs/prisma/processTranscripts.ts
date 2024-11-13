/* eslint-disable prettier/prettier */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// after running the script we need to copy the content of the "Schleifen" ConceptNode "transcript" column into "while-Schleife" as its the only row without content in this column (although we do have transcripts belonging to "while-Schleife" topic)
async function seedTranscriptsToConceptNodes() {
  console.log('Starting to seed transcripts into ConceptNode table...');
  // Add debug logging for current directory
  console.log('Current directory:', __dirname);

  const conceptNodes = await prisma.conceptNode.findMany({
    include: {
      requiredBy: {
        include: {
          contentNode: {
            include: {
              ContentView: {
                include: {
                  contentElement: {
                    include: {
                      file: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      trainedBy: {
        include: {
          contentNode: {
            include: {
              ContentView: {
                include: {
                  contentElement: {
                    include: {
                      file: true,
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

  console.log(`Found ${conceptNodes.length} concept nodes`);

  for (const conceptNode of conceptNodes) {
    let allVideos = new Set();

    // Process Requirements
    for (const requirement of conceptNode.requiredBy) {
      for (const contentView of requirement.contentNode?.ContentView || []) {
        if (contentView.contentElement?.file?.type === 'VIDEO') {
          allVideos.add(contentView.contentElement.file);
        }
      }
    }

    // Process Trainings
    for (const training of conceptNode.trainedBy) {
      for (const contentView of training.contentNode?.ContentView || []) {
        if (contentView.contentElement?.file?.type === 'VIDEO') {
          allVideos.add(contentView.contentElement.file);
        }
      }
    }

    console.log(`ConceptNode ${conceptNode.id} has ${allVideos.size} video files`);

    // Process and concatenate transcripts
    let combinedTranscript = '';

    for (const videoFile of allVideos) {
      const srtFileName = (videoFile as any).name.replace('.mp4', '.srt');
      const filePath = path.resolve(
        __dirname,
        '..', // Move up from 'prisma' to 'server_nestjs'
        '..', // Move up from 'server_nestjs' to 'hefl'
        'files',
        'AUD',
        'Transkripte',
        srtFileName,
      );

      console.log(`Looking for SRT file at: ${filePath}`);

      try {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const transcriptText = extractTextFromSrt(fileContent);

          if (transcriptText.length > 0) {
            combinedTranscript += `${transcriptText}\n\n`;
            console.log(`Added transcript from ${srtFileName} (${transcriptText.length} chars)`);
          }
        } else {
          console.log(`SRT file not found: ${filePath}`);
        }
      } catch (error) {
        console.error(`Error processing ${srtFileName}:`, error);
      }
    }

    if (combinedTranscript.length > 0) {
      try {
        await prisma.conceptNode.update({
          where: { id: conceptNode.id },
          data: { transcript: combinedTranscript.trim() },
        });
        console.log(`Updated ConceptNode ${conceptNode.id} with ${combinedTranscript.length} chars of transcript`);
      } catch (error) {
        console.error(`Error updating ConceptNode ${conceptNode.id}:`, error);
      }
    } else {
      console.log(`No transcript content for ConceptNode ${conceptNode.id}`);
    }
  }
}

function extractTextFromSrt(fileContent: string): string {
  const pattern = /\d+\s+\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}\s+(.*?)(?=\n\d+|$)/gs;
  let transcript = '';
  let matches;

  while ((matches = pattern.exec(fileContent)) !== null) {
    const text = matches[1].replace(/\n/g, ' ').trim();
    if (text.length > 0) {
      transcript += text + ' ';
    }
  }

  return transcript.trim();
}

// Main execution
if (require.main === module) {
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
