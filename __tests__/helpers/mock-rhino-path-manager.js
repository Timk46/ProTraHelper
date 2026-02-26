const { MockStore } = require('./mock-store');

/**
 * Creates a mock RhinoPathManager that fulfills the interface expected by AppServer.
 * @param {object} [overrides] - Optional overrides for default behavior
 * @returns {object} Mock RhinoPathManager instance
 */
function createMockRhinoPathManager(overrides = {}) {
  const store = new MockStore();

  return {
    getRhinoPath: jest.fn().mockResolvedValue(overrides.rhinoPath || null),
    setRhinoPath: jest.fn().mockResolvedValue(true),
    getCurrentPath: jest.fn().mockReturnValue(overrides.rhinoPath || null),
    autoDetectRhinoPath: jest.fn().mockResolvedValue(null),
    store,
    ...overrides,
  };
}

module.exports = { createMockRhinoPathManager };
