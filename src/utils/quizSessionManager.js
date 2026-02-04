/**
 * Quiz Session Manager
 * Handles attempt tracking, session locking, and multi-tab detection for quiz security.
 * 
 * Features:
 * - Unique attempt token generation (session-scoped)
 * - Session locking to prevent restart during active attempt
 * - BroadcastChannel for cross-tab coordination
 * - History API manipulation for back-button prevention
 */

import { logger } from './logger';

// Storage keys
const ATTEMPT_KEY = 'ue5_quiz_active_attempt';
const CHANNEL_NAME = 'ue5_quiz_coordination';

/**
 * Generate unique attempt token
 * @returns {string} Unique attempt identifier
 */
export function generateAttemptToken() {
  const timestamp = Date.now().toString(36);
  // eslint-disable-next-line sonarjs/pseudo-random -- Non-cryptographic unique ID
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `attempt_${timestamp}_${randomPart}`;
}

/**
 * Lock an attempt in sessionStorage
 * @param {string} token - Attempt token from generateAttemptToken
 * @param {string} quizGuid - Quiz GUID for identification
 * @returns {boolean} True if locked successfully, false if attempt already exists
 */
export function lockAttempt(token, quizGuid) {
  const existing = sessionStorage.getItem(ATTEMPT_KEY);
  if (existing) {
    logger.warn('[QuizSession] Attempt already locked:', existing);
    return false;
  }
  
  const attemptData = {
    token,
    quizGuid,
    startedAt: new Date().toISOString(),
    tabId: getTabId()
  };
  
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attemptData));
  logger.log('[QuizSession] Attempt locked:', token);
  
  // Broadcast to other tabs
  broadcastAttemptStart(attemptData);
  
  return true;
}

/**
 * Check if there's an active attempt in this session
 * @returns {Object|null} Attempt data if active, null otherwise
 */
export function getActiveAttempt() {
  const data = sessionStorage.getItem(ATTEMPT_KEY);
  if (!data) return null;
  
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Check if an attempt is currently active
 * @returns {boolean}
 */
export function isAttemptActive() {
  return getActiveAttempt() !== null;
}

/**
 * Clear the active attempt (call on completion)
 * @param {string} token - Token of the attempt to clear (for validation)
 * @returns {boolean} True if cleared, false if token mismatch
 */
export function clearAttempt(token) {
  const active = getActiveAttempt();
  
  if (!active) {
    logger.warn('[QuizSession] No active attempt to clear');
    return false;
  }
  
  if (token && active.token !== token) {
    logger.warn('[QuizSession] Token mismatch, not clearing');
    return false;
  }
  
  sessionStorage.removeItem(ATTEMPT_KEY);
  logger.log('[QuizSession] Attempt cleared:', token || active.token);
  
  // Broadcast completion to other tabs
  broadcastAttemptEnd(active);
  
  return true;
}

/**
 * Force clear attempt (for abandon scenarios)
 */
export function forceAbandonAttempt() {
  const active = getActiveAttempt();
  if (active) {
    sessionStorage.removeItem(ATTEMPT_KEY);
    broadcastAttemptEnd(active);
    logger.log('[QuizSession] Attempt abandoned:', active.token);
  }
}

// ============================================================================
// BACK BUTTON PREVENTION
// ============================================================================

let historyPushCount = 0;
let popstateHandler = null;

/**
 * Prevent back navigation during quiz
 * Pushes a state and handles popstate to re-push
 */
export function preventBackNavigation() {
  // Push an extra history state
  window.history.pushState({ quizActive: true, count: historyPushCount++ }, '');
  
  // Handle popstate (back button)
  popstateHandler = (_e) => {
    if (isAttemptActive()) {
      // Push state again to prevent leaving
      window.history.pushState({ quizActive: true, count: historyPushCount++ }, '');
      logger.log('[QuizSession] Back navigation blocked');
    }
  };
  
  window.addEventListener('popstate', popstateHandler);
  logger.log('[QuizSession] Back navigation prevention enabled');
}

/**
 * Restore normal back navigation
 */
export function restoreBackNavigation() {
  if (popstateHandler) {
    window.removeEventListener('popstate', popstateHandler);
    popstateHandler = null;
    logger.log('[QuizSession] Back navigation prevention disabled');
  }
}

// ============================================================================
// BEFOREUNLOAD WARNING
// ============================================================================

let beforeUnloadHandler = null;

/**
 * Add beforeunload warning during quiz
 */
export function enableUnloadWarning() {
  beforeUnloadHandler = (e) => {
    if (isAttemptActive()) {
      e.preventDefault();
      // Modern browsers ignore custom messages but require returnValue
      e.returnValue = 'You have an active quiz. Are you sure you want to leave?';
      return e.returnValue;
    }
  };
  
  window.addEventListener('beforeunload', beforeUnloadHandler);
  logger.log('[QuizSession] Unload warning enabled');
}

/**
 * Remove beforeunload warning
 */
export function disableUnloadWarning() {
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
    logger.log('[QuizSession] Unload warning disabled');
  }
}

