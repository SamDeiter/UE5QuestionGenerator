/**
 * Database Migration: Fix Auto-Accepted Questions
 * 
 * This script resets all "accepted" questions back to "pending" status
 * if they don't have explicit review tracking (reviewCompletedAt).
 * 
 * Run this once to fix the 41 questions that were improperly auto-accepted.
 */

import { db, auth } from '../services/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { logger } from "../utils/logger";

export const migrateAutoAcceptedQuestions = async () => {
  try {
    if (!auth.currentUser) {
      logger.error('❌ Must be signed in to run migration');
      return { success: false, error: 'Not authenticated' };
    }

    logger.log('🔄 Starting migration: Fixing auto-accepted questions...');
    
    // Get all questions
    const questionsRef = collection(db, 'questions');
    const snapshot = await getDocs(questionsRef);
    
    let fixedCount = 0;
    let totalCount = 0;
    const batch = [];
    
    snapshot.forEach((docSnap) => {
      const question = docSnap.data();
      totalCount++;
      
      // Check if question is "accepted" but has no review completion timestamp
      // This indicates it was auto-accepted, not manually reviewed
      if (question.status === 'accepted' && !question.reviewCompletedAt) {
        logger.log(`📝 Fixing question ${docSnap.id} - was auto-accepted`);
        batch.push(
          updateDoc(doc(db, 'questions', docSnap.id), {
            status: 'pending',
            // Add migration marker
            migratedAt: new Date().toISOString(),
            migrationReason: 'auto-accept-bug-fix'
          })
        );
        fixedCount++;
      }
    });
    
    // Execute all updates
    if (batch.length > 0) {
      await Promise.all(batch);
      logger.log(`✅ Migration complete: Fixed ${fixedCount} of ${totalCount} questions`);
    } else {
      logger.log(`✅ No questions needed fixing (checked ${totalCount} questions)`);
    }
    
    return {
      success: true,
      totalChecked: totalCount,
      fixed: fixedCount
    };
    
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
