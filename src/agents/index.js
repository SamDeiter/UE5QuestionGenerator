/**
 * Agent Factory
 *
 * Centralized initialization and management of all agents.
 * Provides singleton instances to ensure consistency across the application.
 */

import { getSessionAgent } from "./sessionAgent.js";
import { LockAgent } from "./lockAgent.js";
import { LoadAgent } from "./loadAgent.js";
import { SaveGuardAgent } from "./saveGuardAgent.js";
import { ConflictResolverAgent } from "./conflictResolverAgent.js";
import { AuditAgent } from "./auditAgent.js";
import { logger } from "../utils/logger";

let agentInstances = null;

/**
 * Initialize all agents with Firestore database
 * @param {Firestore} db - Firestore database instance
 * @returns {object} Object containing all agent instances
 */
export function initializeAgents(db) {
  if (agentInstances) {
    logger.warn("[AgentFactory] Agents already initialized");
    return agentInstances;
  }

  logger.log("[AgentFactory] Initializing agents...");

  // Initialize agents in dependency order
  const sessionAgent = getSessionAgent();
  const lockAgent = new LockAgent(db, sessionAgent);
  const loadAgent = new LoadAgent(db);
  const saveGuardAgent = new SaveGuardAgent(db, sessionAgent);
  const auditAgent = new AuditAgent(db, sessionAgent);
  const conflictResolverAgent = new ConflictResolverAgent(
    loadAgent,
    lockAgent,
    saveGuardAgent
  );

  agentInstances = {
    sessionAgent,
    lockAgent,
    loadAgent,
    saveGuardAgent,
    conflictResolverAgent,
    auditAgent,
  };

  logger.log("[AgentFactory] Agents initialized successfully");
  logger.log("[AgentFactory] Session ID:", sessionAgent.getSessionId());

  return agentInstances;
}

/**
 * Get initialized agent instances
 * @returns {object|null} Object containing all agent instances, or null if not initialized
 */
export function getAgents() {
  if (!agentInstances) {
    logger.warn(
      "[AgentFactory] Agents not initialized. Call initializeAgents(db) first."
    );
    return null;
  }
  return agentInstances;
}

/**
 * Reset agents (for testing or reinitialization)
 */
export function resetAgents() {
  logger.log("[AgentFactory] Resetting agents");
  agentInstances = null;
}
