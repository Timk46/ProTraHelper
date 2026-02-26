const {
  RhinoCommandConfig,
  COMMAND_TEMPLATES,
  FILE_COMMAND_MAPPING,
  RHINO_CONFIG,
} = require('../../src/rhino-automator/rhino-command-config');

describe('RhinoCommandConfig', () => {
  describe('getCommandForFile()', () => {
    test('returns exact match command for known file', () => {
      const command = RhinoCommandConfig.getCommandForFile('C:\\files\\example.gh');
      expect(command).toBe(COMMAND_TEMPLATES['com_registry_sequence']);
    });

    test('returns exact match for example_viewport.gh', () => {
      const command = RhinoCommandConfig.getCommandForFile('/Users/test/example_viewport.gh');
      expect(command).toBe(COMMAND_TEMPLATES['com_viewport']);
    });

    test('matches pattern-based entries (presentation_*)', () => {
      const command = RhinoCommandConfig.getCommandForFile('C:\\data\\presentation_slides.gh');
      expect(command).toBe(COMMAND_TEMPLATES['python_presentation']);
    });

    test('matches pattern-based entries (*render*)', () => {
      const command = RhinoCommandConfig.getCommandForFile('/Users/test/my_render_scene.gh');
      expect(command).toBe(COMMAND_TEMPLATES['python_presentation']);
    });

    test('falls back to wildcard (*) for unknown files', () => {
      const command = RhinoCommandConfig.getCommandForFile('C:\\data\\unknown_file.gh');
      expect(command).toBe(COMMAND_TEMPLATES['com_basic']);
    });

    test('handles Windows paths correctly', () => {
      const command = RhinoCommandConfig.getCommandForFile('C:\\Users\\student\\Documents\\example.gh');
      expect(command).toBe(COMMAND_TEMPLATES['com_registry_sequence']);
    });

    test('handles Unix paths correctly', () => {
      const command = RhinoCommandConfig.getCommandForFile('/home/student/documents/example.gh');
      expect(command).toBe(COMMAND_TEMPLATES['com_registry_sequence']);
    });

    test('resolves CLI templates with {filePath} placeholder', () => {
      const command = RhinoCommandConfig.getCommandForFile('C:\\data\\tutorial.gh');
      expect(command).toContain('C:\\data\\tutorial.gh');
      expect(command).not.toContain('{filePath}');
    });
  });

  describe('_matchesPattern()', () => {
    test('wildcard * matches everything', () => {
      expect(RhinoCommandConfig._matchesPattern('anything.gh', '*')).toBe(true);
    });

    test('exact name matches', () => {
      expect(RhinoCommandConfig._matchesPattern('example.gh', 'example.gh')).toBe(true);
    });

    test('prefix pattern matches', () => {
      expect(RhinoCommandConfig._matchesPattern('presentation_final.gh', 'presentation_*')).toBe(true);
    });

    test('middle wildcard pattern matches', () => {
      expect(RhinoCommandConfig._matchesPattern('my_render_v2.gh', '*render*')).toBe(true);
    });

    test('case insensitive matching', () => {
      expect(RhinoCommandConfig._matchesPattern('Example.GH', 'example.gh')).toBe(true);
    });

    test('non-matching pattern returns false', () => {
      expect(RhinoCommandConfig._matchesPattern('other.gh', 'example.gh')).toBe(false);
    });
  });

  describe('validateCommand()', () => {
    test('rejects dangerous commands (cmd)', () => {
      expect(RhinoCommandConfig.validateCommand('cmd /c del *.*')).toBe(false);
    });

    test('rejects dangerous commands (powershell)', () => {
      expect(RhinoCommandConfig.validateCommand('powershell -exec bypass')).toBe(false);
    });

    test('rejects dangerous commands (rm)', () => {
      expect(RhinoCommandConfig.validateCommand('rm -rf /')).toBe(false);
    });

    test('rejects dangerous commands (shutdown)', () => {
      expect(RhinoCommandConfig.validateCommand('shutdown /s /t 0')).toBe(false);
    });

    test('allows COM-prefixed commands', () => {
      expect(RhinoCommandConfig.validateCommand('COM:basic')).toBe(true);
    });

    test('allows PYTHON-prefixed commands', () => {
      expect(RhinoCommandConfig.validateCommand('PYTHON:with_viewport')).toBe(true);
    });

    test('allows standard Grasshopper CLI commands', () => {
      expect(RhinoCommandConfig.validateCommand('_-Grasshopper _DocumentOpen "file.gh" _Enter')).toBe(true);
    });
  });

  describe('_resolveCommand()', () => {
    test('resolves known template name', () => {
      const resolved = RhinoCommandConfig._resolveCommand('com_basic', '/test/file.gh');
      expect(resolved).toBe('COM:basic');
    });

    test('replaces {filePath} in CLI templates', () => {
      const resolved = RhinoCommandConfig._resolveCommand('standard', 'C:\\test\\file.gh');
      expect(resolved).toContain('C:\\test\\file.gh');
      expect(resolved).not.toContain('{filePath}');
    });

    test('uses raw string as command if not a known template', () => {
      const resolved = RhinoCommandConfig._resolveCommand('_CustomCommand "{filePath}"', '/test/file.gh');
      expect(resolved).toBe('_CustomCommand "/test/file.gh"');
    });
  });

  describe('static getters', () => {
    test('getAvailableTemplates() returns a copy of templates', () => {
      const templates = RhinoCommandConfig.getAvailableTemplates();
      expect(templates).toHaveProperty('com_basic');
      expect(templates).toHaveProperty('standard');
      // Ensure it's a copy
      templates.injected = 'bad';
      expect(COMMAND_TEMPLATES).not.toHaveProperty('injected');
    });

    test('getFileMapping() returns a copy of mappings', () => {
      const mapping = RhinoCommandConfig.getFileMapping();
      expect(mapping['example.gh']).toBeDefined();
      expect(mapping['*']).toBeDefined();
    });

    test('getRhinoConfig() returns a copy of config', () => {
      const config = RhinoCommandConfig.getRhinoConfig();
      expect(config).toHaveProperty('launchTimeout');
      expect(config).toHaveProperty('maxInstances');
      expect(config.launchTimeout).toBe(30000);
    });
  });
});
