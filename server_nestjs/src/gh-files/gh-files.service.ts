import { Injectable, Logger } from '@nestjs/common';
import { readdir } from 'fs/promises';
import { join } from 'path';
import { ConfigService } from '@nestjs/config'; // For potential future configuration

// Interface to describe a Grasshopper file entry
export interface GrasshopperFileInfo {
  id: string; // Usually the filename
  name: string; // Filename or a more descriptive name
  path: string; // Absolute path on the server, crucial for Rhino to open
}

@Injectable()
export class GhFilesService {
  private readonly logger = new Logger(GhFilesService.name);
  private readonly ghFilesDir: string;

  constructor(private readonly configService: ConfigService) {
    // Determine the directory for .gh files.
    // This could be made configurable via environment variables or a config file.
    // Updated to use the files/Grasshopper directory as requested
    // process.cwd() for NestJS app is c:/Dev/hefl/server_nestjs
    // We need to go up one level to c:/Dev/hefl and then into files/Grasshopper
    this.ghFilesDir = join(process.cwd(), '..', 'files', 'Grasshopper');
    this.logger.log(`Grasshopper files directory set to: ${this.ghFilesDir}`);
  }

  /**
   * Retrieves a list of Grasshopper files (.gh) from the configured directory.
   * @returns A promise that resolves to an array of GrasshopperFileInfo.
   */
  async getGrasshopperFiles(): Promise<GrasshopperFileInfo[]> {
    try {
      const entries = await readdir(this.ghFilesDir, { withFileTypes: true });
      this.logger.log(`Found ${entries.length} entries in directory ${this.ghFilesDir}`);
      entries.forEach(entry => this.logger.log(`Entry: ${entry.name}, isFile: ${entry.isFile()}`));

      const files: GrasshopperFileInfo[] = entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.gh'))
        .map(fileEntry => {
          const filePath = join(this.ghFilesDir, fileEntry.name);
          return {
            id: fileEntry.name,
            name: fileEntry.name,
            path: filePath, // This path MUST be accessible by the Rhino instance on the user's machine if opening local server files.
            // If files are served via HTTP for Rhino to download, this would be a URL.
            // Based on the initial request, it seems we're aiming for local paths.
          };
        });
      this.logger.log(`Found ${files.length} Grasshopper files.`);
      return files;
    } catch (error) {
      this.logger.error(`Error reading Grasshopper files directory (${this.ghFilesDir}):`, error);
      // Depending on requirements, you might want to throw the error or return an empty array.
      // Returning an empty array might be more graceful for the frontend.
      return [];
    }
  }
}
