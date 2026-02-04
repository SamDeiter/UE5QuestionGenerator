/**
 * User Repository
 *
 * Repository interface for user settings and preferences.
 * Handles custom tags, user preferences, and user-specific data.
 *
 * @example
 * import { users } from '../services/firestore';
 *
 * // Get custom tags
 * const tags = await users.getCustomTags();
 *
 * // Save custom tags
 * await users.saveCustomTags({ Blueprints: ['Events', 'Functions'] });
 */
import { saveCustomTags, getCustomTags } from "../firebaseQueries";

/**
 * User Repository - Clean API for user data operations
 */
export const users = {
  /**
   * Get custom tags for the current user
   * @returns {Promise<Object>} Object mapping discipline names to tag arrays
   */
  getCustomTags,

  /**
   * Save custom tags for the current user
   * @param {Object} customTags - Object mapping discipline names to tag arrays
   * @returns {Promise<void>}
   */
  saveCustomTags,

  /**
   * Add a custom tag to a discipline
   * @param {string} discipline - Discipline name
   * @param {string} tag - Tag to add
   * @returns {Promise<void>}
   */
  addCustomTag: async (discipline, tag) => {
    const currentTags = await getCustomTags();
    const disciplineTags = currentTags[discipline] || [];

    if (!disciplineTags.includes(tag)) {
      await saveCustomTags({
        ...currentTags,
        [discipline]: [...disciplineTags, tag],
      });
    }
  },

  /**
   * Remove a custom tag from a discipline
   * @param {string} discipline - Discipline name
   * @param {string} tag - Tag to remove
   * @returns {Promise<void>}
   */
  removeCustomTag: async (discipline, tag) => {
    const currentTags = await getCustomTags();
    const disciplineTags = currentTags[discipline] || [];

    await saveCustomTags({
      ...currentTags,
      [discipline]: disciplineTags.filter((t) => t !== tag),
    });
  },
};

// Default export for convenience
export default users;
