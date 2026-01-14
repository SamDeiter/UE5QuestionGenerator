import os

def patch_lock_agent():
    path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\agents\lockAgent.js"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define the check for network error
    network_error_check = """
  _isNetworkError(error) {
    const networkCodes = ['unavailable', 'deadline-exceeded', 'resource-exhausted', 'internal', 'unknown'];
    return (
      error.code && networkCodes.includes(error.code) ||
      error.message?.includes('net::ERR_CONNECTION_CLOSED') ||
      error.message?.includes('network')
    );
  }
"""
    
    # Add the helper method before the end of the class
    if "_isNetworkError(error)" not in content:
        content = content.replace("  }\n}", "  }\n" + network_error_check + "}")

    # Update acquireLock catch block
    old_acquire_catch = """    } catch (error) {
      console.error("[LockAgent] acquireLock failed:", error);
      return { success: false, error: error.message };
    }"""
    
    new_acquire_catch = """    } catch (error) {
      const isNetwork = this._isNetworkError(error);
      if (isNetwork) {
        console.warn("[LockAgent] acquireLock network failure:", error.message);
      } else {
        console.error("[LockAgent] acquireLock failed:", error);
      }
      return { 
        success: false, 
        error: error.message, 
        isNetworkError: isNetwork 
      };
    }"""
    
    content = content.replace(old_acquire_catch, new_acquire_catch)

    # Update renewLock catch block
    old_renew_catch = """    } catch (error) {
      console.error("[LockAgent] renewLock failed:", error);
      return { success: false, error: error.message };
    }"""
    
    new_renew_catch = """    } catch (error) {
      const isNetwork = this._isNetworkError(error);
      // Suppress full error for network issues to avoid console spam during heartbeat
      if (isNetwork) {
        console.warn("[LockAgent] renewLock network failure:", error.message);
      } else {
        console.error("[LockAgent] renewLock failed:", error);
      }
      return { 
        success: false, 
        error: error.message, 
        isNetworkError: isNetwork 
      };
    }"""
    
    content = content.replace(old_renew_catch, new_renew_catch)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched LockAgent.js")

def patch_use_edit_lock():
    path = r"c:\Users\Sam Deiter\Documents\GitHub\UE5QuestionGenerator\src\hooks\useEditLock.js"
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add consecutive failures ref
    if "const consecutiveFailuresRef = useRef(0);" not in content:
        insertion_point = "const viewTimerRef = useRef(null);"
        content = content.replace(insertion_point, insertion_point + "\n  const consecutiveFailuresRef = useRef(0);")

    # 2. Update renewLock logic in useEditLock
    old_renew_lock = """  const renewLock = useCallback(async () => {
    if (!agents || !questionId) return { success: false };

    const { lockAgent } = agents;

    try {
      const result = await lockAgent.renewLock(String(questionId));

      if (!result.success) {
        console.warn("[useEditLock] Lock renewal failed:", result.error);
        setLockStatus("expired");
        if (onLockExpired) onLockExpired();
      }

      return result;
    } catch (error) {
      console.error("[useEditLock] Lock renewal error:", error);
      setLockStatus("expired");
      return { success: false, error: error.message };
    }
  }, [agents, questionId, onLockExpired]);"""

    new_renew_lock = """  const renewLock = useCallback(async () => {
    if (!agents || !questionId) return { success: false };

    const { lockAgent } = agents;

    try {
      const result = await lockAgent.renewLock(String(questionId));

      if (!result.success) {
        if (result.isNetworkError) {
          consecutiveFailuresRef.current++;
          console.warn(`[useEditLock] Lock renewal network failure (${consecutiveFailuresRef.current}):`, result.error);
          
          // Allow up to 3 consecutive network failures (approx 1.5 mins) before expiring
          if (consecutiveFailuresRef.current >= 3) {
            console.error("[useEditLock] Persistent network failure (3 attempts). Expiring lock.");
            setLockStatus("expired");
            if (onLockExpired) onLockExpired();
            return result;
          }
          
          // Return special success-like state for network retry
          return { success: true, isRetrying: true };
        }

        console.warn("[useEditLock] Lock renewal failed (logic error):", result.error);
        setLockStatus("expired");
        if (onLockExpired) onLockExpired();
      } else {
        // Reset failure counter on success
        consecutiveFailuresRef.current = 0;
      }

      return result;
    } catch (error) {
      // Uncaught errors still expire
      console.error("[useEditLock] Lock renewal unexpected error:", error);
      setLockStatus("expired");
      if (onLockExpired) onLockExpired();
      return { success: false, error: error.message };
    }
  }, [agents, questionId, onLockExpired]);"""

    content = content.replace(old_renew_lock, new_renew_lock)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched useEditLock.js")

if __name__ == "__main__":
    patch_lock_agent()
    patch_use_edit_lock()
