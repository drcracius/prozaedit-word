/**
 * Anonymous diagnostics ingest configuration.
 * Owner: set DIAGNOSTICS_INGEST_URL after deploying tools/diagnostics-ingest worker,
 * then add matching AppDomain in manifest.hosted.xml and bump manifest version.
 */
(function (global) {
  const ns = (global.ProzaEdit = global.ProzaEdit || {});

  /** Empty string = no network send (clipboard fallback only). */
  const DIAGNOSTICS_INGEST_URL = "";

  /** GitHub issue chooser when ingest is not configured (no client token). */
  const DIAGNOSTICS_GITHUB_ISSUES_URL =
    "https://github.com/drcracius/prozaedit-word/issues/new/choose";

  ns.DiagnosticsConfig = {
    DIAGNOSTICS_INGEST_URL,
    DIAGNOSTICS_GITHUB_ISSUES_URL,
    getBuildVersion() {
      try {
        if (typeof global.PROZAEDIT_BUILD_VERSION === "string" && global.PROZAEDIT_BUILD_VERSION) {
          return global.PROZAEDIT_BUILD_VERSION;
        }
      } catch (_) {}
      return "unknown";
    },
    ingestEnabled() {
      return typeof DIAGNOSTICS_INGEST_URL === "string" && DIAGNOSTICS_INGEST_URL.trim().length > 0;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
