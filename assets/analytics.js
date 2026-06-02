(function () {
  var AMPLITUDE_API_KEY = "07552e3afc797ff87c3c97df0e9ebc5";
  var AMPLITUDE_SCRIPT_URL = "https://cdn.amplitude.com/script/" + AMPLITUDE_API_KEY + ".js";
  var isConfigured = AMPLITUDE_API_KEY && AMPLITUDE_API_KEY !== "AMPLITUDE_API_KEY";
  var initPromise;

  function pageProperties() {
    return {
      path: window.location.pathname,
      title: document.title,
      url: window.location.href.split("#")[0],
      referrer: document.referrer || null
    };
  }

  function classifyUrl(url) {
    if (url.indexOf("apps.apple.com") !== -1) return "app_store";
    if (url.indexOf("play.google.com") !== -1) return "google_play";
    if (url.indexOf("facebook.com") !== -1) return "facebook";
    if (url.indexOf("instagram.com") !== -1) return "instagram";
    if (url.indexOf("youtube.com") !== -1) return "youtube";
    if (url.indexOf("tiktok.com") !== -1) return "tiktok";
    return "external";
  }

  function loadAmplitude() {
    if (!isConfigured) return Promise.resolve(false);
    if (window.amplitude && window.amplitude.init) return Promise.resolve(true);

    return new Promise(function (resolve) {
      var script = document.createElement("script");
      script.async = true;
      script.src = AMPLITUDE_SCRIPT_URL;
      script.onload = function () {
        resolve(Boolean(window.amplitude && window.amplitude.init));
      };
      script.onerror = function () {
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  function ensureInitialized() {
    if (initPromise) return initPromise;

    initPromise = loadAmplitude().then(function (loaded) {
      if (!loaded) return false;

      window.amplitude.init(AMPLITUDE_API_KEY, {
        autocapture: false,
        fetchRemoteConfig: false
      });

      return true;
    });

    return initPromise;
  }

  function track(eventName, properties) {
    return ensureInitialized().then(function (ready) {
      var result;

      if (!ready || !window.amplitude || !window.amplitude.track) return false;

      result = window.amplitude.track(eventName, properties || {});
      if (result && result.promise && typeof result.promise.then === "function") {
        return result.promise.then(function () {
          return true;
        });
      }

      return true;
    }).catch(function () {
      return false;
    });
  }

  function trackAndContinue(eventName, properties, callback, timeoutMs) {
    var finished = false;
    var timeout = window.setTimeout(done, timeoutMs || 500);

    function done() {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      callback();
    }

    track(eventName, properties).then(done).catch(done);
  }

  function trackPageView() {
    track("Website Page Viewed", pageProperties());
  }

  function bindLinkTracking() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest && event.target.closest("a[href]");
      var url;
      var properties;

      if (!link) return;

      url = link.href || "";
      if (!/^https?:\/\//i.test(url)) return;
      if (url.indexOf(window.location.origin) === 0) return;

      properties = {
        destination_url: url,
        destination_type: classifyUrl(url),
        link_text: (link.textContent || "").trim(),
        path: window.location.pathname
      };

      track("Website Outbound Link Clicked", properties);
    });
  }

  window.MainLineAnalytics = {
    track: track,
    trackAndContinue: trackAndContinue,
    pageProperties: pageProperties
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      trackPageView();
      bindLinkTracking();
    });
  } else {
    trackPageView();
    bindLinkTracking();
  }
})();
