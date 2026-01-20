/**
 * ReviewCore SDK
 * A modular, framework-agnostic system for tool review and tracking.
 */
class ReviewCore {
  constructor(config = {}) {
    this.config = {
      appId: "default-app",
      items: [],
      onShowItem: null,
      onStatusUpdate: null,
      storage: null,
      ...config,
    };

    this.state = {
      currentIndex: 0,
      itemStatuses: {}, // { itemId: { status: 'pending|verified|issue', note: '' } }
      isInitialized: false,
    };

    this.ui = null;
    this.storage = this.config.storage;
  }

  /**
   * Initialize the SDK
   */
  async init() {
    console.log(`[ReviewCore] Initializing for ${this.config.appId}...`);

    // Load state from storage if available
    if (this.storage) {
      const savedState = await this.storage.load(this.config.appId);
      if (savedState) {
        this.state = { ...this.state, ...savedState };
      }
    }

    this.state.isInitialized = true;

    // Notify host to show the first item
    if (this.config.items.length > 0) {
      this.showItem(this.state.currentIndex);
    }

    return this;
  }

  /**
   * Set the UI component
   */
  setUI(uiComponent) {
    this.ui = uiComponent;
    if (this.ui.update) {
      this.ui.update(this.state, this.config.items);
    }
  }

  /**
   * Show a specific item by index
   */
  showItem(index) {
    if (index < 0 || index >= this.config.items.length) return;

    this.state.currentIndex = index;
    const item = this.config.items[index];

    if (this.config.onShowItem) {
      this.config.onShowItem(item);
    }

    // Direct callback for UI internal syncing
    if (this.onShowItemInternal) {
      this.onShowItemInternal(item);
    }

    if (this.ui && this.ui.update) {
      this.ui.update(this.state, this.config.items);
    }

    this.saveState();
  }

  /**
   * Update the status of the current item
   */
  updateCurrentStatus(status, note = "", highlights = []) {
    const currentItem = this.config.items[this.state.currentIndex];
    if (!currentItem) return;

    this.state.itemStatuses[currentItem.id] = {
      status,
      note,
      highlights,
      updatedAt: new Date().toISOString(),
    };

    if (this.config.onStatusUpdate) {
      this.config.onStatusUpdate(currentItem.id, status, note, highlights);
    }

    if (this.ui && this.ui.update) {
      this.ui.update(this.state, this.config.items);
    }

    this.saveState();
  }

  /**
   * Save current state to storage
   */
  async saveState() {
    if (this.storage) {
      await this.storage.save(this.config.appId, {
        currentIndex: this.state.currentIndex,
        itemStatuses: this.state.itemStatuses,
      });
    }
  }

  /**
   * Export all review data
   */
  exportData() {
    return {
      appId: this.config.appId,
      exportedAt: new Date().toISOString(),
      results: this.config.items.map((item) => ({
        id: item.id,
        title: item.title,
        status: this.state.itemStatuses[item.id] || {
          status: "pending",
          note: "",
          highlights: [],
        },
      })),
    };
  }
}

// Export as global for easy drop-in usage
window.ReviewCore = ReviewCore;
