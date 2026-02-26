const { createMockLogger } = require('../helpers/mock-logger');

// We need to test MacOSSetup with mocked process.platform and fs
let MacOSSetup;

describe('MacOSSetup', () => {
  let logger;

  beforeEach(() => {
    logger = createMockLogger();
    // Fresh import each time
    jest.resetModules();
    MacOSSetup = require('../../src/platform/macos-setup');
  });

  describe('getAppBundlePath()', () => {
    test('returns null on win32', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const setup = new MacOSSetup(logger);
      expect(setup.getAppBundlePath()).toBeNull();

      Object.defineProperty(process, 'platform', originalPlatform);
    });

    test('extracts .app path on darwin', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      const originalExecPath = process.execPath;

      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.execPath = '/Applications/ProTra Helfer.app/Contents/MacOS/ProTra Helfer';

      const setup = new MacOSSetup(logger);
      expect(setup.getAppBundlePath()).toBe('/Applications/ProTra Helfer.app');

      Object.defineProperty(process, 'platform', originalPlatform);
      process.execPath = originalExecPath;
    });

    test('returns null in dev mode (no .app in path)', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      const originalExecPath = process.execPath;

      Object.defineProperty(process, 'platform', { value: 'darwin' });
      process.execPath = '/usr/local/bin/electron';

      const setup = new MacOSSetup(logger);
      expect(setup.getAppBundlePath()).toBeNull();

      Object.defineProperty(process, 'platform', originalPlatform);
      process.execPath = originalExecPath;
    });
  });

  describe('ensureLaunchAgent()', () => {
    test('skips on win32', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'win32' });

      const setup = new MacOSSetup(logger);
      // Should not throw and should not write any files
      setup.ensureLaunchAgent('/Applications/ProTra Helfer.app');

      // No fs operations should have occurred - logger not called for LaunchAgent
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', originalPlatform);
    });

    test('warns when app is not in /Applications/', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      const setup = new MacOSSetup(logger);
      setup.ensureLaunchAgent('/Users/test/Downloads/ProTra Helfer.app');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('nicht in /Applications')
      );

      Object.defineProperty(process, 'platform', originalPlatform);
    });

    test('generates correct plist content on darwin with /Applications/ path', () => {
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'darwin' });

      // Mock fs to capture the plist content
      const fs = require('node:fs');
      const originalExistsSync = fs.existsSync;
      const originalMkdirSync = fs.mkdirSync;
      const originalWriteFileSync = fs.writeFileSync;
      const originalReadFileSync = fs.readFileSync;

      let writtenContent = null;
      let writtenPath = null;

      fs.existsSync = jest.fn().mockImplementation((p) => {
        // LaunchAgents dir exists, plist does not
        if (p.includes('LaunchAgents') && !p.endsWith('.plist')) return true;
        return false;
      });
      fs.mkdirSync = jest.fn();
      fs.writeFileSync = jest.fn().mockImplementation((p, content) => {
        writtenPath = p;
        writtenContent = content;
      });

      // Mock child_process.execSync for launchctl
      const childProcess = require('node:child_process');
      const originalExecSync = childProcess.execSync;
      childProcess.execSync = jest.fn();

      const setup = new MacOSSetup(logger);
      setup.ensureLaunchAgent('/Applications/ProTra Helfer.app');

      expect(writtenContent).toContain('com.hefl.protra.helperapp');
      expect(writtenContent).toContain('/Applications/ProTra Helfer.app');
      expect(writtenContent).toContain('<key>RunAtLoad</key>');
      expect(writtenContent).toContain('<true/>');
      expect(writtenPath).toContain('com.hefl.protra.helperapp.plist');

      // Restore
      fs.existsSync = originalExistsSync;
      fs.mkdirSync = originalMkdirSync;
      fs.writeFileSync = originalWriteFileSync;
      fs.readFileSync = originalReadFileSync;
      childProcess.execSync = originalExecSync;
      Object.defineProperty(process, 'platform', originalPlatform);
    });
  });
});
