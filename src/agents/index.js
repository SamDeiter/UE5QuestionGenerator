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

let agentInstances = null;

/**
 * Initialize all agents with Firestore database
 * @param {Firestore} db - Firestore database instance
 * @returns {object} Object containing all agent instances
 */
export function initializeAgents(db) {
  if (agentInstances) {
    console.warn("[AgentFactory] Agents already initialized");
    return agentInstances;
  }

  console.log("[AgentFactory] Initializing agents...");

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

  console.log("[AgentFactory] Agents initialized successfully");
  console.log("[AgentFactory] Session ID:", sessionAgent.getSessionId());

  return agentInstances;
}

/**
 * Get initialized agent instances
 * @returns {object|null} Object containing all agent instances, or null if not initialized
 */
export function getAgents() {
  if (!agentInstances) {
    console.error(
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
  console.log("[AgentFactory] Resetting agents");
  agentInstances = null;
}

/**
 * Get a specific agent
 * @param {string} agentName - Name of the agent (sessionAgent, lockAgent, etc.)
 * @returns {object|null} Agent instance or null
 */
export function getAgent(agentName) {
  const agents = getAgents();
  if (!agents) return null;

  if (!agents[agentName]) {
    console.error(`[AgentFactory] Agent "${agentName}" not found`);
    return null;
  }

  return agents[agentName];
}

// Named exports for convenience
export { getSessionAgent };
