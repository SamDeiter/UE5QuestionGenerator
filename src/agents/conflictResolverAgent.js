import { logger } from "../utils/logger";
/**
 * Conflict Resolver Agent
 *
 * Responsibility: Handle version conflicts and guide users through resolution.
 *
 * Resolution Options:
 * 1. Reload and Discard - Safest option, fetch latest version
 * 2. Overwrite Server Changes - Dangerous, forces local changes
 * 3. Manual Merge - Advanced, user decides field-by-field
 */

export class ConflictResolverAgent {
  /**
   * @param {LoadAgent} loadAgent - Load agent instance
   * @param {LockAgent} lockAgent - Lock agent instance
   * @param {SaveGuardAgent} saveGuardAgent - Save guard agent instance
   */
  constructor(loadAgent, lockAgent, saveGuardAgent) {
    this.loadAgent = loadAgent;
    this.lockAgent = lockAgent;
    this.saveGuardAgent = saveGuardAgent;
  }

  /**
   * Handle a version conflict
   * @param {string} questionId - Question document ID
   * @param {object} localChanges - User's local changes
   * @param {number} expectedVersion - Version user was editing
   * @returns {Promise<{action: string, serverQuestion?: object, serverVersion?: number, localChanges?: object, error?: string}>}
   */
  async handleConflict(questionId, localChanges, expectedVersion) {
    logger.log(
      `[ConflictResolver] Handling version conflict for question ${questionId}`
    );

    // Fetch the latest server version
    const loadResult = await this.loadAgent.loadQuestion(questionId);

    if (!loadResult.success) {
      return {
        action: "ERROR",
        error: "Cannot fetch latest version: " + loadResult.error,
      };
    }

    const serverQuestion = loadResult.question;
    const serverVersion = loadResult.baseVersion;

    logger.log(
      `[ConflictResolver] Conflict detected: Expected v${expectedVersion}, ` +
        `but server is at v${serverVersion}`
    );

    // Return conflict data for UI to display
    return {
      action: "SHOW_CONFLICT_MODAL",
      serverQuestion,
      serverVersion,
      localChanges,
      expectedVersion,
    };
  }

  /**
   * Resolution Option 1: Discard local changes and reload
   * @param {string} questionId - Question document ID
   * @returns {Promise<{success: boolean, question?: object, baseVersion?: number, error?: string}>}
   */
  async discardLocalChanges(questionId) {
    logger.log(
      `[ConflictResolver] Discarding local changes for question ${questionId}`
    );

    const result = await this.loadAgent.reloadQuestion(questionId);

    if (result.success) {
      logger.log(
        `[ConflictResolver] Reloaded question ${questionId} at version ${result.latestVersion}`
      );
    }

    return result;
  }

  /**
   * Resolution Option 2: Force overwrite server changes with local changes
   * WARNING: This discards the other user's changes!
   * @param {string} questionId - Question document ID
   * @param {object} localChanges - User's local changes
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @returns {Promise<{success: boolean, newVersion?: number, error?: string}>}
   */
  async overwriteServerChanges(questionId, localChanges, userId, userEmail) {
    logger.warn(
      `[ConflictResolver] FORCING overwrite for question ${questionId}. ` +
        `Other user's changes will be lost!`
    );

    // Step 1: Re-acquire lock
    const lockResult = await this.lockAgent.acquireLock(
      questionId,
      userId,
      userEmail
    );

    if (!lockResult.success) {
      return {
        success: false,
        error: "Cannot acquire lock for overwrite: " + lockResult.error,
      };
    }

    // Step 2: Fetch latest version
    const loadResult = await this.loadAgent.loadQuestion(questionId);

    if (!loadResult.success) {
      return {
        success: false,
        error: "Cannot fetch latest version: " + loadResult.error,
      };
    }

    const latestVersion = loadResult.baseVersion;

    // Step 3: Save with latest version (forcing overwrite)
    const saveResult = await this.saveGuardAgent.saveQuestion(
      questionId,
      localChanges,
      latestVersion,
      userId,
      userEmail
    );

    if (saveResult.success) {
      logger.log(
        `[ConflictResolver] Overwrite successful. New version: ${saveResult.newVersion}`
      );
    }

    return saveResult;
  }

  /**
   * Resolution Option 3: Apply manually merged changes
   * @param {string} questionId - Question document ID
   * @param {object} mergedChanges - User's manually merged changes
   * @param {string} userId - Firebase Auth UID
   * @param {string} userEmail - User's email
   * @returns {Promise<{success: boolean, newVersion?: number, error?: string}>}
   */
  async applyManualMerge(questionId, mergedChanges, userId, userEmail) {
    logger.log(
      `[ConflictResolver] Applying manual merge for question ${questionId}`
    );

    // Step 1: Re-acquire lock
    const lockResult = await this.lockAgent.acquireLock(
      questionId,
      userId,
      userEmail
    );

    if (!lockResult.success) {
      return {
        success: false,
        error: "Cannot acquire lock for merge: " + lockResult.error,
      };
    }

    // Step 2: Fetch latest version
    const loadResult = await this.loadAgent.loadQuestion(questionId);

    if (!loadResult.success) {
      return {
        success: false,
        error: "Cannot fetch latest version: " + loadResult.error,
      };
    }

    const latestVersion = loadResult.baseVersion;

    // Step 3: Save merged changes
    const saveResult = await this.saveGuardAgent.saveQuestion(
      questionId,
      mergedChanges,
      latestVersion,
      userId,
      userEmail
    );

    if (saveResult.success) {
      logger.log(
        `[ConflictResolver] Manual merge successful. New version: ${saveResult.newVersion}`
      );
    }

    return saveResult;
  }

  /**
   * Generate a diff between local and server changes
   * @param {object} localQuestion - User's local version
   * @param {object} serverQuestion - Server's current version
   * @returns {object} Diff object with changed fields
   */
  generateDiff(localQuestion, serverQuestion) {
    const diff = {
      changed: [],
      localOnly: [],
      serverOnly: [],
    };

    const allKeys = new Set([
      ...Object.keys(localQuestion),
      ...Object.keys(serverQuestion),
    ]);

    // Exclude metadata fields from diff
    const excludeKeys = [
      "id",
      "createdAt",
      "updatedAt",
      "createdBy",
      "updatedBy",
      "version",
      "lastEditedBy",
    ];

    for (const key of allKeys) {
      if (excludeKeys.includes(key)) continue;

      const localValue = localQuestion[key];
      const serverValue = serverQuestion[key];

      // Deep equality check for arrays and objects
      const isEqual =
        JSON.stringify(localValue) === JSON.stringify(serverValue);

      if (!isEqual) {
        if (localValue !== undefined && serverValue !== undefined) {
          diff.changed.push({
            field: key,
            localValue,
            serverValue,
          });
        } else if (localValue !== undefined) {
          diff.localOnly.push({ field: key, value: localValue });
        } else {
          diff.serverOnly.push({ field: key, value: serverValue });
        }
      }
    }

    return diff;
  }
}
