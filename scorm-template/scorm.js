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
      secondsToSCORMTime: secondsToSCORMTime,
      isConnected: isConnected,
      getAPI: getAPI
    };
  })();
  win.SCORM12 = SCORM12;
})(window);