// ============================================================================
// MULTI-TAB DETECTION
// ============================================================================

let broadcastChannel = null;
let onDuplicateAttemptCallback = null;

/**
 * Get or create a unique tab identifier
 * @returns {string}
 */
function getTabId() {
  let tabId = sessionStorage.getItem('ue5_quiz_tab_id');
  if (!tabId) {
    // eslint-disable-next-line sonarjs/pseudo-random -- Non-cryptographic unique ID
    tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionStorage.setItem('ue5_quiz_tab_id', tabId);
  }
  return tabId;
}

/**
 * Initialize multi-tab detection
 * @param {Function} onDuplicate - Callback when duplicate attempt detected
 */
export function initMultiTabDetection(onDuplicate) {
  onDuplicateAttemptCallback = onDuplicate;
  
  // Try BroadcastChannel first (modern browsers)
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
      broadcastChannel.onmessage = handleBroadcastMessage;
      logger.log('[QuizSession] BroadcastChannel initialized');
      return;
    } catch (err) {
      logger.warn('[QuizSession] BroadcastChannel failed:', err);
    }
  }
  
  // Fallback: localStorage events
  window.addEventListener('storage', handleStorageEvent);
  logger.log('[QuizSession] Using localStorage fallback for multi-tab detection');
}

/**
 * Cleanup multi-tab detection listeners
 */
export function cleanupMultiTabDetection() {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
  window.removeEventListener('storage', handleStorageEvent);
  onDuplicateAttemptCallback = null;
}

/**
 * Broadcast attempt start to other tabs
 * @param {Object} attemptData
 */
function broadcastAttemptStart(attemptData) {
  const message = { type: 'ATTEMPT_START', ...attemptData };
  
  if (broadcastChannel) {
    broadcastChannel.postMessage(message);
  } else {
    // Fallback: use localStorage
    localStorage.setItem('ue5_quiz_broadcast', JSON.stringify({
      ...message,
      timestamp: Date.now()
    }));
  }
}

/**
 * Broadcast attempt end to other tabs
 * @param {Object} attemptData
 */
function broadcastAttemptEnd(attemptData) {
  const message = { type: 'ATTEMPT_END', ...attemptData };
  
  if (broadcastChannel) {
    broadcastChannel.postMessage(message);
  } else {
    localStorage.setItem('ue5_quiz_broadcast', JSON.stringify({
      ...message,
      timestamp: Date.now()
    }));
  }
}

/**
 * Request active attempt info from other tabs
 */
export function queryOtherTabs() {
  const message = { type: 'QUERY_ACTIVE', tabId: getTabId() };
  
  if (broadcastChannel) {
    broadcastChannel.postMessage(message);
  } else {
    localStorage.setItem('ue5_quiz_broadcast', JSON.stringify({
      ...message,
      timestamp: Date.now()
    }));
  }
}

/**
 * Handle BroadcastChannel messages
 * @param {MessageEvent} event
 */
function handleBroadcastMessage(event) {
  const data = event.data;
  const myTabId = getTabId();
  
  if (data.tabId === myTabId) return; // Ignore own messages
  
  switch (data.type) {
    case 'ATTEMPT_START':
      logger.log('[QuizSession] Another tab started attempt:', data.token);
      if (onDuplicateAttemptCallback) {
        onDuplicateAttemptCallback(data);
      }
      break;
      
    case 'QUERY_ACTIVE': {
      // Respond if we have an active attempt
      const active = getActiveAttempt();
      if (active && broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'ACTIVE_RESPONSE',
          ...active
        });
      }
      break;
    }
      
    case 'ACTIVE_RESPONSE':
      logger.log('[QuizSession] Found active attempt in another tab');
      if (onDuplicateAttemptCallback) {
        onDuplicateAttemptCallback(data);
      }
      break;
  }
}

/**
 * Handle localStorage fallback events
 * @param {StorageEvent} event
 */
function handleStorageEvent(event) {
  if (event.key !== 'ue5_quiz_broadcast') return;
  
  try {
    const data = JSON.parse(event.newValue);
    // Simulate broadcast message
    handleBroadcastMessage({ data });
  } catch {
    // Ignore parse errors
  }
}
