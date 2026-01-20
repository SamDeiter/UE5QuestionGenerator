/**
 * ReviewStorage Module
 * Handles persistence for the ReviewCore SDK.
 */
class ReviewStorage {
  async load(appId) {
    throw new Error("Load method not implemented");
  }
  async save(appId, data) {
    throw new Error("Save method not implemented");
  }
}

/**
 * LocalStorage Adapter
 */
class LocalStorageAdapter extends ReviewStorage {
  async load(appId) {
    const key = `review_sdk_state_${appId}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("[ReviewStorage] LocalStorage parse error:", e);
      return null;
    }
  }

  async save(appId, data) {
    const key = `review_sdk_state_${appId}`;
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("[ReviewStorage] LocalStorage save error:", e);
      return false;
    }
  }
}

/**
 * JSON File Adapter (for export/import)
 */
class JSONFileAdapter extends ReviewStorage {
  async save(appId, data) {
    // This adapter typically triggers a download rather than silent background save
    const exportData = {
      appId,
      version: 1,
      exportedAt: new Date().toISOString(),
      ...data,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review_export_${appId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    return true;
  }

  // Load is usually handled by a file input event in the UI,
  // but we provide a helper to parse the data
  parse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error("[ReviewStorage] JSON parse error:", e);
      return null;
    }
  }
}

// Export adapters
window.ReviewStorage = {
  Base: ReviewStorage,
  LocalStorage: LocalStorageAdapter,
  JSONFile: JSONFileAdapter,
};
