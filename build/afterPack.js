/**
 * electron-builder afterPack Hook
 * DMG target: keine macOS-spezifischen Post-Pack-Schritte noetig.
 * LaunchAgent-Setup wird zur Laufzeit in src/platform/macos-setup.js erledigt.
 */
module.exports = async function afterPack(context) {
  // Intentionally empty - previously contained PKG-specific installer script
  // preparation (chmod for mac-scripts). With DMG target, this is no longer needed.
};
