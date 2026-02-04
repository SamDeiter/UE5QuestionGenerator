/*! Minimal SCORM 1.2 helper (no external deps). */
(function (win) {
  'use strict';
  var SCORM12 = (function () {
    var API = null;
    var connected = false;

    function _findAPI(w) {
      var depth = 0;
      try {
        while (w && depth < 20) {
          if (w.API) return w.API;
          if (w.parent && w.parent !== w) {
            w = w.parent;
          } else {
            break;
          }
          depth++;
        }
      } catch (e) {}
      // opener case
      try {
        if (win.opener && win.opener.API) return win.opener.API;
      } catch (e) {}
      return null;
    }

    function getAPI() {
      if (API) return API;
      API = _findAPI(win);
      return API;
    }

    function init() {
      if (connected) return true;
      var api = getAPI();
      if (!api || typeof api.LMSInitialize !== "function") return false;
      var ok = api.LMSInitialize("") == "true";
      connected = !!ok;
      if (connected) {
        try {
          var status = api.LMSGetValue("cmi.core.lesson_status");
          if (!status || status === "not attempted" || status === "unknown" || status === "0") {
            api.LMSSetValue("cmi.core.lesson_status", "incomplete");
            api.LMSCommit("");
          }
        } catch (e) {}
      }
      return connected;
    }

    function finish() {
      var api = getAPI();
      if (!api || typeof api.LMSFinish !== "function") return false;
      var res = api.LMSFinish("");
      connected = false;
      return res == "true";
    }

    function commit() {
      var api = getAPI();
      if (!api || typeof api.LMSCommit !== "function") return false;
      return api.LMSCommit("") == "true";
    }

    function getValue(elm) {
      var api = getAPI();
      if (!api || typeof api.LMSGetValue !== "function") return "";
      return api.LMSGetValue(elm);
    }

    function setValue(elm, val) {
      var api = getAPI();
      if (!api || typeof api.LMSSetValue !== "function") return false;
      return api.LMSSetValue(elm, String(val)) == "true";
    }

    function setStatus(status) {
      return setValue("cmi.core.lesson_status", status);
    }

    function getStatus() {
      return getValue("cmi.core.lesson_status");
    }

    function setScoreRaw(raw, min, max) {
      if (typeof raw !== "undefined") setValue("cmi.core.score.raw", Math.round(raw));
      if (typeof min !== "undefined") setValue("cmi.core.score.min", Math.round(min));
      if (typeof max !== "undefined") setValue("cmi.core.score.max", Math.round(max));
    }

    function secondsToSCORMTime(totalSeconds) {
      totalSeconds = Math.max(0, Math.floor(totalSeconds || 0));
      var h = Math.floor(totalSeconds / 3600);
      var m = Math.floor((totalSeconds % 3600) / 60);
      var s = Math.floor(totalSeconds % 60);
      function pad(n){ return (n<10?"0":"")+n; }
      return pad(h)+":"+pad(m)+":"+pad(s);
    }

    function setSessionTimeSeconds(sec) {
      return setValue("cmi.core.session_time", secondsToSCORMTime(sec));
    }

    /**
     * Record an interaction (question response) for LMS tracking
     * SCORM 1.2 cmi.interactions allows LMS to see each question asked
     * @param {number} index - Question index (0-based)
     * @param {Object} data - Interaction data
     * @param {string} data.id - Question ID
     * @param {string} data.type - "choice" for MC, "true-false" for T/F
     * @param {string} data.studentResponse - Learner's response text
     * @param {string} data.correctResponse - Correct response text
     * @param {string} data.result - "correct" or "wrong"
     * @param {number} data.latency - Time spent in seconds
     */
    function setInteraction(index, data) {
      var prefix = "cmi.interactions." + index;
      try {
        setValue(prefix + ".id", data.id || "q" + index);
        setValue(prefix + ".type", data.type || "choice");
        // SCORM 1.2 uses single letter patterns for MC: a, b, c, d
        setValue(prefix + ".student_response", data.studentResponse || "");
        setValue(prefix + ".correct_responses.0.pattern", data.correctResponse || "");
        setValue(prefix + ".result", data.result || "neutral");
        if (data.latency) {
          setValue(prefix + ".latency", secondsToSCORMTime(data.latency));
        }
        return true;
      } catch (e) {
        console.warn("[SCORM] Failed to set interaction " + index, e);
        return false;
      }
    }

    function isConnected() { return connected; }

    return {
      init: init,
      finish: finish,
      commit: commit,
      getValue: getValue,
      setValue: setValue,
      setStatus: setStatus,
      getStatus: getStatus,
      setScoreRaw: setScoreRaw,
      setSessionTimeSeconds: setSessionTimeSeconds,
      setInteraction: setInteraction,
      secondsToSCORMTime: secondsToSCORMTime,
      isConnected: isConnected,
      getAPI: getAPI
    };
  })();
  win.SCORM12 = SCORM12;
})(window);
