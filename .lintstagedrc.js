/**
 * lint-staged configuration
 *
 * This configuration ensures ESLint and Prettier run in the correct
 * subdirectories (client_angular and server_nestjs) with proper
 * working directories and relative file paths.
 *
 * Windows Compatibility:
 * - Converts Windows backslashes (\) to forward slashes (/)
 * - Uses bash shell explicitly to ensure `cd &&` commands work on Windows
 *   (lint-staged default spawns CMD which doesn't support `cd &&`)
 */

const path = require('path');

/**
 * Convert Windows-style backslashes to Unix-style forward slashes
 * This prevents "path not found" errors on Windows when paths contain backslashes
 * @param {string} filePath - File path to normalize
 * @returns {string} Path with forward slashes
 */
const toUnixPath = (filePath) => filePath.replace(/\\/g, '/');

/**
 * Create shell command that explicitly uses bash
 * @param {string} command - Command to execute
 * @returns {string} Bash-wrapped command
 */
const bashCommand = (command) => `bash -c "${command.replace(/"/g, '\\"')}"`;


module.exports = {
  // Backend (NestJS) TypeScript files
  'server_nestjs/src/**/*.ts': (filenames) => {
    // Convert absolute paths to relative paths within server_nestjs/
    // and normalize to Unix-style forward slashes for cross-platform compatibility
    const relativeFiles = filenames
      .map((filename) => path.relative(path.join(process.cwd(), 'server_nestjs'), filename))
      .map(toUnixPath)
      .join(' ');

    return [
      bashCommand(`cd server_nestjs && npx eslint --fix ${relativeFiles}`),
      bashCommand(`cd server_nestjs && npx prettier --write ${relativeFiles}`),
    ];
  },

  // Frontend (Angular) TypeScript files
  'client_angular/src/**/*.ts': (filenames) => {
    // Convert absolute paths to relative paths within client_angular/
    // and normalize to Unix-style forward slashes for cross-platform compatibility
    const relativeFiles = filenames
      .map((filename) => path.relative(path.join(process.cwd(), 'client_angular'), filename))
      .map(toUnixPath)
      .join(' ');

    return [
      bashCommand(`cd client_angular && npx eslint --fix ${relativeFiles}`),
      bashCommand(`cd client_angular && npx prettier --write ${relativeFiles}`),
    ];
  },
};
