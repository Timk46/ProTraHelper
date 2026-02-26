/**
 * In-memory key-value store that replaces electron-store for testing.
 */
class MockStore {
  constructor() {
    this._data = new Map();
  }

  get(key, defaultValue) {
    if (this._data.has(key)) {
      return this._data.get(key);
    }
    return defaultValue !== undefined ? defaultValue : undefined;
  }

  set(key, value) {
    this._data.set(key, value);
  }

  delete(key) {
    this._data.delete(key);
  }

  has(key) {
    return this._data.has(key);
  }

  clear() {
    this._data.clear();
  }
}

module.exports = { MockStore };
