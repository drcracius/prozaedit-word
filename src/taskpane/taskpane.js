/**
 * ProzaEdit Word Task Pane (Phases 1–7 integrated).
 * Release/build semver: PROZAEDIT_BUILD_VERSION — must match manifest.hosted.xml <Version>.
 */
const PROZAEDIT_BUILD_VERSION = "2.0.0.15";
const PROZAEDIT_MANIFEST_URL = "https://raw.githubusercontent.com/drcracius/prozaedit-word/main/manifest.hosted.xml";
const PROZAEDIT_UI_URL = "https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html";
const PROZAEDIT_ADDIN_ID = "d1829e3a-4931-4122-b911-37f22941aa99";
const GUARDRAILS = `OPERATIONAL MANDATES:
Zero plagiarism; original suggestions only.
Ban AI tropes: delve, tapestry, testament, beacon, nestled, moreover, furthermore, "it is important to note".
Natural human cadence; active voice.`;

const MAX_BODY = 1000000;
const MAX_CHAT = 3500;
const MAX_DEEP = 6000;
const MAX_AUDIT_CACHE_CHARS = 120000;
const MAX_PARAS = 15000;
const MAX_LOCAL_AUDIT_CHARS = 150000;
const MAX_LOCAL_AUDIT_FULL = 450000;

const MODULE_IDS = ["chkRep", "chkProp", "chkSpell", "chkAI", "mPlot", "mMotivation", "mDialogue", "mContinuity", "mPlausibility", "mPacing", "mSpoiler"];
const FICTION_MODULE_IDS = ["mPlot", "mMotivation", "mDialogue", "mContinuity", "mPlausibility", "mPacing", "mSpoiler"];

function isFictionManuscriptType(type) {
  return String(type != null ? type : getEl("manuscriptType")?.value || "").includes("Fiction");
}
const TAB_IDS = ["tab1", "tab2", "tab3", "tab4", "tab5", "tab6", "tab7"];

let recognition = null;
let isRecording = false;
let auditBusy = false;
let deepBusy = false;
let chatBusy = false;
let rewriteBusy = false;
let lastRewritePreview = "";
let lastRewriteOriginal = "";
let historyBusy = false;
let peStatusTimer = null;
let currentAuditSuggestions = [];
let auditCardFilter = "all";
let auditCardDisplayLimit = 300;
let auditCardSort = "priority";
let batchCancel = false;
let lastAuditExcerpt = "";
let lastAuditMeta = {};
let lastFeedbackLetter = "";
let lastDocStats = null;
let lastMiniScores = null;
let heatmapBusy = false;
let chronologyBusy = false;
let citationBusy = false;
let persistDebounceTimer = null;
let skipFullScanConfirm = false;
let msIndexCache = null;
let msIndexBusy = false;
let mciCache = null;
let mciBuildBusy = false;
let lastKnownParagraphTotal = null;
const MCI_AUTO_WARN_KEY = "pe-mci-auto-refresh-warn-ok";
let scopeChapterListCache = [];
let pendingSelectedChapterIndices = null;
let activeLongOp = null;
let pendingLongOpActionId = null;
let pendingLongOpRunner = null;
let pendingLongOpResolve = null;
let configFirstRunComplete = false;
let configOnboardingTourComplete = false;
let onboardingTourActiveStep = 0;
let onboardingTourPreviousFocus = null;
let lastAuditHadTruncation = false;
let lastAuditScopeModeAtRun = "";
let sessionAuditCompletedThisSession = false;
let muteDictionaryNudgeShownThisSession = false;
/** First word from last Mute action — Settings → Add from last Mute. */
let lastMutedDictionaryCandidate = "";

const AUDIT_PIN_FIELDS = [
  ["manuscriptType", "pinManuscriptType", true],
  ["scope", "pinScope", false],
  ["criticPersona", "pinCriticPersona", false],
];

const AUDIT_EMPTY_HTML = `<div class="audit-empty">
  <div class="audit-empty-icon" aria-hidden="true">📝</div>
  <p><strong>No audit yet</strong></p>
  <p>Turn on checks on <strong>Checks</strong>, then run audit here or from the toolbar.</p>
  <button type="button" class="btn-secondary pe-btn" onclick="showTab('tab3'); runPrimaryAudit();">Run audit from Checks</button>
  <button type="button" class="btn-secondary pe-btn" onclick="showTab('tab3')">Configure checks</button>
</div>`;

function peConfirm(message, options) {
  const opts =
    message && typeof message === "object"
      ? message
      : { message: String(message || ""), ...(options || {}) };
  if (ProzaEdit.ConfirmDialog?.show) return ProzaEdit.ConfirmDialog.show(opts);
  return Promise.resolve(false);
}

function isPeOverlayDialogOpen() {
  return (
    ProzaEdit.ConfirmDialog?.isOpen?.() ||
    !getEl("pe-settings-modal")?.classList.contains("hidden") ||
    !getEl("peOnboardingTour")?.classList.contains("hidden")
  );
}

async function confirmBeforeApply(actionLabel) {
  const el = document.getElementById("confirmBeforeApply");
  if (el && !el.checked) return true;
  return peConfirm({
    title: "Apply to Word?",
    message: `Apply this change to Word?\n\n${actionLabel}`,
    confirmLabel: "Apply",
    cancelLabel: "Cancel",
  });
}

function setupSafeHandlers() {
  const remember = document.getElementById("rememberApiKey");
  if (remember) {
    remember.addEventListener("change", () => {
      if (remember.checked) {
        showPeStatus("API key will be stored inside this Word document. Use only on your private PC.", "warn");
        try {
          alert("API key will be stored inside this Word document. Use only on your private PC.");
        } catch (_) {}
        schedulePersistSettings();
      } else {
        const keyEl = getEl("apiKey");
        if (keyEl) keyEl.value = "";
        persistSettings(false);
      }
    });
  }
  const keyEl = getEl("apiKey");
  if (keyEl && !keyEl.dataset.peAutosave) {
    keyEl.dataset.peAutosave = "1";
    keyEl.addEventListener("input", () => {
      if (isChecked("rememberApiKey", false)) schedulePersistSettings();
    });
  }
  const scope = document.getElementById("scope");
  if (scope) {
    scope.addEventListener("change", () => {
      syncScopePanels();
      updateActiveChecksHint();
      updateWorkflowStatusLine();
      updateFullManuscriptScopeTip();
      if (scope.value === "selected-chapters" || scope.value === "chapter" || scope.value === "chapter-range") {
        refreshChapterScopeLists();
      } else {
        refreshScopeCharPreview();
      }
      schedulePersistSettings();
      scheduleManuscriptIndexBuild(true);
    });
  }
  const dictFilter = getEl("dictFilter");
  if (dictFilter && !dictFilter.dataset.peBound) {
    dictFilter.dataset.peBound = "1";
    dictFilter.addEventListener("input", () => renderDictionaryList());
  }
}

function getScopeMode() {
  return getEl("scope")?.value || "selection";
}

function getScopeCharLimit(mode) {
  return ProzaEdit.ScopeReader?.getLimit?.(mode || getScopeMode()) || MAX_LOCAL_AUDIT_CHARS;
}

function getScopeOptions() {
  const indices = getSelectedChapterIndicesFromUi();
  const chapterFrom = indices.length ? indices[0] : 1;
  const chapterTo = indices.length ? indices[indices.length - 1] : 1;
  return {
    mode: getScopeMode(),
    pageFrom: getEl("scopePageFrom")?.value || 1,
    pageTo: getEl("scopePageTo")?.value || 5,
    chapterSingle: chapterFrom,
    chapterFrom,
    chapterTo,
    selectedChapterIndices: indices,
    chapters: scopeChapterListCache,
  };
}

function getSelectedChapterIndicesFromUi() {
  const boxes = document.querySelectorAll("#scopeChapterChecklist input[type=checkbox]");
  const out = [];
  boxes.forEach((el) => {
    if (el.checked) {
      const n = parseInt(el.value, 10);
      if (n > 0) out.push(n);
    }
  });
  return out.sort((a, b) => a - b);
}

function updateScopeChapterEmptyState() {
  const empty = getEl("scopeChapterEmptyState");
  if (!empty) return;
  const mode = getScopeMode();
  const show =
    mode === "selected-chapters" && scopeChapterListCache.length > 0 && !getSelectedChapterIndicesFromUi().length;
  empty.classList.toggle("hidden", !show);
}

function selectAllChapterChecks(on) {
  document.querySelectorAll("#scopeChapterChecklist input[type=checkbox]").forEach((el) => {
    el.checked = !!on;
  });
  updateScopeChapterEmptyState();
  refreshScopeCharPreview();
  schedulePersistSettings();
}

function renderChapterChecklist(list, selectedIndices) {
  const container = getEl("scopeChapterChecklist");
  if (!container) return;
  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML =
      '<p class="scope-chapter-empty">No Heading 1–3 chapters — apply heading styles, then Reload.</p>';
    return;
  }
  const normalized = ProzaEdit.ScopeReader.normalizeSelectedChapterIndices(selectedIndices, list);
  const defaultAll = !normalized.length;
  list.forEach((c) => {
    const label = document.createElement("label");
    label.className = "scope-chapter-check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.value = String(c.index);
    cb.checked = defaultAll || normalized.includes(c.index);
    const span = document.createElement("span");
    span.textContent = `${c.index}. ${c.title}`;
    label.appendChild(cb);
    label.appendChild(span);
    container.appendChild(label);
  });
}

function setupNarrowPaneClass() {
  const sync = () => {
    document.body.classList.toggle("pe-narrow-pane", window.innerWidth < 360);
  };
  sync();
  window.addEventListener("resize", sync);
}

function syncScopePanels() {
  const mode = getScopeMode();
  const pages = getEl("scopePagesPanel");
  const ch = getEl("scopeChapterPanel");
  const chapterModes = mode === "selected-chapters" || mode === "chapter" || mode === "chapter-range";
  if (pages) pages.classList.toggle("hidden", mode !== "pages");
  if (ch) ch.classList.toggle("hidden", !chapterModes);
  updateScopeChapterEmptyState();
  updateFullManuscriptScopeTip();
}

function updateFullManuscriptScopeTip() {
  const tip = getEl("peFullManuscriptScopeTip");
  if (!tip) return;
  const show = getScopeMode() === "full";
  tip.classList.toggle("hidden", !show);
}

function updateWorkflowNextStepHint() {
  const el = getEl("peWorkflowNextStep");
  if (!el) return;
  const show = ProzaEdit.Onboarding?.shouldShowWorkflowNextStep?.({
    sessionAuditCompleted: sessionAuditCompletedThisSession,
    hasAuditCards: currentAuditSuggestions.length > 0,
  });
  if (show) {
    el.textContent =
      "Next step: set scope on Target (or keep your highlight), open Checks if needed, then Run audit from the toolbar.";
  }
  el.classList.toggle("hidden", !show);
}

function markFirstRunCompleteAndPersist() {
  if (configFirstRunComplete) return;
  configFirstRunComplete = true;
  persistSettings(false);
  initSimpleModeFirstRunBanner();
}

function setupScopeUi() {
  syncScopePanels();
  const checklist = getEl("scopeChapterChecklist");
  if (checklist && !checklist.dataset.scopeBound) {
    checklist.dataset.scopeBound = "1";
    checklist.addEventListener("change", () => {
      updateScopeChapterEmptyState();
      refreshScopeCharPreview();
      schedulePersistSettings();
    });
  }
  ["scopePageFrom", "scopePageTo"].forEach((id) => {
    const el = getEl(id);
    if (el && !el.dataset.scopeBound) {
      el.dataset.scopeBound = "1";
      el.addEventListener("change", () => {
        schedulePersistSettings();
        refreshScopeCharPreview();
      });
    }
  });
  if (getScopeMode() === "selected-chapters" && !scopeChapterListCache.length) {
    refreshChapterScopeLists();
  }
}

function fillChapterSelects(list) {
  scopeChapterListCache = list || [];
  renderChapterChecklist(list, pendingSelectedChapterIndices);
  pendingSelectedChapterIndices = null;
  updateScopeChapterEmptyState();
}

function refreshChapterScopeLists() {
  return wordRun("ch-list", async (ctx) => {
    const list = await ProzaEdit.ScopeReader.listChapters(ctx);
    fillChapterSelects(list);
    if (!list.length) throw new Error("No chapters — apply Heading 1–3 to chapter titles.");
  })
    .then(() => {
      showPeStatus(`Found ${scopeChapterListCache.length} chapter(s).`, "ok");
      refreshScopeCharPreview();
    })
    .catch((e) => reportActionError(e, "read the chapter list"));
}

function updateScopeCharPreviewDisplay(charCount, label, mode) {
  const el = getEl("scopeCharPreview");
  if (!el) return;
  const limit = getScopeCharLimit(mode);
  const over = charCount > limit;
  const ok = !over && charCount > 0;
  el.classList.toggle("over-limit", over);
  el.classList.toggle("pe-scope-ok", ok);
  const fmt = charCount.toLocaleString();
  const lim = limit.toLocaleString();
  el.textContent = over
    ? `${label}: ~${fmt} characters — over limit (${lim}). Narrow scope or use section loop.`
    : `${label}: ~${fmt} characters (limit ${lim}).`;
  lastScopePreviewSummary =
    charCount > 0
      ? over
        ? `~${fmt} chars (over ${lim} limit)`
        : `~${fmt} chars (limit ${lim})`
      : "";
  updateWorkflowStatusLine();
}

function getScopeModeLabel(mode) {
  const m = mode || getScopeMode();
  if (m === "selection") return "Highlighted selection";
  if (m === "pages") {
    const from = getEl("scopePageFrom")?.value || "1";
    const to = getEl("scopePageTo")?.value || "5";
    return `Pages ${from}–${to} (approx.)`;
  }
  if (m === "selected-chapters" || m === "chapter" || m === "chapter-range") {
    const n = getSelectedChapterIndicesFromUi().length;
    if (m === "selected-chapters" && n) return `${n} chapter(s) selected`;
    return "Selected chapters";
  }
  if (m === "full") return "Full manuscript";
  return m;
}

function getScopeDisplayLabel(mode) {
  if (isChecked("simpleMode", false) && ProzaEdit.PlainLanguage?.scopeFriendlyLabel) {
    const m = mode || getScopeMode();
    return ProzaEdit.PlainLanguage.scopeFriendlyLabel(m, {
      pageFrom: getEl("scopePageFrom")?.value || "1",
      pageTo: getEl("scopePageTo")?.value || "5",
      chapterCount: getSelectedChapterIndicesFromUi().length,
    });
  }
  return getScopeModeLabel(mode);
}

function getActiveStyleGuideLabel() {
  const ctx = buildAuditContext();
  if (ProzaEdit.ManuscriptOverview?.styleGuideLabel) {
    return ProzaEdit.ManuscriptOverview.styleGuideLabel(ctx.styleGuideRef, ctx);
  }
  const ref = ctx.styleGuideRef || "auto";
  return ref === "auto" ? "Auto (language + type)" : ref;
}

function updateWorkflowStatusLine() {
  const line = getEl("peWorkflowStatusLine");
  if (!line) return;
  const mode = getScopeMode();
  const scopePart = getScopeModeLabel(mode);
  const charPart = lastScopePreviewSummary || "use Refresh count on Target for character estimate";
  const guidePart = getActiveStyleGuideLabel();
  line.textContent = `Guide: ${guidePart} · Scope: ${scopePart} — ${charPart}`;
  updateChecksScopeChip();
  updateWorkflowNextStepHint();
}

function updateChecksScopeChip() {
  const mode = getScopeMode();
  const scopeLabel = getScopeDisplayLabel(mode);
  const prefix = isChecked("simpleMode", false) ? "Checking:" : "Scope (read-only):";
  const text = `${prefix} ${scopeLabel}${lastScopePreviewSummary ? ` — ${lastScopePreviewSummary}` : ""}`;
  const chip = getEl("checksScopeChip");
  if (chip) chip.textContent = text;
  const auditChip = getEl("auditScopeChip");
  if (auditChip) auditChip.textContent = text;
}

function updateAuditTabBadge() {
  const badge = getEl("peAuditTabBadge");
  if (!badge) return;
  const n = currentAuditSuggestions.length;
  if (!n) {
    badge.textContent = "";
    badge.classList.add("hidden");
    return;
  }
  badge.textContent = String(n);
  badge.classList.remove("hidden");
  badge.setAttribute("aria-label", `${n} open issue${n === 1 ? "" : "s"}`);
}

function refreshScopeCharPreview() {
  if (auditBusy) {
    showPeStatus("Wait for audit to finish.", "warn");
    return Promise.resolve();
  }
  const mode = getScopeMode();
  if (mode === "selected-chapters" || mode === "chapter" || mode === "chapter-range") {
    if (!scopeChapterListCache.length) {
      updateScopeCharPreviewDisplay(0, "Chapters not loaded", mode);
      return refreshChapterScopeLists();
    }
    if (mode === "selected-chapters" && !getSelectedChapterIndicesFromUi().length) {
      updateScopeCharPreviewDisplay(0, "No chapters selected", mode);
      updateScopeChapterEmptyState();
      return Promise.resolve();
    }
  }
  return wordRun("scope-measure", async (ctx) => {
    const opts = getScopeOptions();
    const result = await ProzaEdit.ScopeReader.measureScope(ctx, opts);
    return { len: (result.text || "").length, label: result.label || mode };
  })
    .then(({ len, label }) => updateScopeCharPreviewDisplay(len, label, mode))
    .catch((e) => {
      const el = getEl("scopeCharPreview");
      if (el) {
        el.textContent = wordRecoveryMessage(e, "measure this scope");
        el.classList.add("over-limit");
        el.classList.remove("pe-scope-ok");
      }
    });
}

let msIndexTimer = null;
let msIndexBuildToken = 0;

function scheduleManuscriptIndexBuild(force) {
  if (force) {
    if (msIndexTimer) clearTimeout(msIndexTimer);
    msIndexTimer = setTimeout(() => {
      msIndexTimer = null;
      if (msIndexBusy || isOperationBusy()) {
        scheduleManuscriptIndexBuild(true);
        return;
      }
      buildManuscriptIndexNow();
    }, 1500);
    return;
  }
  if (msIndexBusy || isOperationBusy()) return;
  buildManuscriptIndexNow();
}

function buildManuscriptIndexNow() {
  const token = ++msIndexBuildToken;
  msIndexBusy = true;
  const statusEl = getEl("peWorkflowStatusLine");
  const priorStatus = statusEl?.textContent || "";
  const scopeMode = getScopeMode();
  const indexScoped = scopeMode !== "full";
  wordRun("ms-index", async (ctx) => {
    const cancelCheck = () => {
      if (token !== msIndexBuildToken) {
        const err = new Error("Cancelled.");
        err.code = "PE_CANCELLED";
        err.name = "ProzaEditCancelledError";
        throw err;
      }
    };
    const onProgress = (partial) => {
      if (token !== msIndexBuildToken || activeLongOp) return;
      if (statusEl) {
        statusEl.textContent = ProzaEdit.ScopeReader.formatReadStatus({
          phase: indexScoped ? "Building scoped index" : "Building manuscript index",
          ...partial,
        });
      }
    };
    if (scopeMode === "full") {
      return ProzaEdit.ScopeReader.readBodyTextChunked(ctx, {
        maxChars: 600000,
        cancelCheck,
        onProgress,
      });
    }
    const opts = getScopeOptions();
    if (opts.mode === "selected-chapters" || opts.mode === "chapter" || opts.mode === "chapter-range") {
      opts.chapters = scopeChapterListCache;
    }
    opts.cancelCheck = cancelCheck;
    opts.onProgress = onProgress;
    opts.maxChars = 600000;
    const measured = await ProzaEdit.ScopeReader.measureScope(ctx, opts);
    return measured.text || "";
  })
    .then((text) => {
      if (token !== msIndexBuildToken) return;
      if (!text || text.length < 200) return;
      msIndexCache = ProzaEdit.ContinuityGuard.buildIndex(text);
      return ProzaEdit.Settings.setAsync(ProzaEdit.ContinuityGuard.KEYS.INDEX, JSON.stringify(msIndexCache));
    })
    .catch((e) => {
      if (isLongOpCancelledError(e) || e?.code === "PE_CANCELLED") return;
    })
    .finally(() => {
      if (token === msIndexBuildToken) msIndexBusy = false;
      if (statusEl && !activeLongOp && String(statusEl.textContent || "").includes("Building manuscript index")) {
        statusEl.textContent = priorStatus;
      }
    });
}

function resetAuditCardDisplayLimit() {
  auditCardDisplayLimit = ProzaEdit.AuditReview?.MAX_RENDERED_CARDS || 300;
}

function loadMoreAuditCards() {
  const step = ProzaEdit.AuditReview?.LOAD_MORE_STEP || 100;
  const list = filteredAuditSuggestions();
  auditCardDisplayLimit = Math.min(list.length, auditCardDisplayLimit + step);
  applyAuditCardFilter({ preserveDisplayLimit: true });
}

function getManuscriptIndex() {
  if (msIndexCache) return msIndexCache;
  try {
    const raw = ProzaEdit.Settings.get(ProzaEdit.ContinuityGuard.KEYS.INDEX, null);
    if (raw) msIndexCache = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_) {}
  return msIndexCache;
}

function getManuscriptContextIndex() {
  if (mciCache) return mciCache;
  try {
    const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG);
    const cfg = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    if (cfg?.manuscriptContext && ProzaEdit.ManuscriptContextIndex?.normalizeStored) {
      mciCache = ProzaEdit.ManuscriptContextIndex.normalizeStored(cfg.manuscriptContext);
    }
  } catch (_) {}
  return mciCache;
}

function setManuscriptContextIndex(index) {
  mciCache = ProzaEdit.ManuscriptContextIndex?.normalizeStored?.(index) || null;
  refreshManuscriptContextStatusUi();
}

async function refreshDocumentParagraphCount() {
  try {
    const n = await wordRun("mci-para-count", async (ctx) => {
      const paras = ctx.document.body.paragraphs;
      paras.load("items");
      await ctx.sync();
      return paras.items.length;
    });
    lastKnownParagraphTotal = n;
    return n;
  } catch (_) {
    return lastKnownParagraphTotal;
  }
}

function refreshManuscriptContextStatusUi() {
  const MCI = ProzaEdit.ManuscriptContextIndex;
  if (!MCI?.formatStatusBadge) return;
  const pt = lastKnownParagraphTotal;
  const badge = MCI.formatStatusBadge(getManuscriptContextIndex(), pt);
  const storage = MCI.formatStorageBlurb(getManuscriptContextIndex());
  ["peMciStatusTarget", "peMciStatusChecks", "peMciStatusSimple", "peMciStatusSettings"].forEach((id) => {
    const el = getEl(id);
    if (!el) return;
    el.textContent = badge.text;
    el.classList.remove("pe-mci-ready", "pe-mci-stale");
    el.classList.add(badge.className || "pe-mci-stale");
  });
  const hintTarget = getEl("peMciStorageHintTarget");
  if (hintTarget) hintTarget.textContent = storage;
  const hintSettings = getEl("peMciStorageHintSettings");
  if (hintSettings) hintSettings.textContent = storage;
}

async function confirmBuildManuscriptContext() {
  const storageHint = ProzaEdit.ManuscriptContextIndex?.formatStorageBlurb?.(getManuscriptContextIndex()) || "local document settings";
  return peConfirm({
    title: "Build full manuscript context?",
    message:
      `ProzaEdit will read your document in the background (chunked sections) to build a lightweight story-arc and continuity index for Coach, Rewrite, and chapter-scoped audits.\n\n` +
      `This may take several minutes on long manuscripts. You can Cancel, keep using Word, or stop anytime from the banner.\n\n` +
      `Nothing is sent to the cloud unless you use Gemini. Index size: ${storageHint}.`,
    confirmLabel: "Start background read",
    cancelLabel: "Cancel",
  });
}

async function runBuildFullManuscriptContext(userInitiated) {
  if (mciBuildBusy || isOperationBusy()) {
    warnOperationBusy();
    return false;
  }
  if (userInitiated && !(await confirmBuildManuscriptContext())) return false;

  mciBuildBusy = true;
  let longOp = null;
  let cancelled = false;
  try {
    longOp = beginLongOperation({
      initialStatus: "Reading manuscript for context…",
      setStatus: (msg) => showPeStatus(msg),
    });
    const index = await wordRun("mci-build", async (ctx) => {
      return ProzaEdit.ManuscriptContextIndex.buildFromDocument(ctx, {
        cancelCheck: () => longOp.throwIfCancelled(),
        onProgress: (partial) => {
          longOp.setStatus(ProzaEdit.ManuscriptContextIndex.formatBuildProgress(partial));
        },
        dictionary: ProzaEdit.Settings.getDictionary(),
        fiction: isFictionManuscriptType(),
        yieldFn: () => ProzaEdit.ScopeReader.microYield(),
      });
    });
    if (!index) throw new Error("Could not build manuscript context.");
    setManuscriptContextIndex(index);
    lastKnownParagraphTotal = index.paragraphTotal;
    applyUiConfig({ ...collectUiConfig(), manuscriptContext: index });
    await persistSettings(false);
    const msg = index.truncated
      ? "Full MS context ready (sampled — very long document)."
      : "Full MS context ready.";
    showPeStatus(msg, "ok");
    return true;
  } catch (e) {
    if (isLongOpCancelledError(e)) {
      cancelled = true;
      showPeStatus("Manuscript context build cancelled.", "warn");
      return false;
    }
    reportActionError(e, "build full manuscript context");
    return false;
  } finally {
    mciBuildBusy = false;
    endLongOperation(longOp);
    refreshManuscriptContextStatusUi();
    if (!cancelled) scheduleManuscriptIndexBuild(true);
  }
}

async function maybeAutoRefreshManuscriptContextBeforeAudit() {
  if (!isChecked("autoRefreshManuscriptContext", false)) return true;
  const pt = (await refreshDocumentParagraphCount()) ?? lastKnownParagraphTotal;
  const MCI = ProzaEdit.ManuscriptContextIndex;
  if (!MCI?.isStale?.(getManuscriptContextIndex(), pt)) return true;
  try {
    if (localStorage.getItem(MCI_AUTO_WARN_KEY) !== "1") {
      const ok = await peConfirm({
        title: "Refresh manuscript context?",
        message:
          "Auto-refresh is on and your full-manuscript context is stale or missing.\n\nProzaEdit will run a background read before this audit. Cancel to skip the audit.",
        confirmLabel: "Refresh & continue",
        cancelLabel: "Cancel audit",
      });
      if (!ok) return false;
      localStorage.setItem(MCI_AUTO_WARN_KEY, "1");
    }
  } catch (_) {}
  return runBuildFullManuscriptContext(false);
}

function appendManuscriptContextToProfile(baseProfile) {
  const MCI = ProzaEdit.ManuscriptContextIndex;
  if (!MCI?.injectPromptBlock) return baseProfile;
  const block = MCI.injectPromptBlock(getManuscriptContextIndex(), {
    paragraphTotal: lastKnownParagraphTotal,
    scopeMode: getScopeMode(),
    allowStale: false,
  });
  if (!block) return baseProfile;
  return `${baseProfile}\n\n${block}`;
}

function fictionModulesActive() {
  return FICTION_MODULE_IDS.some((id) => isModuleEnabled(id));
}

function scopeCoversFullManuscript() {
  const mode = getScopeMode();
  if (mode === "full") return true;
  if (!scopeChapterListCache.length) return false;
  if (mode === "selected-chapters") {
    const sel = getSelectedChapterIndicesFromUi();
    const all = scopeChapterListCache.map((c) => c.index);
    return sel.length === all.length && sel.every((v, i) => v === all[i]);
  }
  return false;
}

function getEl(id) {
  return document.getElementById(id);
}

function isChecked(id, defaultVal) {
  const el = getEl(id);
  return el ? !!el.checked : !!defaultVal;
}

let settingsModalReturnFocus = null;
let rewriteFromAuditSession = false;
let lastScopePreviewSummary = "";

const AUDIT_FILTER_LABELS = {
  all: "All",
  confirmed: "Critical",
  preference: "Style",
  styleguide: "Style guide",
};

function auditFilterDisplayLabel(mode) {
  const key = String(mode || "all");
  if (ProzaEdit.PlainLanguage?.auditFilterUserLabel) {
    return ProzaEdit.PlainLanguage.auditFilterUserLabel(key, isChecked("simpleMode", false));
  }
  return AUDIT_FILTER_LABELS[key] || "All";
}

function setupSettingsModal() {
  const modal = getEl("pe-settings-modal");
  if (!modal || modal.dataset.bound) return;
  modal.dataset.bound = "1";
  modal.addEventListener("keydown", (e) => {
    if (modal.classList.contains("hidden")) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeSettingsModal();
      return;
    }
    if (e.key === "Tab") trapFocusInSettingsModal(e, modal);
  });
  modal.querySelectorAll("[data-pe-settings-close]").forEach((el) => {
    el.addEventListener("click", () => closeSettingsModal());
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || e.defaultPrevented || modal.classList.contains("hidden")) return;
    if (ProzaEdit.ConfirmDialog?.isOpen?.()) return;
    if (!getEl("peOnboardingTour")?.classList.contains("hidden")) return;
    e.preventDefault();
    closeSettingsModal();
  });
  modal.querySelectorAll("[data-pe-settings-reset]").forEach((btn) => {
    if (btn.dataset.resetBound) return;
    btn.dataset.resetBound = "1";
    btn.addEventListener("click", () => {
      void resetSettingsGroup(btn.dataset.peSettingsReset);
    });
  });
}

function setupTabAria() {
  const tabs = [...document.querySelectorAll(".tab-btn[data-pe-tab]")];
  tabs.forEach((btn) => {
    const id = btn.dataset.peTab;
    if (!btn.id) btn.id = `peTabBtn-${id}`;
    btn.setAttribute("aria-controls", id);
    const panel = getEl(id);
    if (panel && !panel.hasAttribute("aria-labelledby")) panel.setAttribute("aria-labelledby", btn.id);
    if (!btn.hasAttribute("aria-selected")) btn.setAttribute("aria-selected", btn.classList.contains("active") ? "true" : "false");
  });
  const list = document.querySelector('.nav-tabs[role="tablist"]');
  if (!list || list.dataset.peKeys) return;
  list.dataset.peKeys = "1";
  list.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const visible = tabs.filter((b) => !b.hidden && b.offsetParent !== null && !b.closest(".hidden"));
    const current = visible.indexOf(document.activeElement);
    if (current < 0 || !visible.length) return;
    let next = current;
    if (e.key === "ArrowRight") next = (current + 1) % visible.length;
    else if (e.key === "ArrowLeft") next = (current - 1 + visible.length) % visible.length;
    else if (e.key === "Home") next = 0;
    else next = visible.length - 1;
    e.preventDefault();
    visible[next].focus();
    showTab(visible[next].dataset.peTab);
  });
}

function trapFocusInSettingsModal(e, modal) {
  const dialog = modal.querySelector(".pe-settings-dialog");
  trapFocusWithin(e, dialog);
}

function trapFocusWithin(e, container) {
  if (!container) return;
  const focusable = [...container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((el) => !el.closest(".hidden") && (el.offsetParent !== null || el === document.activeElement));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function decorateSettingsBackIcon() {
  const back = getEl("btn-settings-back");
  if (!back || back.dataset.iconDecorated) return;
  back.dataset.iconDecorated = "1";
  const icon = ProzaEdit.PeIcons?.svg?.("chevron-left");
  if (icon) back.insertAdjacentHTML("afterbegin", icon);
}

let peThemeMediaQuery = null;

function systemPrefersDark() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch (_) {
    return false;
  }
}

function getThemePreferenceFromUi() {
  const checked = document.querySelector('input[name="themePreference"]:checked');
  return ProzaEdit.UiPrefs?.validateThemePreference?.(checked?.value) || "light";
}

function setThemePreferenceInUi(pref) {
  const v = ProzaEdit.UiPrefs?.validateThemePreference?.(pref) || "light";
  document.querySelectorAll('input[name="themePreference"]').forEach((el) => {
    el.checked = el.value === v;
  });
}

function applyPeTheme(themePreference) {
  const pref =
    themePreference != null
      ? ProzaEdit.UiPrefs?.validateThemePreference?.(themePreference)
      : getThemePreferenceFromUi();
  const effective = ProzaEdit.UiPrefs?.resolveEffectiveTheme?.(pref, systemPrefersDark()) || "light";
  document.documentElement.setAttribute("data-pe-theme", effective);
  initDarkAppearanceTip();
}

function setupThemePreference() {
  applyPeTheme(getThemePreferenceFromUi());
  if (document.body.dataset.peThemeBound) return;
  document.body.dataset.peThemeBound = "1";
  document.querySelectorAll('input[name="themePreference"]').forEach((el) => {
    el.addEventListener("change", () => {
      applyPeTheme(getThemePreferenceFromUi());
      schedulePersistSettings();
    });
  });
  try {
    peThemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (getThemePreferenceFromUi() === "system") applyPeTheme("system");
    };
    if (peThemeMediaQuery.addEventListener) peThemeMediaQuery.addEventListener("change", onSystemChange);
    else if (peThemeMediaQuery.addListener) peThemeMediaQuery.addListener(onSystemChange);
  } catch (_) {}
}

const PE_SETTINGS_GROUP_IDS = {
  essentials: "pe-settings-group-essentials",
  safety: "pe-settings-group-safety",
  onboarding: "pe-settings-group-onboarding",
  appearance: "pe-settings-group-appearance",
  audit: "pe-settings-group-audit",
  privacy: "pe-settings-group-privacy",
  reference: "pe-settings-group-reference",
  dictionary: "pe-settings-group-dictionary",
  manuscript: "pe-settings-group-manuscript",
  "custom-style": "pe-settings-group-custom-style",
};

function expandSettingsGroup(key) {
  const norm = ProzaEdit.UiPrefs?.normalizeSettingsSection?.(key) || key;
  if (norm === "appearance") expandSettingsGroup("essentials");
  const id = PE_SETTINGS_GROUP_IDS[norm];
  const el = id ? getEl(id) : null;
  if (el && el.tagName === "DETAILS") el.open = true;
}

function collapseSettingsGroupsToEssentials() {
  document.querySelectorAll(".pe-settings-group").forEach((group) => {
    group.open = group.id === "pe-settings-group-essentials";
  });
}

function syncOnboardingTogglesFromPersistedConfig() {
  const flags = ProzaEdit.Onboarding?.readOnboardingFlagsFromConfig?.(
    ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG)
  );
  if (!flags) return;
  ProzaEdit.Onboarding?.ONBOARDING_CONFIG_KEYS?.forEach((key) => {
    if (typeof flags[key] !== "boolean") return;
    const el = getEl(key);
    if (el) el.checked = flags[key];
  });
}

function refreshSettingsLinkedHints() {
  applySimpleMode();
  updateAuditReportDepthHint();
  updateAuditDefaultFilterHint();
  updateCustomRulesSummary();
  applyHoverTips();
}

function hideOnboardingBanner(bannerId) {
  const el = bannerId ? getEl(bannerId) : null;
  if (el) el.classList.add("hidden");
}

function dismissLongOpWarningBanner() {
  hideOnboardingBanner("peLongOpWarningBanner");
  const settle = pendingLongOpResolve;
  pendingLongOpResolve = null;
  pendingLongOpActionId = null;
  pendingLongOpRunner = null;
  if (settle) settle(false);
}

function sessionDismissLongOpAction(actionId) {
  const key = ProzaEdit.LongOp?.sessionDismissKey?.(actionId);
  if (!key) return;
  try {
    sessionStorage.setItem(key, "1");
  } catch (_) {}
}

function readShowLongOperationWarningsPref() {
  return ProzaEdit.LongOp?.readShowWarningsFromConfig?.(ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG));
}

function shouldWarnLongOperation(actionId) {
  if (!actionId) return false;
  return ProzaEdit.LongOp?.shouldShowLongOperationWarning?.({
    showLongOperationWarnings: readShowLongOperationWarningsPref(),
    actionId,
    sessionGet: (k) => {
      try {
        return sessionStorage.getItem(k);
      } catch (_) {
        return null;
      }
    },
  });
}

function runAfterLongOperationWarning(actionId, runner) {
  if (!shouldWarnLongOperation(actionId)) {
    return Promise.resolve().then(runner);
  }
  return new Promise((resolve) => {
    dismissLongOpWarningBanner();
    pendingLongOpActionId = actionId;
    pendingLongOpResolve = resolve;
    pendingLongOpRunner = () => {
      pendingLongOpResolve = null;
      dismissLongOpWarningBanner();
      resolve(Promise.resolve().then(runner));
    };
    const banner = getEl("peLongOpWarningBanner");
    const body = getEl("peLongOpWarningBody");
    if (body) body.textContent = ProzaEdit.LongOp?.warningCopyForAction?.(actionId) || "";
    if (banner) banner.classList.remove("hidden");
  });
}

function setupLongOpWarningBanner() {
  getEl("btnLongOpContinue")?.addEventListener("click", () => {
    const run = pendingLongOpRunner;
    if (run) run();
    else dismissLongOpWarningBanner();
  });
  getEl("btnLongOpNotNow")?.addEventListener("click", () => {
    if (pendingLongOpActionId) sessionDismissLongOpAction(pendingLongOpActionId);
    dismissLongOpWarningBanner();
  });
  getEl("btnLongOpDontShowAgain")?.addEventListener("click", () => {
    const cb = getEl("showLongOperationWarnings");
    if (cb) cb.checked = false;
    persistSettings(false);
    dismissLongOpWarningBanner();
  });
}

let longOpFocusReturn = null;
let batchRunning = false;
let auditStarting = false;
let settingsSaveWarned = false;

function isOperationBusy(ignoreBatch) {
  return !!(
    auditBusy ||
    deepBusy ||
    heatmapBusy ||
    chronologyBusy ||
    citationBusy ||
    chatBusy ||
    rewriteBusy ||
    (batchRunning && !ignoreBatch) ||
    auditStarting
  );
}

function warnOperationBusy() {
  if (pendingLongOpRunner) {
    showPeStatus("Choose Continue or Not now on the long-operation notice first.", "warn");
    return;
  }
  showPeStatus("Another ProzaEdit operation is still running. Cancel it or wait for it to finish.", "warn");
}

function setLongOpProgressVisible(visible, label) {
  const bar = getEl("peOpBar");
  const lbl = getEl("peOpBarLabel");
  const cancel = getEl("btnCancelLongOp");
  if (bar) {
    bar.classList.toggle("hidden", !visible);
    bar.setAttribute("aria-busy", visible ? "true" : "false");
  }
  const cancelling = !!(visible && activeLongOp?.isCancelled?.());
  if (lbl && label && !cancelling) lbl.textContent = label;
  if (cancel && !cancelling) cancel.disabled = false;
  ["tab3", "tab4", "cardContainer", "summaryReport"].forEach((id) => {
    getEl(id)?.setAttribute("aria-busy", visible ? "true" : "false");
  });
  const auditBtns = [getEl("btnRunAudit"), getEl("btnAuditPrimary")];
  const focusSensitive = [...auditBtns, document.querySelector(".pe-toolbar .btn-tool-accent")];
  const focusWasOnAuditBtn = !!document.activeElement && focusSensitive.includes(document.activeElement);
  if (visible && focusWasOnAuditBtn) longOpFocusReturn = document.activeElement;
  auditBtns.forEach((b) => {
    if (!b) return;
    b.classList.toggle("hidden", !!visible);
    b.disabled = !!visible;
  });
  if (visible && focusWasOnAuditBtn && cancel) cancel.focus({ preventScroll: true });
}

function beginLongOperation(hooks) {
  endLongOperation(null);
  const controller = ProzaEdit.LongOperationController.create({
    setStatus: (msg) => {
      hooks?.setStatus?.(msg);
      setLongOpProgressVisible(true, msg);
    },
    onCancel: () => hooks?.onCancel?.(),
  });
  activeLongOp = controller;
  setLongOpProgressVisible(true, hooks?.initialStatus || "Working…");
  return controller;
}

function endLongOperation(controller) {
  if (controller && activeLongOp && activeLongOp !== controller) return;
  activeLongOp = null;
  setLongOpProgressVisible(false);
  const auditBtns = [getEl("btnRunAudit"), getEl("btnAuditPrimary")];
  auditBtns.forEach((b) => {
    if (b) {
      b.classList.remove("hidden");
      b.disabled = false;
    }
  });
  const ret = longOpFocusReturn;
  longOpFocusReturn = null;
  const active = document.activeElement;
  if (ret && (!active || active === document.body || active.id === "btnCancelLongOp")) {
    try {
      ret.focus({ preventScroll: true });
    } catch (_) {}
  }
}

function requestLongOpCancel() {
  const op = activeLongOp;
  if (!op && !batchRunning) return;
  if (batchRunning) batchCancel = true;
  op?.cancel?.();
  const button = getEl("btnCancelLongOp");
  const label = getEl("peOpBarLabel");
  if (button) button.disabled = true;
  if (label) label.textContent = "Cancelling…";
  showPeStatus("Cancelling after the current Word step…", "warn");
}

function setupLongOpCancelButtons() {
  const button = getEl("btnCancelLongOp");
  if (!button || button.dataset.peBound) return;
  button.dataset.peBound = "1";
  button.addEventListener("click", requestLongOpCancel);
  if (!document.body.dataset.peEscCancel) {
    document.body.dataset.peEscCancel = "1";
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!activeLongOp) return;
      if (isPeOverlayDialogOpen()) return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      requestLongOpCancel();
    });
  }
}

function isLongOpCancelledError(err) {
  return ProzaEdit.LongOperationController?.isCancelledError?.(err);
}

let peRetryController = null;

function getRetryController() {
  if (!peRetryController && ProzaEdit.Recovery?.createRetryController) {
    peRetryController = ProzaEdit.Recovery.createRetryController({ onChange: renderRetryBar });
  }
  return peRetryController;
}

function renderRetryBar(state) {
  const bar = getEl("peRetryBar");
  if (!bar) return;
  const label = getEl("peRetryBarLabel");
  const btn = getEl("btnPeRetry");
  if (!state) {
    const hadFocus = bar.contains(document.activeElement);
    bar.classList.add("hidden");
    if (hadFocus) document.querySelector(".tab-btn.active")?.focus?.({ preventScroll: true });
    return;
  }
  bar.classList.remove("hidden");
  if (label) label.textContent = `${state.label} did not finish.`;
  if (btn) {
    btn.disabled = !!state.busy;
    btn.setAttribute("aria-label", `Try again: ${state.label}`);
    btn.setAttribute("aria-busy", state.busy ? "true" : "false");
  }
}

function registerRetry(label, run) {
  getRetryController()?.set(label, run);
}

function clearRetry() {
  getRetryController()?.clear();
}

function setupRetryBar() {
  const btn = getEl("btnPeRetry");
  if (btn && !btn.dataset.peBound) {
    btn.dataset.peBound = "1";
    btn.addEventListener("click", () => {
      getRetryController()?.retry();
    });
  }
  const dismiss = getEl("btnPeRetryDismiss");
  if (dismiss && !dismiss.dataset.peBound) {
    dismiss.dataset.peBound = "1";
    dismiss.addEventListener("click", () => clearRetry());
  }
}

/**
 * Structured failure reporting: recovery copy in the status line (no modal alert), optional Try again.
 * @param {{ label: string, run: function(): Promise<*> }} [options.retry]
 */
function reportActionError(err, action, options) {
  options = options || {};
  if (isLongOpCancelledError(err)) {
    showPeStatus("Cancelled.", "warn");
    return { cancelled: true, message: "Cancelled.", canRetry: false };
  }
  const message = wordRecoveryMessage(err, action);
  const canRetry = !!(options.retry && ProzaEdit.AuditReview?.isRetryable?.(err));
  if (canRetry) registerRetry(options.retry.label, options.retry.run);
  showPeStatus(canRetry ? `${message} Use Try again to repeat it.` : message, "warn");
  return { cancelled: false, message, canRetry };
}

function showGlobalError(note) {
  const box = getEl("peGlobalError");
  if (!box) return;
  const msg = getEl("peGlobalErrorMessage");
  const detail = getEl("peGlobalErrorDetail");
  if (msg) msg.textContent = note?.message || ProzaEdit.ErrorGuard?.USER_MESSAGE || "Something went wrong.";
  if (detail) {
    const extra = note?.suppressed ? ` (${note.suppressed} similar error${note.suppressed === 1 ? "" : "s"} hidden)` : "";
    detail.textContent = note?.detail ? `${note.detail}${extra}` : extra.trim();
  }
  box.classList.remove("hidden");
}

function ensureControlsUsable() {
  if (isOperationBusy()) return;
  const barVisible = !getEl("peOpBar")?.classList.contains("hidden");
  if (barVisible || activeLongOp) {
    activeLongOp = null;
    endLongOperation(null);
  }
  setModuleButtonsDisabled(false);
}

function setupGlobalErrorGuard() {
  ProzaEdit.ErrorGuard?.bind?.(window, { notify: showGlobalError, onFatal: ensureControlsUsable });
  const reload = getEl("btnPeGlobalErrorReload");
  if (reload && !reload.dataset.peBound) {
    reload.dataset.peBound = "1";
    reload.addEventListener("click", () => {
      try {
        location.reload();
      } catch (_) {}
    });
  }
  const dismiss = getEl("btnPeGlobalErrorDismiss");
  if (dismiss && !dismiss.dataset.peBound) {
    dismiss.dataset.peBound = "1";
    dismiss.addEventListener("click", () => getEl("peGlobalError")?.classList.add("hidden"));
  }
  setupRetryBar();
}

function setupSettingsKeywordFilter() {
  const input = getEl("peSettingsFilter");
  if (!input || input.dataset.bound) return;
  input.dataset.bound = "1";
  const run = () => {
    const q = String(input.value || "")
      .trim()
      .toLowerCase();
    document.querySelectorAll(".pe-settings-group").forEach((group) => {
      const summary = group.querySelector("summary");
      const text = (summary?.textContent || "").toLowerCase();
      const body = group.textContent?.toLowerCase() || "";
      const match = !q || text.includes(q) || body.includes(q);
      group.classList.toggle("pe-settings-filter-hidden", !match);
      if (match && q) group.open = true;
    });
  };
  input.addEventListener("input", run);
}

function permanentOffOnboardingPref(prefKey, bannerId) {
  const cb = getEl(prefKey);
  if (cb) cb.checked = false;
  hideOnboardingBanner(bannerId);
  ProzaEdit.Onboarding?.clearSessionDismissForPref?.(prefKey);
  return persistSettings(false);
}

function openSettingsModal(focusGroup) {
  const modal = getEl("pe-settings-modal");
  if (!modal) return;
  decorateSettingsBackIcon();
  syncOnboardingTogglesFromPersistedConfig();
  refreshSettingsLinkedHints();
  settingsModalReturnFocus = document.activeElement;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("pe-settings-open");
  const norm = focusGroup ? ProzaEdit.UiPrefs?.normalizeSettingsSection?.(focusGroup) : null;
  const customGroup = getEl("pe-settings-group-custom-style");
  if (customGroup && !norm) {
    const n = ProzaEdit.Settings.getCustomStyleGuide().rules?.length || 0;
    if (n > 0 || isCustomStyleGuideMode()) customGroup.open = true;
  }
  if (norm) expandSettingsGroup(norm);
  else collapseSettingsGroupsToEssentials();
  try {
    const hash = ProzaEdit.UiPrefs?.settingsHashForSection?.(norm || focusGroup);
    if (hash) history.replaceState(null, "", hash);
  } catch (_) {}
  getEl("btn-settings-back")?.focus();
}

function saveSettingsAndClose() {
  persistSettings(false).then((ok) => {
    if (ok) showPeStatus("Settings saved.", "ok");
    closeSettingsModal();
  });
}

function closeSettingsModal() {
  const modal = getEl("pe-settings-modal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pe-settings-open");
  try {
    if (location.hash.startsWith("#pe-settings-")) history.replaceState(null, "", location.pathname + location.search);
  } catch (_) {}
  const ret = settingsModalReturnFocus;
  settingsModalReturnFocus = null;
  if (ret && typeof ret.focus === "function") ret.focus();
  else getEl("btn-settings-open")?.focus();
}

let prozaEditBooted = false;
const PROZAEDIT_BOOT_TIMEOUT_MS = 20000;

function showBootProblem(message) {
  try {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<p class="pe-boot-problem" role="alert" style="color:#d93025;">${escapeHtml(message)}</p>`
    );
  } catch (_) {}
}

function onProzaEditOfficeReady(info) {
  prozaEditBooted = true;
  if (typeof Office === "undefined") {
    showBootProblem("Office.js failed to load. Check network and reload.");
    return;
  }
  if (info?.host !== Office.HostType?.Word) {
    showBootProblem("Open ProzaEdit inside Microsoft Word.");
    return;
  }
  try {
    loadSavedSettings();
    migrateLegacySessionTipsOnInit();
    adaptModules();
    renderDictionaryList();
    loadCustomStyleUi();
    toggleCustomStylePanel();
    setupChatTokenEstimate();
    setupSafeHandlers();
    initSpeechRecognition();
    setupEnterKeyHandler();
    setupThesaurusDelegation();
    setupUndoRedoShortcuts();
    setupAuditPins();
    setupScopeUi();
    setupMainTargetSync();
    setupAutoSaveHandlers();
    setupSettingsModal();
    setupTabAria();
    setupThemePreference();
    setupLongOpWarningBanner();
    setupLongOpCancelButtons();
    setupRunAuditHubButtons();
    setupShaperSliderPersistence();
    setupSettingsKeywordFilter();
    bindWorkflowStepper();
    bindWorkflowCrossNavDelegation();
    restoreLastActiveTab();
    updateWorkflowCrossNav(getCurrentActiveTabId() || "tab1");
    updateUndoRedoUi();
    updateAuditFilterChips();
    updateAuditSortChips();
    applySimpleMode();
    maybeDefaultAuditFilterForSimple();
    maybeDefaultAuditFilterForReviewMode();
    updateReviewModeAuditHint();
    syncShaperSliderLabels();
    applyHoverTips();
    updateActiveChecksHint();
    updateAuditReportDepthHint();
    updateAuditDefaultFilterHint();
    syncSettingsDefaultAuditFilterSelect();
    try {
      skipFullScanConfirm = sessionStorage.getItem("PROZAEDIT_FULL_OK") === "1";
    } catch (_) {}
    const sm = getEl("simpleMode");
    if (sm && !sm.dataset.bound) {
      sm.dataset.bound = "1";
      sm.addEventListener("change", () => {
        applySimpleMode();
        if (isChecked("simpleMode", false)) applySimpleModeAuditFilterDefault();
        else markFirstRunCompleteAndPersist();
        persistSettings(false);
        initSimpleModeFirstRunBanner();
      });
    }
    showAuditEmptyIfNeeded();
    initAboutSection();
    initWhatsNewBanner();
    initPriorSessionBanner();
    initSessionTips();
    initSimpleModeFirstRunBanner();
    initHelpNewToEditingList();
    initDarkAppearanceTip();
    setupFirstAuditChecklistDismissTracking();
    syncFirstAuditChecklistVisibility();
    setTimeout(() => maybeInitOnboardingTour(), 600);
    setupSettingsKeyboardShortcut();
    tryOpenSettingsFromLocationHash();
    updateWorkflowStatusLine();
    updateFullManuscriptScopeTip();
    updateWorkflowNextStepHint();
    updateChecksScopeChip();
    updateAuditTabBadge();
    setupNarrowPaneClass();
    ProzaEdit.Diagnostics?.bindGlobalHandlers?.();
    ProzaEdit.Diagnostics?.initDiagnosticsUi?.();
    ProzaEdit.Diagnostics?.flushRetryQueue?.();
    setTimeout(() => scheduleManuscriptIndexBuild(false), 2500);
    refreshDocumentParagraphCount().then(() => refreshManuscriptContextStatusUi());
    try {
      if (sessionStorage.getItem("PROZAEDIT_UPDATE_CHECK") !== PROZAEDIT_BUILD_VERSION) {
        sessionStorage.setItem("PROZAEDIT_UPDATE_CHECK", PROZAEDIT_BUILD_VERSION);
        setTimeout(() => checkForUpdates(false), 4000);
      }
    } catch (_) {}
  } catch (e) {
    console.error(e);
    ProzaEdit.Diagnostics?.reportMajor?.({ phase: "init" }, e?.message || "Init failure").catch(() => {});
    showBootProblem("ProzaEdit failed to initialize. Reload the task pane.");
    showGlobalError({ message: "ProzaEdit failed to initialize. Reload the task pane.", detail: ProzaEdit.ErrorGuard?.redact?.(e?.message) || "" });
  }
}

setupGlobalErrorGuard();

if (typeof Office !== "undefined" && typeof Office.onReady === "function") {
  Office.onReady(onProzaEditOfficeReady);
  setTimeout(() => {
    if (!prozaEditBooted) {
      showBootProblem("ProzaEdit is still starting. If this message stays, reload the task pane.");
    }
  }, PROZAEDIT_BOOT_TIMEOUT_MS);
} else {
  showBootProblem("Office.js failed to load. Open ProzaEdit inside Word, or check your network and reload.");
}

async function reportProzaEditProblem() {
  const noteEl = getEl("peDiagnosticsNote");
  const note = noteEl?.value?.trim() || "";
  showPeStatus("Preparing anonymous report…");
  try {
    const r = await ProzaEdit.Diagnostics.sendReport({
      kind: "user",
      message: "User reported a problem",
      userNote: note,
      skipDedupe: true,
    });
    if (noteEl) noteEl.value = "";
    showPeStatus(r?.detail || "Done.", r?.mode === "sent" || r?.mode === "clipboard" ? "ok" : "warn");
  } catch (e) {
    showPeStatus("Could not prepare report.", "warn");
  }
}

function updateWorkflowStepper(tabId) {
  let step = "1";
  if (tabId === "tab3") step = "2";
  else if (tabId === "tab4") step = currentAuditSuggestions.length ? "4" : "3";
  else if (tabId === "tab1") step = "1";
  document.querySelectorAll(".workflow-step[data-workflow-step]").forEach((el) => {
    const on = el.dataset.workflowStep === step;
    el.classList.toggle("workflow-step-active", on);
    el.classList.toggle("active", on);
  });
}

function updateRewriteBackNav() {
  const btn = getEl("btnRewriteBackAudit");
  if (!btn) return;
  btn.classList.toggle("hidden", !rewriteFromAuditSession);
  if (rewriteFromAuditSession && !btn.dataset.decorated) {
    btn.dataset.decorated = "1";
    const icon = ProzaEdit.PeIcons?.svg?.("chevron-left");
    btn.innerHTML = icon ? `${icon}<span>Back to Audit</span>` : "← Back to Audit";
  }
}

function backToAuditFromRewrite() {
  rewriteFromAuditSession = false;
  updateRewriteBackNav();
  showTab("tab4");
}

function showTab(tabId) {
  const valid = ProzaEdit.UiPrefs?.validateLastActiveTab?.(tabId, {
    tabIds: TAB_IDS,
    simpleMode: isChecked("simpleMode", false),
  });
  if (!valid) return;
  tabId = valid;
  TAB_IDS.forEach((id) => {
    document.getElementById(id)?.classList.toggle("active", id === tabId);
  });
  document.querySelectorAll(".tab-btn[data-pe-tab]").forEach((btn) => {
    const on = btn.dataset.peTab === tabId;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  updateWorkflowStepper(tabId);
  schedulePersistLastActiveTab(tabId);
  scheduleLastSessionSummaryPersist();
  if (tabId === "tab4") {
    syncAuditPinsFromMain();
    restoreCachedAuditIfEmpty();
    showAuditEmptyIfNeeded();
    updateActiveChecksHint();
  }
  if (tabId === "tab3") updateActiveChecksHint();
  if (tabId === "tab6") updateRewriteBackNav();
  updateWorkflowCrossNav(tabId);
  updateChecksPostRunNav();
}

function bindWorkflowStepper() {
  const go = { "1": "tab1", "2": "tab3", "3": "tab4", "4": "tab4" };
  document.querySelectorAll(".workflow-step[data-workflow-step]").forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = "1";
    el.addEventListener("click", () => showTab(go[el.dataset.workflowStep] || "tab1"));
  });
}

function adaptModules() {
  const fiction = isFictionManuscriptType();
  FICTION_MODULE_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !fiction;
    if (!fiction) el.checked = false;
  });
  const chronoPanel = getEl("peChronoPanel");
  if (chronoPanel) {
    chronoPanel.hidden = !fiction;
    chronoPanel.toggleAttribute("disabled-section", !fiction);
  }
  const chronoSpoiler = getEl("chkChronoSpoilerGuard");
  if (chronoSpoiler) chronoSpoiler.disabled = !fiction;
  const citeEligible = ProzaEdit.CitationEngine?.isEligibleManuscript?.(getEl("manuscriptType")?.value || "");
  const citePanel = getEl("peCitationPanel");
  if (citePanel) {
    citePanel.hidden = !citeEligible;
    citePanel.toggleAttribute("disabled-section", !citeEligible);
  }
  const citeTargetBtn = getEl("btnVerifyCitationsTarget");
  const citeTargetHint = getEl("citationTargetHint");
  if (citeTargetBtn) citeTargetBtn.hidden = !citeEligible;
  if (citeTargetHint) citeTargetHint.hidden = !citeEligible;
  const citeScanBtn = getEl("btnScanCitations");
  const citeOptIn = isChecked("chkCitationScan", false);
  if (citeScanBtn) citeScanBtn.disabled = !citeEligible || !citeOptIn;
  if (citeTargetBtn) citeTargetBtn.disabled = !citeEligible || !citeOptIn;
  updateActiveChecksHint();
  schedulePersistSettings();
}

function isModuleEnabled(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked && !el.disabled);
}

function collectUiConfig() {
  const cfg = {
    manuscriptType: getEl("manuscriptType")?.value || "",
    targetAudience: getEl("targetAudience")?.value || "",
    settingAnchor: getEl("settingAnchor")?.value || "",
    criticPersona: getEl("criticPersona")?.value || "",
    scope: getEl("scope")?.value || "selection",
    language: getEl("language")?.value || "en-US",
    styleGuideRef: getEl("styleGuideRef")?.value || "auto",
    replaceInSelectionOnly: isChecked("replaceInSelectionOnly", true),
    chatSelectionOnly: isChecked("chatSelectionOnly", true),
    confirmBeforeApply: isChecked("confirmBeforeApply", true),
    rememberApiKey: isChecked("rememberApiKey", false),
    sectionParagraphCount: getSectionParagraphCount(),
    auditCardFilter: auditCardFilter,
    auditCardSort: auditCardSort,
    simpleMode: isChecked("simpleMode", false),
    showHoverTips: isChecked("showHoverTips", true),
    fkLock: isChecked("fkLock", false),
    remindVersionHistory: isChecked("remindVersionHistory", true),
    fictionScopeReminder: isChecked("fictionScopeReminder", true),
    continuityWarnLevel: parseInt(getEl("continuityWarnLevel")?.value, 10) || 3,
    scopePageFrom: getEl("scopePageFrom")?.value || "1",
    scopePageTo: getEl("scopePageTo")?.value || "5",
    selectedChapterIndices: getSelectedChapterIndicesFromUi(),
    auditExtended: isAuditExtended(),
    reportDensity: getEl("reportDensity")?.value || "balanced",
    chronoDepth: getEl("selChronoDepth")?.value || "meso",
    chronoSpoilerGuard: isChecked("chkChronoSpoilerGuard", false),
    citationScan: isChecked("chkCitationScan", false),
    citationStyle: getEl("selCitationStyle")?.value || "auto",
    citationReconcileBiblio: isChecked("chkCitationReconcile", true),
    aiEnforceSessionCeiling: isChecked("aiEnforceSessionCeiling", false),
    aiMaxSessionTokens: getEl("aiMaxSessionTokens")?.value || "50000",
    showSessionTips: isChecked("showSessionTips", true),
    showWhatsNew: isChecked("showWhatsNew", true),
    showPriorSessionSummary: isChecked("showPriorSessionSummary", true),
    showLongOperationWarnings: isChecked("showLongOperationWarnings", true),
    showDarkAppearanceTip: isChecked("showDarkAppearanceTip", true),
    autoRefreshManuscriptContext: isChecked("autoRefreshManuscriptContext", false),
    themePreference: getThemePreferenceFromUi(),
    lastActiveTab: getCurrentActiveTabId(),
    manuscriptContext: mciCache && !mciCache.invalid ? mciCache : undefined,
    batchSectionCount: Math.min(8, Math.max(1, parseInt(getEl("batchSectionCount")?.value, 10) || 3)),
    firstRunComplete: configFirstRunComplete,
    onboardingTourComplete: configOnboardingTourComplete,
    rewriteMode: (() => {
      const v = getEl("rewriteMode")?.value || "fluency";
      return ["fluency", "formal", "creative", "academic"].includes(v) ? v : "fluency";
    })(),
    ...ProzaEdit.UiPrefs?.normalizeShaperFields?.({
      shaperComplexity: getEl("slider-shaper-complexity")?.value,
      shaperIntensity: getEl("slider-shaper-intensity")?.value,
      shaperDensity: getEl("slider-shaper-density")?.value,
    }),
    modules: {},
  };
  MODULE_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    cfg.modules[id] = FICTION_MODULE_IDS.includes(id) ? isModuleEnabled(id) : !!el.checked;
  });
  if (cfg.rememberApiKey) {
    cfg.apiKey = getEl("apiKey")?.value.trim() || "";
  } else {
    delete cfg.apiKey;
  }
  return cfg;
}

function applyUiConfig(p) {
  if (!p) return;
  if (ProzaEdit.ScopeReader?.migrateLegacyChapterScope) {
    p = ProzaEdit.ScopeReader.migrateLegacyChapterScope(p);
  }
  if (Array.isArray(p.selectedChapterIndices)) {
    pendingSelectedChapterIndices = p.selectedChapterIndices;
  }
  const setV = (id, v) => {
    const el = document.getElementById(id);
    if (!el || v == null) return;
    if (el.tagName === "SELECT" && ![...el.options].some((o) => o.value === String(v))) return;
    el.value = v;
  };
  const setC = (id, v) => {
    const el = document.getElementById(id);
    if (el && typeof v === "boolean") el.checked = v;
  };
  setV("manuscriptType", p.manuscriptType);
  setV("targetAudience", p.targetAudience);
  setV("settingAnchor", p.settingAnchor);
  setV("criticPersona", p.criticPersona);
  setV("scope", p.scope);
  setV("language", p.language);
  setV("styleGuideRef", p.styleGuideRef || "auto");
  setC("replaceInSelectionOnly", p.replaceInSelectionOnly);
  setC("chatSelectionOnly", p.chatSelectionOnly);
  setC("confirmBeforeApply", p.confirmBeforeApply);
  setC("rememberApiKey", p.rememberApiKey);
  if (p.modules) MODULE_IDS.forEach((id) => setC(id, p.modules[id]));
  if (p.rememberApiKey && p.apiKey) setV("apiKey", p.apiKey);
  else setV("apiKey", "");
  if (p.sectionParagraphCount) setV("sectionParagraphCount", p.sectionParagraphCount);
  if (p.batchSectionCount != null) {
    setV("batchSectionCount", Math.min(8, Math.max(1, parseInt(p.batchSectionCount, 10) || 3)));
  }
  if (p.rewriteMode) {
    const mode = String(p.rewriteMode);
    setV("rewriteMode", ["fluency", "formal", "creative", "academic"].includes(mode) ? mode : "fluency");
  }
  if (p.auditCardFilter && ["all", "confirmed", "preference", "styleguide"].includes(p.auditCardFilter)) {
    auditCardFilter = p.auditCardFilter;
    updateAuditFilterChips();
  } else if (p.simpleMode) {
    auditCardFilter = "confirmed";
    updateAuditFilterChips();
  }
  syncSettingsDefaultAuditFilterSelect();
  if (p.auditCardSort && ["priority", "module"].includes(p.auditCardSort)) {
    auditCardSort = p.auditCardSort;
    updateAuditSortChips();
  }
  setC("simpleMode", p.simpleMode);
  if (typeof p.firstRunComplete === "boolean") configFirstRunComplete = p.firstRunComplete;
  if (typeof p.onboardingTourComplete === "boolean") configOnboardingTourComplete = p.onboardingTourComplete;
  setC("showHoverTips", p.showHoverTips !== false);
  setC("fkLock", p.fkLock);
  setC("remindVersionHistory", p.remindVersionHistory);
  setC("fictionScopeReminder", p.fictionScopeReminder !== false);
  setC("showSessionTips", p.showSessionTips !== false);
  setC("showWhatsNew", p.showWhatsNew !== false);
  setC("showPriorSessionSummary", p.showPriorSessionSummary !== false);
  setC("showLongOperationWarnings", p.showLongOperationWarnings !== false);
  setC("showDarkAppearanceTip", p.showDarkAppearanceTip !== false);
  setThemePreferenceInUi(p.themePreference != null ? p.themePreference : "light");
  applyPeTheme(getThemePreferenceFromUi());
  if (p.continuityWarnLevel) setV("continuityWarnLevel", p.continuityWarnLevel);
  setC("autoRefreshManuscriptContext", !!p.autoRefreshManuscriptContext);
  if (p.manuscriptContext && ProzaEdit.ManuscriptContextIndex?.normalizeStored) {
    setManuscriptContextIndex(p.manuscriptContext);
  }
  if (p.scopePageFrom) setV("scopePageFrom", p.scopePageFrom);
  if (p.scopePageTo) setV("scopePageTo", p.scopePageTo);
  setC("auditExtended", p.auditExtended);
  if (p.reportDensity) setV("reportDensity", p.reportDensity);
  if (p.chronoDepth) setV("selChronoDepth", p.chronoDepth);
  setC("chkChronoSpoilerGuard", !!p.chronoSpoilerGuard);
  setC("chkCitationScan", !!p.citationScan);
  if (p.citationStyle) setV("selCitationStyle", p.citationStyle);
  setC("chkCitationReconcile", p.citationReconcileBiblio !== false);
  setC("aiEnforceSessionCeiling", !!p.aiEnforceSessionCeiling);
  if (p.aiMaxSessionTokens != null) setV("aiMaxSessionTokens", p.aiMaxSessionTokens);
  const shaper = ProzaEdit.UiPrefs?.normalizeShaperFields?.(p);
  if (shaper) {
    setV("slider-shaper-complexity", shaper.shaperComplexity);
    setV("slider-shaper-intensity", shaper.shaperIntensity);
    setV("slider-shaper-density", shaper.shaperDensity);
    syncShaperSliderLabels();
  }
  syncExtendedAuditToggles();
  syncScopePanels();
  applySimpleMode();
  updateAuditReportDepthHint();
  toggleCustomStylePanel();
  updateActiveChecksHint();
  updateAuditDefaultFilterHint();
  if (p.lastActiveTab) pendingLastActiveTab = p.lastActiveTab;
}

let pendingLastActiveTab = null;
let lastTabPersistTimer = null;

function getCurrentActiveTabId() {
  return TAB_IDS.find((id) => document.getElementById(id)?.classList.contains("active")) || "tab1";
}

function schedulePersistLastActiveTab(tabId) {
  if (lastTabPersistTimer) clearTimeout(lastTabPersistTimer);
  lastTabPersistTimer = setTimeout(() => {
    lastTabPersistTimer = null;
    const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG);
    let cfg = {};
    try {
      cfg = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
    } catch (_) {
      cfg = collectUiConfig();
    }
    cfg.lastActiveTab = tabId;
    ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.CONFIG, JSON.stringify(cfg));
  }, 200);
}

function restoreLastActiveTab() {
  const fromPending = pendingLastActiveTab;
  pendingLastActiveTab = null;
  let tab = fromPending;
  if (!tab) {
    try {
      const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG);
      const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
      tab = p?.lastActiveTab;
    } catch (_) {}
  }
  const valid = ProzaEdit.UiPrefs?.validateLastActiveTab?.(tab, {
    tabIds: TAB_IDS,
    simpleMode: isChecked("simpleMode", false),
  });
  showTab(valid || "tab1");
}

function loadSavedSettings() {
  const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG);
  const guarded = ProzaEdit.ConfigGuard?.parse?.(raw) || { config: raw && typeof raw === "object" ? raw : null, problem: "" };
  let parsed = guarded.config;
  if (guarded.problem) {
    console.warn(`ProzaEdit: saved settings ignored (${guarded.problem}).`);
    showPeStatus("Saved ProzaEdit settings could not be read, so safe defaults were applied. Your next change will save fresh settings.", "warn");
    return;
  }
  const firstRun = ProzaEdit.Onboarding?.resolveFirstRunOnLoad?.({ rawConfig: raw, parsedConfig: parsed });
  if (firstRun?.kind === "bootstrap") {
    applyUiConfig(firstRun.patch || ProzaEdit.Onboarding.buildFirstRunBootstrapPatch());
    adaptModules();
    toggleCustomStylePanel();
    persistSettings(false);
    return;
  }
  if (!raw || !parsed) return;
  try {
    if (ProzaEdit.ScopeReader?.migrateLegacyChapterScope) {
      const migrated = ProzaEdit.ScopeReader.migrateLegacyChapterScope(parsed);
      if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
        parsed = migrated;
        ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.CONFIG, JSON.stringify(migrated));
      }
    }
    if (firstRun?.kind === "migrate-legacy" && firstRun.patch) {
      parsed = { ...parsed, ...firstRun.patch };
      ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.CONFIG, JSON.stringify(parsed));
    }
    let legacyTipsHidden = false;
    try {
      legacyTipsHidden =
        localStorage.getItem(ProzaEdit.Onboarding?.LEGACY_TIPS_PERMANENT_LOCAL_KEY || "pe-session-tips-dismissed") === "1";
    } catch (_) {}
    parsed = ProzaEdit.Onboarding?.migrateShowSessionTipsFromLegacy?.(parsed, legacyTipsHidden) || parsed;
    if (legacyTipsHidden && parsed.showSessionTips === false) {
      try {
        localStorage.removeItem(ProzaEdit.Onboarding?.LEGACY_TIPS_PERMANENT_LOCAL_KEY || "pe-session-tips-dismissed");
      } catch (_) {}
    }
    applyUiConfig(parsed);
    adaptModules();
    toggleCustomStylePanel();
    if (!isChecked("rememberApiKey", false)) persistSettings(false);
  } catch (e) {
    console.warn(e);
  }
}

function persistSettings(showAlert) {
  updateActiveChecksHint();
  let payload = "";
  try {
    payload = JSON.stringify(collectUiConfig());
  } catch (e) {
    console.warn(e);
    if (showAlert) showPeStatus("Save failed: settings could not be prepared.", "warn");
    return Promise.resolve(false);
  }
  return ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.CONFIG, payload).then((ok) => {
    if (showAlert) {
      showPeStatus(ok ? "Settings saved with this document." : "Save failed.", ok ? "ok" : "warn");
    } else if (!ok && !settingsSaveWarned) {
      settingsSaveWarned = true;
      showPeStatus("Could not save settings to this document (it may be read-only or storage is full). Changes apply until you close the pane.", "warn");
    }
    return ok;
  });
}

function schedulePersistSettings() {
  if (persistDebounceTimer) clearTimeout(persistDebounceTimer);
  persistDebounceTimer = setTimeout(() => persistSettings(false), 350);
}

function flashTargetSaveOk() {
  const btn = getEl("btnSaveTarget");
  if (!btn) return;
  btn.classList.add("pe-save-flash-ok");
  setTimeout(() => btn.classList.remove("pe-save-flash-ok"), 2200);
}

function saveConfiguration() {
  persistSettings(true).then((ok) => {
    if (ok) flashTargetSaveOk();
  });
}

function isAuditExtended() {
  const boxes = document.querySelectorAll('input[data-audit-extended="1"]');
  for (let i = 0; i < boxes.length; i++) if (boxes[i].checked) return true;
  return false;
}

function syncExtendedAuditToggles() {
  const on = isChecked(
    "auditExtended",
    isChecked("auditExtendedChecks", isChecked("auditExtendedSettings", false))
  );
  document.querySelectorAll('input[data-audit-extended="1"]').forEach((el) => {
    el.checked = !!on;
  });
}

function setAuditExtended(on) {
  document.querySelectorAll('input[data-audit-extended="1"]').forEach((el) => {
    el.checked = !!on;
  });
  schedulePersistSettings();
}

function shortManuscriptTypeLabel(type) {
  const t = String(type || "");
  if (t.includes("Fiction")) return "Fiction";
  if (t.includes("Academic")) return "Academic";
  if (t.includes("Business")) return "Business";
  if (t.includes("Memoir")) return "Memoir";
  if (t.includes("Technical")) return "Technical";
  return t.split("/")[0].trim() || "Manuscript";
}

function updateActiveChecksHint() {
  const nodes = document.querySelectorAll(".active-checks-hint");
  if (!nodes.length) return;
  const ctx = buildAuditContext();
  const typeLabel = shortManuscriptTypeLabel(ctx.manuscriptType);
  const parts = [];
  if (ctx.chkRep) parts.push("repetition");
  if (ctx.chkProp) parts.push("names");
  if (ctx.chkSpell) parts.push("proofing + style");
  if (ctx.chkAI) parts.push("AI-voice");
  if (ctx.fkLock) parts.push("FK lock");
  const fiction = isFictionManuscriptType(ctx.manuscriptType);
  if (fiction) {
    const mods = FICTION_MODULE_IDS.filter((id) => isModuleEnabled(id));
    if (mods.length === 7) parts.push("fiction×7");
    else if (mods.length) parts.push(`fiction ${mods.length}/7`);
  }
  const citeEligible = ProzaEdit.CitationEngine?.isEligibleManuscript?.(ctx.manuscriptType || "");
  if (citeEligible && isChecked("chkCitationScan", false)) parts.push("citation scan");
  const ext = isAuditExtended() ? ", extended" : "";
  const checks = parts.length ? parts.join(", ") : "none — enable toggles below";
  const msg = `${typeLabel}: ${checks}${ext}. Then Run audit.`;
  nodes.forEach((el) => {
    el.textContent = msg;
  });
}

function setupAutoSaveHandlers() {
  const bind = (el) => {
    if (!el || el.dataset.peAutosave) return;
    el.dataset.peAutosave = "1";
    el.addEventListener("change", () => {
      if (el.id === "manuscriptType") adaptModules();
      else if (el.id === "chkCitationScan") adaptModules();
      else updateActiveChecksHint();
      if (el.id === "styleGuideRef") toggleCustomStylePanel();
      if (el.id === "manuscriptType" || el.id === "styleGuideRef") {
        updateWorkflowStatusLine();
        maybeApplyReviewModeFilterOnProfileChange();
      }
      if (el.id === "showHoverTips") applyHoverTips();
      if (el.id === "simpleMode") {
        applySimpleMode();
        if (isChecked("simpleMode", false)) applySimpleModeAuditFilterDefault();
      }
      if (el.id === "reportDensity") updateAuditReportDepthHint();
      if (el.id === "settingsDefaultAuditFilter") {
        applyDefaultAuditFilterFromSettings();
        updateAuditDefaultFilterHint();
      }
      schedulePersistSettings();
    });
  };
  [
    "manuscriptType",
    "targetAudience",
    "settingAnchor",
    "criticPersona",
    "scope",
    "language",
    "styleGuideRef",
    "replaceInSelectionOnly",
    "chatSelectionOnly",
    "confirmBeforeApply",
    "fkLock",
    "remindVersionHistory",
    "fictionScopeReminder",
    "showHoverTips",
    "continuityWarnLevel",
    "scopePageFrom",
    "scopePageTo",
    "sectionParagraphCount",
    "batchSectionCount",
    "rewriteMode",
    "reportDensity",
    "selChronoDepth",
    "chkChronoSpoilerGuard",
    "chkCitationScan",
    "selCitationStyle",
    "chkCitationReconcile",
    "aiEnforceSessionCeiling",
    "aiMaxSessionTokens",
    "settingsDefaultAuditFilter",
    "showSessionTips",
    "showWhatsNew",
    "showPriorSessionSummary",
    "showLongOperationWarnings",
    "showDarkAppearanceTip",
    "autoRefreshManuscriptContext",
  ].forEach((id) => bind(getEl(id)));
  const showTipsEl = getEl("showSessionTips");
  if (showTipsEl && !showTipsEl.dataset.peOnboardingFx) {
    showTipsEl.dataset.peOnboardingFx = "1";
    showTipsEl.addEventListener("change", () => {
      if (!isChecked("showSessionTips", true)) {
        hideOnboardingBanner("peSessionTips");
      } else {
        ProzaEdit.Onboarding?.clearSessionDismissForPref?.("showSessionTips");
        initSessionTips();
      }
      schedulePersistSettings();
    });
  }
  const showWhatsNewEl = getEl("showWhatsNew");
  if (showWhatsNewEl && !showWhatsNewEl.dataset.peOnboardingFx) {
    showWhatsNewEl.dataset.peOnboardingFx = "1";
    showWhatsNewEl.addEventListener("change", () => {
      if (!isChecked("showWhatsNew", true)) {
        hideOnboardingBanner("peWhatsNewBanner");
      } else {
        initWhatsNewBanner();
      }
      schedulePersistSettings();
    });
  }
  const showPriorEl = getEl("showPriorSessionSummary");
  if (showPriorEl && !showPriorEl.dataset.peOnboardingFx) {
    showPriorEl.dataset.peOnboardingFx = "1";
    showPriorEl.addEventListener("change", () => {
      if (!isChecked("showPriorSessionSummary", true)) {
        hideOnboardingBanner("pePriorSessionBanner");
      } else {
        ProzaEdit.Onboarding?.clearSessionDismissForPref?.("showPriorSessionSummary");
        initPriorSessionBanner();
      }
      schedulePersistSettings();
    });
  }
  const showDarkTipEl = getEl("showDarkAppearanceTip");
  if (showDarkTipEl && !showDarkTipEl.dataset.peOnboardingFx) {
    showDarkTipEl.dataset.peOnboardingFx = "1";
    showDarkTipEl.addEventListener("change", () => {
      if (!isChecked("showDarkAppearanceTip", true)) {
        hideOnboardingBanner("peDarkAppearanceBanner");
      } else {
        ProzaEdit.Onboarding?.clearSessionDismissForPref?.("showDarkAppearanceTip");
        initDarkAppearanceTip();
      }
      schedulePersistSettings();
    });
  }
  MODULE_IDS.forEach((id) => bind(getEl(id)));
  document.querySelectorAll('input[data-audit-extended="1"]').forEach((el) => {
    if (el.dataset.peAutosave) return;
    el.dataset.peAutosave = "1";
    el.addEventListener("change", () => {
      syncExtendedAuditToggles();
      updateActiveChecksHint();
      schedulePersistSettings();
    });
  });
}

async function prepareScopeForAudit(retryOpts) {
  if (!(await maybeAutoRefreshManuscriptContextBeforeAudit())) return false;
  const scope = getScopeMode();
  if (scope !== "selection") {
    if (scope === "selected-chapters" || scope === "chapter" || scope === "chapter-range") {
      if (!scopeChapterListCache.length) {
        try {
          await refreshChapterScopeLists();
        } catch (e) {
          reportActionError(e, "read the chapter list");
          return false;
        }
      }
      if (scope === "selected-chapters" && !getSelectedChapterIndicesFromUi().length) {
        showPeStatus("Select at least one chapter on Target (checklist under Selected chapters), or reload the chapter list.", "warn");
        showTab("tab1");
        return false;
      }
    }
    await refreshScopeCharPreview();
    const prev = getEl("scopeCharPreview");
    if (prev?.classList.contains("over-limit")) {
      showPeStatus("Scope exceeds character limit. Narrow pages/chapters or use section loop.", "warn");
      return false;
    }
    return true;
  }
  try {
    const has = await wordRun("sel-check", async (ctx) => {
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      return (sel.text || "").trim().length > 20;
    });
    if (has) return true;
  } catch (e) {
    reportActionError(e, "check your selection", {
      retry: retryOpts ? { label: "Audit", run: () => runAuditInternal({ ...retryOpts, skipLongOpWarning: true }) } : null,
    });
    return false;
  }
  if (
    await peConfirm({
      title: "No selection",
      message:
        "Nothing (or too little) is highlighted in Word.\n\nSelect the next section automatically and run audit?\n\n(Cancel = stop; you can highlight text yourself.)",
      confirmLabel: "Select next section",
      cancelLabel: "Cancel",
    })
  ) {
    try {
      await selectNextSection();
      await new Promise((r) => setTimeout(r, 200));
      return true;
    } catch (e) {
      reportActionError(e, "select the next section");
      return false;
    }
  }
  showPeStatus("Highlight text in Word, or use Section + audit on Checks tab.", "warn");
  return false;
}

function runPrimaryAudit() {
  const ref = getEl("styleGuideRef")?.value;
  if (ref === "custom") {
    const n = ProzaEdit.Settings.getCustomStyleGuide().rules?.length || 0;
    if (!n) {
      showPeStatus("No custom rules yet — add in Settings → Custom style or choose Custom + Auto.", "warn");
      openSettingsModal("style");
      return;
    }
  }
  if (isAuditExtended()) {
    runExtendedLocalAudit();
  } else {
    runProzaEditAudit();
  }
}

function buildManuscriptProfile() {
  const c = collectUiConfig();
  const base = `Type: ${c.manuscriptType}\nAudience: ${c.targetAudience}\nSetting: ${c.settingAnchor}\nCritic: ${c.criticPersona}\nLanguage: ${c.language}`;
  return appendManuscriptContextToProfile(base);
}

function applySimpleMode() {
  const on = isChecked("simpleMode", false);
  document.body.classList.toggle("pe-simple-mode", on);
  const label = getEl("targetSimpleModeLabel");
  if (label) label.textContent = on ? "On" : "Off";
  const targetHint = getEl("peTargetRecommendedHint");
  if (targetHint) targetHint.classList.toggle("hidden", !on);
  updateAuditDefaultFilterHint();
  if (on && getCurrentActiveTabId() === "tab2") showTab("tab1");
  syncFirstAuditChecklistVisibility();
  applyPlainLanguageLayer();
}

function applyPlainLanguageLayer() {
  const on = isChecked("simpleMode", false);
  const intro = getEl("peSimpleModeEssentialsIntro");
  const turnOff = getEl("btnTurnOffSimpleMode");
  if (intro) intro.classList.toggle("hidden", !on);
  if (turnOff) turnOff.classList.toggle("hidden", !on);
  updatePlainLanguageScopeSelect();
  updatePlainLanguageControlHints();
  updateAuditFilterLanesHintPlain();
  updateSimpleModeAuditBanner();
  updateChecksScopeChip();
  updateSimpleModeTabHints();
  updateSettingsPlainLanguageLabels();
  updateAuditSeverityLegend();
  updateChecksReportDepthHint();
  updateAuditFilterChips();
  applyTabStripOrder();
  updateTabStripVisibleLabels();
  updatePipelineHints();
  updateSimpleModeAdvancedTabsList();
  const mciSimple = getEl("peMciSimpleBlock");
  if (mciSimple) mciSimple.classList.toggle("hidden", !on);
}

function updatePlainLanguageScopeSelect() {
  const sel = getEl("scope");
  if (!sel || !ProzaEdit.PlainLanguage?.scopeSelectOptionLabel) return;
  const on = isChecked("simpleMode", false);
  sel.querySelectorAll("option").forEach((opt) => {
    if (!opt.dataset.peOriginalLabel) opt.dataset.peOriginalLabel = opt.textContent;
    const friendly = ProzaEdit.PlainLanguage.scopeSelectOptionLabel(opt.value);
    opt.textContent = on && friendly ? friendly : opt.dataset.peOriginalLabel;
  });
}

function updatePlainLanguageControlHints() {
  const density = getEl("reportDensity");
  const hint = getEl("peReportDensityPlainHint");
  const optionsPlain = getEl("peReportDepthOptionsPlain");
  const on = isChecked("simpleMode", false);
  const raw = density?.value || "balanced";
  if (density && on) {
    density.setAttribute("aria-label", ProzaEdit.PlainLanguage.reportDepthHintLabel(raw));
    density.querySelectorAll("option").forEach((opt) => {
      const helper = ProzaEdit.PlainLanguage.reportDepthOptionHelper(opt.value);
      if (helper) opt.title = helper;
    });
  } else if (density) {
    density.removeAttribute("aria-label");
    density.querySelectorAll("option").forEach((opt) => {
      opt.removeAttribute("title");
    });
  }
  if (hint) {
    hint.textContent = on
      ? ProzaEdit.PlainLanguage.reportDepthHintLabel(raw)
      : "Controls card cap and overview detail on the Audit tab.";
  }
  if (optionsPlain) {
    optionsPlain.classList.toggle("hidden", !on);
    if (on && ProzaEdit.PlainLanguage?.REPORT_DEPTH_OPTION_HELPER) {
      const lines = ["light", "balanced", "dense"]
        .map((k) => ProzaEdit.PlainLanguage.reportDepthOptionHelper(k))
        .filter(Boolean);
      optionsPlain.textContent = lines.join(" · ");
    }
  }
}

function updateSimpleModeTabHints() {
  const hints = ProzaEdit.PlainLanguage?.TAB_HINTS;
  if (!hints) return;
  const on = isChecked("simpleMode", false);
  document.querySelectorAll(".tab-btn[data-pe-tab]").forEach((btn) => {
    const tabId = btn.dataset.peTab;
    const hintText = hints[tabId];
    const aria = ProzaEdit.WorkflowNav?.tabAriaLabel?.(
      tabId,
      btn.dataset.peTabDefaultLabel || tabId,
      on
    );
    if (aria) btn.setAttribute("aria-label", aria);
    else btn.removeAttribute("aria-label");
    if (hintText && on) btn.setAttribute("title", hintText);
    else btn.removeAttribute("title");
    let sub = btn.querySelector(".pe-tab-hint");
    if (on && hintText) {
      if (!sub) {
        sub = document.createElement("span");
        sub.className = "pe-tab-hint";
        btn.appendChild(sub);
      }
      sub.textContent = hintText;
      sub.classList.remove("hidden");
    } else if (sub) {
      sub.classList.add("hidden");
    }
  });
}

function applyTabStripOrder() {
  const nav = ProzaEdit.WorkflowNav;
  if (!nav?.tabFlexOrder) return;
  const on = isChecked("simpleMode", false);
  document.querySelectorAll(".tab-btn[data-pe-tab]").forEach((btn) => {
    btn.style.order = String(nav.tabFlexOrder(btn.dataset.peTab, on));
  });
}

function updateTabStripVisibleLabels() {
  const nav = ProzaEdit.WorkflowNav;
  if (!nav?.tabVisibleLabel) return;
  const on = isChecked("simpleMode", false);
  document.querySelectorAll(".tab-btn[data-pe-tab]").forEach((btn) => {
    const tabId = btn.dataset.peTab;
    const def = btn.dataset.peTabDefaultLabel || tabId;
    const labelEl = btn.querySelector("[data-pe-tab-label]");
    if (labelEl) labelEl.textContent = nav.tabVisibleLabel(tabId, def, on);
  });
}

function updatePipelineHints() {
  const on = isChecked("simpleMode", false);
  const text = on
    ? ProzaEdit.WorkflowNav?.PIPELINE_HINT_SIMPLE ||
      ProzaEdit.PlainLanguage?.auditFilterLanesHint?.(true) ||
      ""
    : "";
  ["peChecksPipelineHint", "peAuditPipelineHint"].forEach((id) => {
    const el = getEl(id);
    if (!el) return;
    el.textContent = text;
    el.classList.toggle("hidden", !text);
  });
  const tagline = getEl("peChecksRunAuditTagline");
  if (tagline && on && ProzaEdit.PlainLanguage?.CHECKS_RUN_AUDIT_TAGLINE) {
    tagline.textContent = ProzaEdit.PlainLanguage.CHECKS_RUN_AUDIT_TAGLINE;
  }
}

function updateSimpleModeAdvancedTabsList() {
  const el = getEl("peSimpleModeAdvancedTabsList");
  if (!el || !ProzaEdit.WorkflowNav?.ADVANCED_TABS_WHEN_SIMPLE_OFF) return;
  const on = isChecked("simpleMode", false);
  el.classList.toggle("hidden", !on);
  if (on) {
    el.innerHTML = `<strong>All features:</strong> ${escapeHtml(ProzaEdit.WorkflowNav.ADVANCED_TABS_WHEN_SIMPLE_OFF)} Turn off Simple mode above.`;
  }
}

function hasAuditResultsForNav() {
  return currentAuditSuggestions.length > 0 || sessionAuditCompletedThisSession;
}

function handleWorkflowCrossNavAction(link) {
  if (!link) return;
  if (link.targetTab === "__settings_dictionary__") {
    openSettingsModal("dictionary");
    return;
  }
  if (link.id === "run-audit") {
    runPrimaryAudit();
    return;
  }
  if (link.targetTab) showTab(link.targetTab);
}

function bindWorkflowCrossNavDelegation() {
  const navEl = getEl("peWorkflowCrossNav");
  if (!navEl || navEl.dataset.peCrossDelegated) return;
  navEl.dataset.peCrossDelegated = "1";
  navEl.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-pe-cross-nav]");
    if (!btn || !navEl.contains(btn)) return;
    handleWorkflowCrossNavAction({
      id: btn.dataset.peCrossNav,
      targetTab: btn.dataset.peCrossTab,
    });
  });
}

function updateWorkflowCrossNav(activeTabId) {
  const navEl = getEl("peWorkflowCrossNav");
  const nav = ProzaEdit.WorkflowNav;
  if (!navEl || !nav?.crossNavLinks) return;
  bindWorkflowCrossNavDelegation();
  const links = nav.crossNavLinks(activeTabId, {
    hasAuditResults: hasAuditResultsForNav(),
    auditBusy,
  });
  if (!links.length) {
    navEl.classList.add("hidden");
    navEl.innerHTML = "";
    return;
  }
  navEl.classList.remove("hidden");
  navEl.innerHTML = links
    .map(
      (link) =>
        `<button type="button" class="btn-linkish pe-workflow-cross-link${link.primary ? " pe-workflow-cross-link-primary" : ""}" data-pe-cross-nav="${escapeHtml(link.id)}" data-pe-cross-tab="${escapeHtml(link.targetTab || "")}">${escapeHtml(link.label)}</button>`
    )
    .join('<span class="pe-workflow-cross-sep" aria-hidden="true">·</span>');
}

function updateChecksPostRunNav() {
  const el = getEl("peChecksPostRunNav");
  if (!el) return;
  const show =
    sessionAuditCompletedThisSession &&
    hasAuditResultsForNav() &&
    !auditBusy &&
    getCurrentActiveTabId() === "tab3";
  if (!show) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML =
    'Audit finished — <button type="button" class="btn-linkish" onclick="showTab(\'tab4\')">View issues on Fix</button>';
}

function updateSettingsPlainLanguageLabels() {
  const on = isChecked("simpleMode", false);
  const sel = getEl("settingsDefaultAuditFilter");
  if (sel) {
    sel.querySelectorAll("option").forEach((opt) => {
      if (!opt.dataset.peOriginalLabel) opt.dataset.peOriginalLabel = opt.textContent;
      if (opt.value === "confirmed") {
        opt.textContent = on ? "Important" : opt.dataset.peOriginalLabel;
      }
    });
  }
}

function updateAuditSeverityLegend() {
  const el = getEl("peAuditSeverityLegend");
  if (!el || !ProzaEdit.PlainLanguage?.auditSeverityLegendLine) return;
  el.textContent = ProzaEdit.PlainLanguage.auditSeverityLegendLine(isChecked("simpleMode", false));
}

function updateChecksReportDepthHint() {
  const el = getEl("peChecksReportDepthPlainHint");
  if (!el) return;
  const on = isChecked("simpleMode", false);
  el.classList.toggle("hidden", !on);
  if (!on) return;
  const raw = getEl("reportDensity")?.value || "balanced";
  el.textContent = ProzaEdit.PlainLanguage?.reportDepthOptionHelper?.(raw) || "";
}

function updateAuditFilterLanesHintPlain() {
  const el = getEl("peAuditFilterLanesHint");
  if (!el || !ProzaEdit.PlainLanguage?.auditFilterLanesHint) return;
  el.textContent = ProzaEdit.PlainLanguage.auditFilterLanesHint(isChecked("simpleMode", false));
}

function updateSimpleModeAuditBanner() {
  const banner = getEl("peSimpleModeAuditBanner");
  if (!banner) return;
  const on = isChecked("simpleMode", false);
  banner.classList.toggle("hidden", !on);
  if (!on) {
    banner.textContent = "";
    return;
  }
  banner.textContent =
    ProzaEdit.PlainLanguage?.simpleModeAuditBannerText?.(auditCardFilter) ||
    "Simple mode is on — turn off in Settings → Essentials for all features.";
}

function turnOffSimpleModeFromEssentials() {
  const sm = getEl("simpleMode");
  if (!sm || !sm.checked) return;
  sm.checked = false;
  applySimpleMode();
  if (!isReviewModeProfileActive()) markFirstRunCompleteAndPersist();
  persistSettings(false);
  initSimpleModeFirstRunBanner();
  showPeStatus("Simple mode off — Coach, Rewrite, and Thesaurus tabs are back.", "ok");
}

function initHelpNewToEditingList() {
  const list = getEl("peHelpNewToEditingList");
  const bullets = ProzaEdit.PlainLanguage?.NEW_TO_EDITING_TOOLS_BULLETS;
  if (!list || !bullets?.length || list.dataset.peFilled) return;
  list.dataset.peFilled = "1";
  bullets.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = text;
    list.appendChild(li);
  });
}

function decorateRunAuditHubButton(btn) {
  if (!btn || btn.dataset.peRunAuditDecorated) return;
  btn.dataset.peRunAuditDecorated = "1";
  const ic = window.ProzaEdit?.PeIcons?.svg ? ProzaEdit.PeIcons.svg("flash") : "";
  btn.classList.add("btn-with-icon");
  btn.innerHTML = `${ic}<span data-pe-run-audit-label>Run audit</span>`;
}

function setRunAuditHubButtonLabel(btn, text) {
  if (!btn) return;
  const span = btn.querySelector("[data-pe-run-audit-label]");
  if (span) span.textContent = text;
  else btn.textContent = text;
}

function setupRunAuditHubButtons() {
  [getEl("btnRunAudit"), getEl("btnAuditPrimary")].forEach(decorateRunAuditHubButton);
}

function setupShaperSliderPersistence() {
  ["slider-shaper-complexity", "slider-shaper-intensity", "slider-shaper-density"].forEach((id) => {
    const el = getEl(id);
    if (!el || el.dataset.peShaperPersist) return;
    el.dataset.peShaperPersist = "1";
    el.addEventListener("input", () => {
      syncShaperSliderLabels();
      schedulePersistSettings();
    });
  });
}

function resetShaperSlidersToDefaults() {
  const patch = ProzaEdit.UiPrefs?.getShaperDefaultsPatch?.();
  if (!patch) return;
  const map = [
    ["slider-shaper-complexity", patch.shaperComplexity],
    ["slider-shaper-intensity", patch.shaperIntensity],
    ["slider-shaper-density", patch.shaperDensity],
  ];
  map.forEach(([id, val]) => {
    const el = getEl(id);
    if (el) el.value = val;
  });
  syncShaperSliderLabels();
  schedulePersistSettings();
  showPeStatus("Shaper sliders reset to defaults.", "ok");
}

function updateCustomRulesSummary() {
  const n = ProzaEdit.Settings.getCustomStyleGuide().rules?.length || 0;
  const countEl = getEl("targetCustomRulesCount");
  if (countEl) countEl.textContent = String(n);
}

const REPORT_DENSITY_LABELS = { light: "Light", balanced: "Balanced", dense: "Dense" };

function updateAuditReportDepthHint() {
  const hint = getEl("auditReportDepthHint");
  if (!hint) return;
  const raw = getEl("reportDensity")?.value || "balanced";
  const label = REPORT_DENSITY_LABELS[raw] || "Balanced";
  if (isChecked("simpleMode", false) && ProzaEdit.PlainLanguage?.reportDepthHintLabel) {
    const plain = ProzaEdit.PlainLanguage.reportDepthHintLabel(raw);
    hint.innerHTML = `${plain} (<button type="button" class="btn-linkish" onclick="openSettingsModal('audit')">change in Settings</button>)`;
    updatePlainLanguageControlHints();
    updateChecksReportDepthHint();
    return;
  }
  updateChecksReportDepthHint();
  hint.innerHTML = `Report depth: <strong>${label}</strong> (<button type="button" class="btn-linkish" onclick="openSettingsModal('audit')">change in Settings</button>)`;
}

function getDefaultAuditFilterLabel() {
  const sel = getEl("settingsDefaultAuditFilter");
  const mode = sel?.value || "all";
  return auditFilterDisplayLabel(mode);
}

function updateAuditDefaultFilterHint() {
  const hint = getEl("auditDefaultFilterHint");
  if (!hint) return;
  if (isChecked("simpleMode", false)) {
    hint.innerHTML =
      'Simple mode: Audit opens on <strong>Important</strong> (<button type="button" class="btn-linkish" onclick="openSettingsModal(\'essentials\')">Settings → Essentials</button>). Filter chips below still work.';
    return;
  }
  const label = getDefaultAuditFilterLabel();
  hint.innerHTML = `Default filter: <strong>${label}</strong> (<button type="button" class="btn-linkish" onclick="openSettingsModal('audit')">change in Settings</button>)`;
}

function syncSettingsDefaultAuditFilterSelect() {
  const sel = getEl("settingsDefaultAuditFilter");
  if (!sel || !["all", "confirmed", "preference", "styleguide"].includes(auditCardFilter)) return;
  sel.value = auditCardFilter;
  updateAuditDefaultFilterHint();
}

function applyDefaultAuditFilterFromSettings() {
  const sel = getEl("settingsDefaultAuditFilter");
  if (!sel) return;
  const mode = sel.value;
  if (!["all", "confirmed", "preference", "styleguide"].includes(mode)) return;
  auditCardFilter = mode;
  updateAuditFilterChips();
  applyAuditCardFilter();
}

function applySimpleModeAuditFilterDefault() {
  auditCardFilter = "confirmed";
  updateAuditFilterChips();
  applyAuditCardFilter();
}

/** On load: simple mode without a saved filter chip defaults to Critical. */
function maybeDefaultAuditFilterForSimple() {
  if (!isChecked("simpleMode", false)) return;
  const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG);
  let savedFilter;
  try {
    const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    savedFilter = p?.auditCardFilter;
  } catch (_) {
    savedFilter = undefined;
  }
  if (savedFilter == null) applySimpleModeAuditFilterDefault();
}

function isReviewModeProfileActive() {
  return ProzaEdit.UiPrefs?.isReviewModeProfile?.(
    getEl("manuscriptType")?.value || "",
    getEl("styleGuideRef")?.value || "auto"
  );
}

function applyReviewModeAuditFilterDefault() {
  const mode = ProzaEdit.UiPrefs?.reviewModeDefaultAuditFilter?.() || "styleguide";
  if (!["all", "confirmed", "preference", "styleguide"].includes(mode)) return;
  auditCardFilter = mode;
  updateAuditFilterChips();
  applyAuditCardFilter();
  updateReviewModeAuditHint();
}

function maybeDefaultAuditFilterForReviewMode() {
  if (isChecked("simpleMode", false)) return;
  if (!isReviewModeProfileActive()) {
    updateReviewModeAuditHint();
    return;
  }
  const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG);
  let savedFilter;
  try {
    const p = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    savedFilter = p?.auditCardFilter;
  } catch (_) {
    savedFilter = undefined;
  }
  if (savedFilter == null || savedFilter === "all") applyReviewModeAuditFilterDefault();
  else updateReviewModeAuditHint();
}

function maybeApplyReviewModeFilterOnProfileChange() {
  if (isChecked("simpleMode", false)) {
    updateReviewModeAuditHint();
    return;
  }
  if (!isReviewModeProfileActive()) {
    updateReviewModeAuditHint();
    return;
  }
  if (auditCardFilter === "all") applyReviewModeAuditFilterDefault();
  else updateReviewModeAuditHint();
}

function updateReviewModeAuditHint() {
  const hint = getEl("peReviewModeAuditHint");
  if (!hint) return;
  if (!isReviewModeProfileActive() || isChecked("simpleMode", false)) {
    hint.classList.add("hidden");
    hint.textContent = "";
    return;
  }
  const label = AUDIT_FILTER_LABELS[auditCardFilter] || "All";
  hint.innerHTML = `Review profile: consistency and house-style checks first — filter chip <strong>${label}</strong> (use Critical or Style guide chips as needed).`;
  hint.classList.remove("hidden");
}

function getManuscriptTypeAwareHint() {
  if (isFictionManuscriptType()) return "";
  const type = (getEl("manuscriptType")?.value || "Non-fiction").replace(/\s*\(.+\)\s*$/, "").trim();
  return `Non-fiction profile (${type}): fiction plot and spoiler modules stay off — audit emphasizes clarity, repetition, and house style.`;
}

let lastSessionSummaryRanAudit = false;
let lastSessionSummaryTimer = null;

function migrateLegacySessionTipsOnInit() {
  try {
    const key = ProzaEdit.Onboarding?.LEGACY_TIPS_PERMANENT_LOCAL_KEY || "pe-session-tips-dismissed";
    if (localStorage.getItem(key) !== "1") return;
    localStorage.removeItem(key);
    const cb = getEl("showSessionTips");
    if (cb && cb.checked) {
      cb.checked = false;
      persistSettings(false);
    }
  } catch (_) {}
}

function initAboutSection() {
  const setText = (id, text) => {
    const el = getEl(id);
    if (el && text != null) el.textContent = text;
  };
  setText("peAboutBuildVersion", PROZAEDIT_BUILD_VERSION);
  setText("peAboutManifestVersion", PROZAEDIT_BUILD_VERSION);
  setText("peAboutAddInId", PROZAEDIT_ADDIN_ID);
  const rel = ProzaEdit.Onboarding?.WHATS_NEW_RELEASE;
  if (rel && rel.version === PROZAEDIT_BUILD_VERSION) {
    setText("peWhatsNewVersion", rel.version);
    setText("peWhatsNewBullet", rel.bullet);
    const link = getEl("peWhatsNewReleaseLink");
    if (link && rel.releaseNotesUrl) link.href = rel.releaseNotesUrl;
  }
}

function markWhatsNewVersionSeen() {
  const key = ProzaEdit.Onboarding?.whatsNewSeenStorageKey?.(PROZAEDIT_BUILD_VERSION);
  if (!key) return;
  try {
    localStorage.setItem(key, "1");
  } catch (_) {}
}

function initWhatsNewBanner() {
  const el = getEl("peWhatsNewBanner");
  if (!el) return;
  const show = ProzaEdit.Onboarding?.shouldShowWhatsNewBanner?.({
    showWhatsNew: isChecked("showWhatsNew", true),
    buildVersion: PROZAEDIT_BUILD_VERSION,
  });
  if (!show) {
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
}

function dismissWhatsNewBanner(dontShowAgain) {
  hideOnboardingBanner("peWhatsNewBanner");
  markWhatsNewVersionSeen();
  if (dontShowAgain) permanentOffOnboardingPref("showWhatsNew", "peWhatsNewBanner");
}

function initPriorSessionBanner() {
  const el = getEl("pePriorSessionBanner");
  const list = getEl("pePriorSessionLines");
  if (!el || !list) return;
  if (!isChecked("showPriorSessionSummary", true)) {
    el.classList.add("hidden");
    return;
  }
  try {
    if (sessionStorage.getItem(ProzaEdit.Onboarding?.PRIOR_BANNER_SESSION_KEY || "pe-prior-session-banner-dismissed") === "1") {
      el.classList.add("hidden");
      return;
    }
  } catch (_) {}
  let raw = null;
  try {
    raw = localStorage.getItem(ProzaEdit.Onboarding?.LAST_SESSION_SUMMARY_KEY || "pe-last-session-summary");
  } catch (_) {}
  const summary = ProzaEdit.Onboarding?.parseSessionSummary?.(raw);
  if (!summary) {
    el.classList.add("hidden");
    return;
  }
  const lines = ProzaEdit.Onboarding?.formatPriorSessionLines?.(summary) || [];
  if (!lines.length) {
    el.classList.add("hidden");
    return;
  }
  list.innerHTML = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
  el.classList.remove("hidden");
}

function dismissPriorSessionBanner(dontShowAgain) {
  hideOnboardingBanner("pePriorSessionBanner");
  if (dontShowAgain) {
    permanentOffOnboardingPref("showPriorSessionSummary", "pePriorSessionBanner");
    return;
  }
  try {
    sessionStorage.setItem(ProzaEdit.Onboarding?.PRIOR_BANNER_SESSION_KEY || "pe-prior-session-banner-dismissed", "1");
  } catch (_) {}
}

function scheduleLastSessionSummaryPersist(extra) {
  if (lastSessionSummaryTimer) clearTimeout(lastSessionSummaryTimer);
  lastSessionSummaryTimer = setTimeout(() => {
    lastSessionSummaryTimer = null;
    writeLastSessionSummary(extra);
  }, 400);
}

function writeLastSessionSummary(extra) {
  extra = extra || {};
  const patch = ProzaEdit.Onboarding?.buildSessionSummaryPatch?.(
    {
      lastTab: getCurrentActiveTabId(),
      scopeMode: getScopeModeLabel(),
      ranAudit: extra.ranAudit === true || lastSessionSummaryRanAudit,
      buildVersion: PROZAEDIT_BUILD_VERSION,
    },
    PROZAEDIT_BUILD_VERSION
  );
  if (!patch) return;
  try {
    localStorage.setItem(ProzaEdit.Onboarding?.LAST_SESSION_SUMMARY_KEY || "pe-last-session-summary", JSON.stringify(patch));
  } catch (_) {}
}

function isOnboardingTourShellOpen() {
  const shell = getEl("peOnboardingTour");
  return !!shell && !shell.classList.contains("hidden");
}

function syncFirstAuditChecklistVisibility() {
  const el = getEl("peFirstAuditChecklist");
  if (!el) return;
  const show = ProzaEdit.Onboarding?.shouldShowFirstAuditChecklist?.({
    simpleModeFirstRunBannerVisible:
      !!getEl("peSimpleModeFirstRunBanner") && !getEl("peSimpleModeFirstRunBanner").classList.contains("hidden"),
    onboardingTourOpen: isOnboardingTourShellOpen(),
    onboardingTourPending: shouldOfferOnboardingTourNow(),
    checklistDismissed: isFirstAuditChecklistDismissed(),
  });
  if (!show) {
    el.open = false;
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
}

function initSessionTips() {
  const show = ProzaEdit.Onboarding?.shouldShowSessionTipsOnLoad?.({
    showSessionTips: isChecked("showSessionTips", true),
    firstRunComplete: configFirstRunComplete,
    simpleMode: isChecked("simpleMode", false),
  });
  if (!show) return;
  const dismissedKey = ProzaEdit.Onboarding?.SESSION_TIPS_DISMISSED_KEY || "pe-session-tips-dismissed";
  try {
    if (sessionStorage.getItem(dismissedKey) === "1") return;
  } catch (_) {}
  const el = getEl("peSessionTips");
  if (!el) return;
  el.classList.remove("hidden");
  if (ProzaEdit.TooltipRegistry?.refreshTooltips) {
    ProzaEdit.TooltipRegistry.refreshTooltips(isChecked("showHoverTips", true));
  }
}

function dismissSessionTips(dontShowAgain) {
  hideOnboardingBanner("peSessionTips");
  if (dontShowAgain) {
    permanentOffOnboardingPref("showSessionTips", "peSessionTips");
    return;
  }
  try {
    sessionStorage.setItem(ProzaEdit.Onboarding?.SESSION_TIPS_DISMISSED_KEY || "pe-session-tips-dismissed", "1");
  } catch (_) {}
  maybeInitOnboardingTour();
}

function initSimpleModeFirstRunBanner() {
  const el = getEl("peSimpleModeFirstRunBanner");
  if (!el) return;
  const show = ProzaEdit.Onboarding?.shouldShowSimpleModeFirstRunBanner?.({
    firstRunComplete: configFirstRunComplete,
    onboardingTourComplete: configOnboardingTourComplete,
    simpleMode: isChecked("simpleMode", false),
  });
  if (!show) {
    el.classList.add("hidden");
    return;
  }
  const body = getEl("peSimpleModeFirstRunBannerBody");
  if (body && ProzaEdit.Onboarding?.SIMPLE_MODE_FIRST_RUN_BANNER_LEAD) {
    body.textContent = ProzaEdit.Onboarding.SIMPLE_MODE_FIRST_RUN_BANNER_LEAD;
  }
  el.classList.remove("hidden");
  document.body.classList.add("pe-simple-first-run-active");
  syncFirstAuditChecklistVisibility();
}

function dismissSimpleModeFirstRunBanner(dontShowAgain) {
  hideOnboardingBanner("peSimpleModeFirstRunBanner");
  document.body.classList.remove("pe-simple-first-run-active");
  syncFirstAuditChecklistVisibility();
  if (dontShowAgain) {
    markFirstRunCompleteAndPersist();
    maybeInitOnboardingTour();
    return;
  }
  try {
    sessionStorage.setItem(
      ProzaEdit.Onboarding?.SIMPLE_MODE_FIRST_RUN_DISMISSED_KEY || "pe-simple-mode-first-run-dismissed",
      "1"
    );
  } catch (_) {}
  maybeInitOnboardingTour();
}

function isFirstAuditChecklistDismissed() {
  const key = ProzaEdit.Onboarding?.FIRST_AUDIT_CHECKLIST_DISMISSED_KEY || "pe-first-audit-checklist-dismissed";
  try {
    if (sessionStorage.getItem(key) === "1") return true;
  } catch (_) {}
  const details = getEl("peFirstAuditChecklist");
  return details ? !details.open : false;
}

function onboardingTourUiBlockingBanners() {
  const simpleEl = getEl("peSimpleModeFirstRunBanner");
  const tipsEl = getEl("peSessionTips");
  const checklist = getEl("peFirstAuditChecklist");
  return {
    simpleModeFirstRunBannerVisible:
      !!simpleEl && !simpleEl.classList.contains("hidden"),
    sessionTipsVisible: !!tipsEl && !tipsEl.classList.contains("hidden"),
    firstAuditChecklistExpanded: !!checklist && checklist.open && !checklist.classList.contains("hidden"),
    onboardingTourOpen: isOnboardingTourShellOpen(),
  };
}

function shouldOfferOnboardingTourNow() {
  return !!ProzaEdit.Onboarding?.shouldShowOnboardingTour?.({
    onboardingTourComplete: configOnboardingTourComplete,
    firstRunComplete: configFirstRunComplete,
    showSessionTips: isChecked("showSessionTips", true),
    checklistDismissed: isFirstAuditChecklistDismissed(),
  });
}

function markOnboardingTourCompleteAndPersist() {
  if (configOnboardingTourComplete) return;
  configOnboardingTourComplete = true;
  persistSettings(false);
}

function clearOnboardingTourAnchorHighlight() {
  document.querySelectorAll(".pe-tour-anchor-highlight").forEach((el) => {
    el.classList.remove("pe-tour-anchor-highlight");
  });
}

function closeOnboardingTourShell() {
  const shell = getEl("peOnboardingTour");
  if (!shell) return;
  shell.classList.add("hidden");
  shell.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pe-onboarding-tour-open");
  clearOnboardingTourAnchorHighlight();
  if (document.body.dataset.peTourKeydown) {
    document.removeEventListener("keydown", onboardingTourKeydownHandler);
    delete document.body.dataset.peTourKeydown;
  }
  syncFirstAuditChecklistVisibility();
  const prev = onboardingTourPreviousFocus;
  onboardingTourPreviousFocus = null;
  if (prev && typeof prev.focus === "function") prev.focus();
}

function onboardingTourKeydownHandler(e) {
  const shell = getEl("peOnboardingTour");
  if (!shell || shell.classList.contains("hidden")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    skipOnboardingTour();
    return;
  }
  if (e.key === "Tab") trapFocusWithin(e, shell.querySelector(".pe-onboarding-tour-panel"));
}

function renderOnboardingTourStep(stepIndex) {
  const stop = ProzaEdit.Onboarding?.getOnboardingTourStop?.(stepIndex);
  const shell = getEl("peOnboardingTour");
  if (!stop || !shell) return;
  onboardingTourActiveStep = stepIndex;
  const title = getEl("peOnboardingTourTitle");
  const body = getEl("peOnboardingTourBody");
  const progress = getEl("peOnboardingTourProgress");
  const btnNext = getEl("peOnboardingTourNext");
  const btnDone = getEl("peOnboardingTourDone");
  const total = ProzaEdit.Onboarding?.onboardingTourStopCount?.() || 3;
  if (title) title.textContent = stop.title;
  if (body) body.textContent = stop.body;
  if (progress) progress.textContent = `Step ${stepIndex + 1} of ${total}`;
  const isLast = stepIndex >= total - 1;
  if (btnNext) btnNext.classList.toggle("hidden", isLast);
  if (btnDone) btnDone.classList.toggle("hidden", !isLast);
  if (stop.tabId) showTab(stop.tabId);
  clearOnboardingTourAnchorHighlight();
  if (stop.anchorSelector) {
    const anchor = document.querySelector(stop.anchorSelector);
    if (anchor) {
      anchor.classList.add("pe-tour-anchor-highlight");
      try {
        anchor.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } catch (_) {}
    }
  }
  (isLast ? btnDone : btnNext)?.focus();
}

function openOnboardingTour(stepIndex) {
  const shell = getEl("peOnboardingTour");
  if (!shell || shell.classList.contains("hidden") === false) return;
  onboardingTourPreviousFocus = document.activeElement;
  shell.classList.remove("hidden");
  shell.setAttribute("aria-hidden", "false");
  document.body.classList.add("pe-onboarding-tour-open");
  syncFirstAuditChecklistVisibility();
  if (!document.body.dataset.peTourKeydown) {
    document.body.dataset.peTourKeydown = "1";
    document.addEventListener("keydown", onboardingTourKeydownHandler);
  }
  renderOnboardingTourStep(stepIndex || 0);
}

function maybeInitOnboardingTour() {
  if (!shouldOfferOnboardingTourNow()) return;
  const defer = ProzaEdit.Onboarding?.shouldDeferOnboardingTour?.(onboardingTourUiBlockingBanners());
  if (defer) return;
  openOnboardingTour(0);
}

function advanceOnboardingTour() {
  const total = ProzaEdit.Onboarding?.onboardingTourStopCount?.() || 3;
  if (onboardingTourActiveStep >= total - 1) {
    finishOnboardingTour();
    return;
  }
  renderOnboardingTourStep(onboardingTourActiveStep + 1);
}

function skipOnboardingTour() {
  markOnboardingTourCompleteAndPersist();
  closeOnboardingTourShell();
}

function finishOnboardingTour() {
  markOnboardingTourCompleteAndPersist();
  closeOnboardingTourShell();
}

function setupFirstAuditChecklistDismissTracking() {
  const el = getEl("peFirstAuditChecklist");
  if (!el || el.dataset.peTourBound) return;
  el.dataset.peTourBound = "1";
  el.addEventListener("toggle", () => {
    if (!el.open) {
      try {
        sessionStorage.setItem(
          ProzaEdit.Onboarding?.FIRST_AUDIT_CHECKLIST_DISMISSED_KEY || "pe-first-audit-checklist-dismissed",
          "1"
        );
      } catch (_) {}
    }
    maybeInitOnboardingTour();
  });
}

function updateAuditScopeFootnote() {
  const el = getEl("peAuditScopeFootnote");
  if (!el) return;
  if (!currentAuditSuggestions.length) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  const mode = lastAuditScopeModeAtRun || getScopeMode();
  const limit = ProzaEdit.ScopeReader?.getLimit?.(mode) || 450000;
  const excerptLen = (lastAuditExcerpt || "").length;
  const opts = {
    hadTruncation: lastAuditHadTruncation,
    scopeMode: mode,
    excerptCharLength: excerptLen,
    scopeLimit: limit,
  };
  const show = ProzaEdit.Onboarding?.shouldShowAuditScopeFootnote?.(opts);
  if (!show) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.textContent = ProzaEdit.Onboarding?.buildAuditScopeFootnoteCopy?.(opts) || "";
  el.classList.remove("hidden");
}

function initDarkAppearanceTip() {
  const el = getEl("peDarkAppearanceBanner");
  if (!el) return;
  const effective = document.documentElement.getAttribute("data-pe-theme") || "light";
  const show = ProzaEdit.Onboarding?.shouldShowDarkAppearanceTip?.({
    showDarkAppearanceTip: isChecked("showDarkAppearanceTip", true),
    effectiveTheme: effective,
  });
  if (!show) {
    el.classList.add("hidden");
    return;
  }
  const body = getEl("peDarkAppearanceBannerBody");
  if (body && ProzaEdit.Onboarding?.DARK_APPEARANCE_TIP_COPY) {
    body.textContent = ProzaEdit.Onboarding.DARK_APPEARANCE_TIP_COPY;
  }
  el.classList.remove("hidden");
}

function dismissDarkAppearanceTip(dontShowAgain) {
  hideOnboardingBanner("peDarkAppearanceBanner");
  if (dontShowAgain) {
    permanentOffOnboardingPref("showDarkAppearanceTip", "peDarkAppearanceBanner");
    return;
  }
  try {
    sessionStorage.setItem(
      ProzaEdit.Onboarding?.DARK_APPEARANCE_TIP_DISMISSED_KEY || "pe-dark-appearance-tip-dismissed",
      "1"
    );
  } catch (_) {}
}

function setupSettingsKeyboardShortcut() {
  if (document.body.dataset.peSettingsShortcut) return;
  document.body.dataset.peSettingsShortcut = "1";
  const handler = (e) => {
    const modal = getEl("pe-settings-modal");
    const inInput =
      e.target &&
      (e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT" ||
        e.target.isContentEditable);
    if (inInput && !e.altKey) return;
    const ctrlShiftComma = e.ctrlKey && e.shiftKey && !e.altKey && e.key === ",";
    const altShiftS = e.altKey && e.shiftKey && !e.ctrlKey && (e.key === "S" || e.key === "s");
    if (!ctrlShiftComma && !altShiftS) return;
    e.preventDefault();
    if (modal && !modal.classList.contains("hidden")) closeSettingsModal();
    else openSettingsModal();
  };
  window.addEventListener("keydown", handler);
}

function tryOpenSettingsFromLocationHash() {
  try {
    const section = ProzaEdit.UiPrefs?.parseSettingsHash?.(location.hash);
    if (section) openSettingsModal(section);
  } catch (_) {}
}

async function resetSettingsGroup(groupKey) {
  const norm = ProzaEdit.UiPrefs?.normalizeSettingsSection?.(groupKey) || groupKey;
  const labels = {
    safety: "Safety",
    onboarding: "Onboarding",
    appearance: "Appearance",
    audit: "Audit & reports",
    privacy: "Privacy & diagnostics",
    dictionary: "Dictionary",
    manuscript: "Manuscript context",
    "custom-style": "Custom style",
  };
  const label = labels[norm] || norm;
  if (norm === "reference") {
    showPeStatus("Reference capture has no defaults — use Capture when needed.", "warn");
    return;
  }
  if (
    !(await peConfirm({
      title: `Reset ${label}?`,
      message: `Reset ${label} to shipped defaults for this document?\n\nOther settings groups are unchanged.`,
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
    }))
  )
    return;
  const patch = ProzaEdit.UiPrefs?.getDefaultsPatchForGroup?.(norm);
  if (!patch) return;
  if (norm === "privacy") {
    ProzaEdit.Diagnostics?.setOptIn?.(false);
    const opt = getEl("peDiagnosticsOptIn");
    if (opt) opt.checked = false;
    const note = getEl("peDiagnosticsNote");
    if (note) note.value = "";
    showPeStatus(`${label} reset.`, "ok");
    return;
  }
  if (norm === "dictionary") {
    ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.DICTIONARY, "[]").then((ok) => {
      renderDictionaryList();
      showPeStatus(ok ? "Dictionary cleared." : "Could not clear dictionary.", ok ? "ok" : "warn");
    });
    return;
  }
  if (norm === "custom-style") {
    const empty = ProzaEdit.CustomStyleGuide?.normalize?.({ name: "My house style", rules: [] }) || {
      name: "My house style",
      rules: [],
    };
    ProzaEdit.Settings.setCustomStyleGuide(empty).then((ok) => {
      loadCustomStyleUi();
      updateCustomRulesSummary();
      showPeStatus(ok ? "Custom style rules cleared." : "Could not reset custom style.", ok ? "ok" : "warn");
    });
    return;
  }
  applyUiConfig({ ...collectUiConfig(), ...patch });
  if (norm === "audit") {
    setAuditExtended(!!patch.auditExtended);
    applyDefaultAuditFilterFromSettings();
  }
  if (norm === "safety") applySimpleMode();
  if (norm === "onboarding") {
    ProzaEdit.Onboarding?.clearAllSessionBannerDismissals?.();
    initWhatsNewBanner();
    initPriorSessionBanner();
    initSessionTips();
    initSimpleModeFirstRunBanner();
    initDarkAppearanceTip();
  }
  persistSettings(false);
  showPeStatus(`${label} reset to defaults.`, "ok");
}

function applyHoverTips() {
  const on = isChecked("showHoverTips", true);
  if (ProzaEdit.TooltipRegistry?.initTooltips) {
    ProzaEdit.TooltipRegistry.initTooltips(on);
  }
}

function buildAuditContext(options) {
  options = options || {};
  const scopeVal = getEl("scope")?.value || "selection";
  const fiction = isFictionManuscriptType();
  const fictionOn = (id) => fiction && isModuleEnabled(id);
  return {
    extendedLocal: !!options.extendedLocal,
    fkLock: isChecked("fkLock", false),
    scopeSelection: scopeVal === "selection",
    manuscriptType: getEl("manuscriptType")?.value || "Fiction (Thriller/Mystery/Crime)",
    targetAudience: getEl("targetAudience")?.value || "Adult",
    settingAnchor: getEl("settingAnchor")?.value || "",
    criticPersona: getEl("criticPersona")?.value || "Average Reader",
    language: getEl("language")?.value || "en-US",
    styleGuideRef: getEl("styleGuideRef")?.value || "auto",
    customStyleGuide: ProzaEdit.Settings.getCustomStyleGuide(),
    dictionary: ProzaEdit.Settings.getDictionary(),
    mutedRules: ProzaEdit.Settings.getMutedRules(),
    chkRep: isChecked("chkRep", true),
    chkProp: isChecked("chkProp", true),
    chkSpell: isChecked("chkSpell", true),
    chkAI: isChecked("chkAI", true),
    chkAIDetection: isChecked("chkAI", true),
    mPlot: fictionOn("mPlot"),
    mMotivation: fictionOn("mMotivation"),
    mDialogue: fictionOn("mDialogue"),
    mContinuity: fictionOn("mContinuity"),
    mPlausibility: fictionOn("mPlausibility"),
    mPacing: fictionOn("mPacing"),
    mSpoiler: fictionOn("mSpoiler"),
    reportDensity: getEl("reportDensity")?.value || "balanced",
    manuscriptContextIndex: getManuscriptContextIndex(),
    manuscriptContextFresh: ProzaEdit.ManuscriptContextIndex?.isFresh?.(
      getManuscriptContextIndex(),
      lastKnownParagraphTotal
    ),
  };
}

function getReportDensity() {
  return ProzaEdit.ReportDensity?.normalize?.(getEl("reportDensity")?.value) || "balanced";
}

function wordRun(label, fn) {
  return Word.run(fn).catch((e) => {
    console.error(label, e);
    throw e;
  });
}

function wordRecoveryMessage(error, action) {
  return (
    ProzaEdit.AuditReview?.recoveryMessage?.(error, action) ||
    error?.message ||
    "Word could not complete that action. Try again or reopen the task pane."
  );
}

function useSelectionEdits() {
  return !!document.getElementById("replaceInSelectionOnly")?.checked;
}

const PE_STATUS_AUTO_CLEAR_MS = 6000;
const PE_STATUS_WARN_CLEAR_MS = 20000;

function dismissPeStatus() {
  if (peStatusTimer) clearTimeout(peStatusTimer);
  peStatusTimer = null;
  const el = getEl("peStatus");
  if (el) {
    el.textContent = "";
    el.classList.remove("ok", "warn");
  }
  getEl("btnPeStatusDismiss")?.classList.add("hidden");
}

function showPeStatus(message, kind) {
  showPeStatusHtml(message, kind, false);
}

function showPeStatusHtml(html, kind, isHtml) {
  const el = getEl("peStatus");
  const dismissBtn = getEl("btnPeStatusDismiss");
  if (!el) return;
  if (isHtml || (html && String(html).includes("<"))) el.innerHTML = html || "";
  else el.textContent = html || "";
  el.classList.remove("ok", "warn");
  if (kind) el.classList.add(kind);
  el.setAttribute("aria-live", kind === "warn" ? "assertive" : "polite");
  if (peStatusTimer) clearTimeout(peStatusTimer);
  if (html) {
    dismissBtn?.classList.remove("hidden");
    peStatusTimer = setTimeout(() => dismissPeStatus(), kind === "warn" ? PE_STATUS_WARN_CLEAR_MS : PE_STATUS_AUTO_CLEAR_MS);
  } else {
    dismissBtn?.classList.add("hidden");
  }
}

function updateUndoRedoUi() {
  const u = getEl("btnUndo");
  const r = getEl("btnRedo");
  const last = getEl("btnGoLastEdit");
  const hist = ProzaEdit.EditHistory;
  const canUndo = !historyBusy && hist.canUndo();
  if (u) {
    u.disabled = !canUndo;
    const peek = hist.peekUndo();
    u.title = peek ? `Undo: ${peek.label} (Ctrl+Shift+Z)` : "Nothing to undo";
  }
  if (r) r.disabled = historyBusy || !hist.canRedo();
  const nav = hist.getLastNavigate?.();
  if (last) {
    last.disabled = historyBusy || !nav?.target;
    last.title = nav?.target
      ? `Go to last edit: ${nav.label || "edit"} — “${String(nav.target).slice(0, 48)}…”`
      : "Jump to where you last applied a ProzaEdit change";
  }
  document.querySelectorAll('.card-actions-trust [data-a="undo"]').forEach((btn) => {
    btn.disabled = !canUndo;
  });
}

function goToLastEdit() {
  const nav = ProzaEdit.EditHistory.getLastNavigate?.();
  if (!nav?.target || String(nav.target).startsWith("(")) {
    showPeStatus("No ProzaEdit edit location saved yet.", "warn");
    return;
  }
  goToIssue(nav.target);
}

let peEditLock = null;

function getEditLock() {
  if (!peEditLock) peEditLock = ProzaEdit.Recovery.createLock();
  return peEditLock;
}

async function swapTextInScope(fromText, toText, options) {
  return wordRun("pe-swap", (ctx) =>
    ProzaEdit.EditApply.swapText(ctx, fromText, toText, {
      searchInScope: (c, text) =>
        ProzaEdit.WordSafeNavigator.searchInScope(c, text, {
          ...options,
          selectionOnly: useSelectionEdits(),
        }),
      replaceLocation: Word.InsertLocation.replace,
    })
  );
}

async function applyDocumentEdit(beforeText, afterText, label, options) {
  const before = String(beforeText || "");
  const after = String(afterText || "");
  if (!before || before === after) return false;
  const release = getEditLock().tryAcquire();
  if (!release) {
    showPeStatus("Another edit is still being applied. Wait a moment, then try again.", "warn");
    return false;
  }
  historyBusy = true;
  updateUndoRedoUi();
  try {
    if (isChecked("remindVersionHistory", true) && !window._peVersionReminded) {
      window._peVersionReminded = true;
      showPeStatus("Tip: File → Version History before large edits.", "ok");
    }
    const level = parseInt(getEl("continuityWarnLevel")?.value, 10) || 3;
    let index = getManuscriptIndex();
    if (ProzaEdit.ManuscriptContextIndex?.continuityAugment) {
      index = ProzaEdit.ManuscriptContextIndex.continuityAugment(index, getManuscriptContextIndex());
    }
    const warnings = ProzaEdit.ContinuityGuard.assessReplace(before, after, index, level);
    if (warnings.length) {
      const block = ProzaEdit.ContinuityGuard.formatWarningBlock(warnings);
      const proceed = await peConfirm({
        title: "Continuity check",
        message: `Continuity check (local, 0 tokens):\n\n${block}\n\nApply this change anyway?\n(Cancel = skip; use Dismiss on card to silence similar warnings.)`,
        confirmLabel: "Apply anyway",
        cancelLabel: "Skip",
      });
      if (!proceed) return false;
      warnings.forEach((w) => ProzaEdit.ContinuityGuard.dismissWarningKey(w.key));
    }
    if (!(await confirmBeforeApply(`Replace "${before}" with "${after}"?`))) return false;
    const searchOpts = options && options.forceDocument ? { forceDocument: true } : {};
    try {
      await swapTextInScope(before, after, searchOpts);
    } catch (e) {
      reportActionError(e, "apply this edit", {
        retry: { label: "Apply", run: () => applyDocumentEdit(before, after, label, options) },
      });
      return false;
    }
    ProzaEdit.EditHistory.record(before, after, label);
    clearRetry();
    showPeStatus(`Applied: ${label}`, "ok");
    try {
      options?.onSuccess?.();
    } catch (e) {
      console.error(e);
    }
    return true;
  } catch (e) {
    reportActionError(e, "apply this edit");
    return false;
  } finally {
    release();
    historyBusy = false;
    updateUndoRedoUi();
  }
}

async function runHistoryEdit(popFn, revertFn, from, to, doneLabel, action) {
  if (historyBusy || !popFn.can()) return;
  const release = getEditLock().tryAcquire();
  if (!release) return;
  const entry = popFn.pop();
  if (!entry) {
    release();
    return;
  }
  historyBusy = true;
  updateUndoRedoUi();
  try {
    await swapTextInScope(entry[from], entry[to]);
    showPeStatus(`${doneLabel}: ${entry.label}`, "ok");
  } catch (e) {
    revertFn(entry);
    reportActionError(e, action);
  } finally {
    release();
    historyBusy = false;
    updateUndoRedoUi();
  }
}

function prozaEditUndo() {
  const hist = ProzaEdit.EditHistory;
  return runHistoryEdit(
    { can: () => hist.canUndo(), pop: () => hist.popUndo() },
    (entry) => hist.revertPopUndo(entry),
    "after",
    "before",
    "Undid",
    "undo this edit"
  );
}

function prozaEditRedo() {
  const hist = ProzaEdit.EditHistory;
  return runHistoryEdit(
    { can: () => hist.canRedo(), pop: () => hist.popRedo() },
    (entry) => hist.revertPopRedo(entry),
    "before",
    "after",
    "Redid",
    "redo this edit"
  );
}

function setupUndoRedoShortcuts() {
  document.addEventListener("keydown", (e) => {
    if (!e.ctrlKey || !e.shiftKey || e.altKey) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "Z" || e.key === "z") {
      e.preventDefault();
      prozaEditUndo();
    } else if (e.key === "Y" || e.key === "y") {
      e.preventDefault();
      prozaEditRedo();
    }
  });
}

async function readScopeText(context, longOpController) {
  const mode = getScopeMode();
  const opts = getScopeOptions();
  const cap = getScopeCharLimit(mode);
  if (opts.mode === "selected-chapters" || opts.mode === "chapter" || opts.mode === "chapter-range") {
    opts.chapters = scopeChapterListCache;
  }
  const resumeHint = ProzaEdit.ScopeReader.readScopeResumeSnapshot?.();
  if (longOpController) {
    opts.cancelCheck = () => longOpController.throwIfCancelled();
    opts.maxChars = cap;
    opts.onProgress = (partial) => {
      longOpController.setStatus(
        ProzaEdit.ScopeReader.formatReadStatus({
          phase: "Reading document",
          scopeLabel: partial.scopeLabel || measuredLabel(mode),
          charCap: cap,
          ...partial,
        })
      );
      if (partial.paragraphTotal > 0) {
        ProzaEdit.ScopeReader.writeScopeResumeSnapshot({
          mode,
          paragraphsLoaded: partial.paragraphsLoaded,
          paragraphTotal: partial.paragraphTotal,
          at: Date.now(),
        });
      }
    };
    if (resumeHint && resumeHint.mode === mode && resumeHint.paragraphsLoaded > 0) {
      longOpController.setStatus(
        `Reading document — last run stopped near paragraph ${resumeHint.paragraphsLoaded}/${resumeHint.paragraphTotal || "?"}.`
      );
    }
  }
  const measured = await ProzaEdit.ScopeReader.measureScope(context, opts);
  const text = measured.text || "";
  if (!text.trim()) {
    if (mode === "selection") throw new Error("Highlight text in Word, or choose page/chapter/full scope.");
    throw new Error("No text for this scope.");
  }
  if (text.length > MAX_BODY && mode === "full") throw new Error("Document too large—use chapter range or section loop.");
  const soft = ProzaEdit.ScopeReader.softCapThreshold(cap);
  if (longOpController && text.length >= soft && text.length <= cap) {
    longOpController.setStatus(
      ProzaEdit.ScopeReader.formatReadStatus({
        phase: "Reading document",
        charCount: text.length,
        charCap: cap,
        scopeLabel: measured.label || measuredLabel(mode),
      })
    );
  }
  if (text.length > cap) {
    throw new Error(`Scope ~${text.length.toLocaleString()} chars exceeds limit ${cap.toLocaleString()}. Narrow the range.`);
  }
  return text;
}

function measuredLabel(mode) {
  const m = String(mode || getScopeMode());
  if (m === "full") return "full manuscript";
  if (m === "selection") return "selection";
  return m;
}

async function readChatContext(context) {
  if (isChecked("chatSelectionOnly", true)) {
    const sel = context.document.getSelection();
    sel.load("text");
    await context.sync();
    const t = (sel.text || "").trim();
    if (!t) throw new Error("Highlight text for chat context.");
    return t.substring(0, MAX_CHAT);
  }
  const body = context.document.body;
  body.load("text");
  await context.sync();
  return (body.text || "").substring(0, MAX_CHAT);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/* Dictionary */
async function addDictionaryWordFromCard(raw) {
  const w = String(raw || "").trim().split(/\s+/)[0];
  if (!w || w.startsWith("(") || w.length > 80) {
    showPeStatus("Cannot add this term.", "warn");
    return;
  }
  const ok = await ProzaEdit.Settings.addDictionaryWord(w);
  if (ok) {
    renderDictionaryList();
    showPeStatus(`Added “${w}” to dictionary.`, "ok");
  }
}

async function addDictionaryWord() {
  const input = getEl("dictInput");
  if (!input) return;
  const ok = await ProzaEdit.Settings.addDictionaryWord(input.value);
  if (ok) {
    input.value = "";
    renderDictionaryList();
    persistSettings(false);
  }
}

async function removeDictionaryWord(word) {
  await ProzaEdit.Settings.removeDictionaryWord(word);
  renderDictionaryList();
}

function updateDictionaryCountBadge() {
  const badge = getEl("dictCountBadge");
  if (!badge) return;
  const n = ProzaEdit.Settings.getDictionary().length;
  badge.textContent = String(n);
  badge.classList.toggle("hidden", n === 0);
}

function renderDictionaryList() {
  const el = document.getElementById("dictList");
  if (!el) return;
  const filter = String(getEl("dictFilter")?.value || "")
    .trim()
    .toLowerCase();
  const words = ProzaEdit.Settings.getDictionary();
  updateDictionaryCountBadge();
  const addFromMute = getEl("btnDictFromLastMute");
  if (addFromMute) {
    addFromMute.disabled = !lastMutedDictionaryCandidate;
    addFromMute.title = lastMutedDictionaryCandidate
      ? `Add “${lastMutedDictionaryCandidate}” from your last Mute`
      : "Mute a finding first to enable this shortcut";
  }
  const filtered = filter ? words.filter((w) => w.toLowerCase().includes(filter)) : words;
  if (!words.length) {
    el.innerHTML = "<span style='color:var(--text-muted);font-size:10px;'>No custom terms yet.</span>";
    return;
  }
  if (!filtered.length) {
    el.innerHTML = "<span style='color:var(--text-muted);font-size:10px;'>No matches for this filter.</span>";
    return;
  }
  el.innerHTML = filtered
    .map(
      (w) =>
        `<span class="tag pe-dict-tag" data-dict="${escapeAttr(w)}">${escapeHtml(w)}` +
        `<button type="button" class="pe-dict-remove" data-dict-remove="${escapeAttr(w)}" aria-label="Remove ${escapeAttr(w)}">×</button></span>`
    )
    .join("");
  el.querySelectorAll("[data-dict-remove]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      removeDictionaryWord(btn.getAttribute("data-dict-remove"));
    });
  });
}

async function addDictionaryFromLastMute() {
  const w = String(lastMutedDictionaryCandidate || "").trim();
  if (!w) {
    showPeStatus("Mute a name-like finding first, then use Add from last Mute.", "warn");
    return;
  }
  const ok = await ProzaEdit.Settings.addDictionaryWord(w);
  if (ok) {
    renderDictionaryList();
    persistSettings(false);
    showPeStatus(`Added “${w}” to dictionary (saved in this document).`, "ok");
  }
}

async function copyDictionaryExport() {
  const json = ProzaEdit.Settings.exportDictionaryJson();
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(json);
    else if (!fallbackCopyText(json)) throw new Error("copy blocked");
    showPeStatus("Dictionary JSON copied — paste into a backup file or another document’s Import box.", "ok");
  } catch (_) {
    showPeStatus("Copy failed. Select the Import/Export textarea manually.", "warn");
  }
}

async function importDictionaryFromTextarea() {
  const ta = getEl("dictImportArea");
  if (!ta) return;
  const result = await ProzaEdit.Settings.importDictionaryJson(ta.value);
  if (!result.ok) {
    showPeStatus("Import failed — use a JSON array of strings, e.g. [\"McGuffin\",\"Arrakis\"].", "warn");
    return;
  }
  ta.value = "";
  renderDictionaryList();
  persistSettings(false);
  showPeStatus(`Dictionary import: ${result.added} new term(s); ${result.total} total in this document.`, "ok");
}

async function resetMutedRules() {
  await ProzaEdit.Settings.resetMutedRules();
  showPeStatus("Muted rules cleared. Re-run audit.", "ok");
}

/* Custom style guide */
function isCustomStyleGuideMode() {
  const v = getEl("styleGuideRef")?.value;
  return v === "custom" || v === "custom-plus-auto";
}

function isStyleGuideFinding(item) {
  const mod = String(item?.module || "");
  const rid = String(item?.ruleId || "");
  return mod === "Style guide" || mod.startsWith("Style guide (") || mod === "Editorial consistency" || rid.startsWith("sg:");
}

function toggleCustomStylePanel() {
  const panel = getEl("customStyleGuidePanel");
  const on = isCustomStyleGuideMode();
  if (panel) panel.classList.toggle("hidden", !on);
  const summary = getEl("targetCustomRulesSummary");
  if (summary) summary.classList.toggle("hidden", !on);
  updateCustomRulesSummary();
  updateActiveChecksHint();
  updateWorkflowStatusLine();
}

function loadCustomStyleUi() {
  const data = ProzaEdit.Settings.getCustomStyleGuide();
  const nameEl = getEl("customStyleName");
  if (nameEl) nameEl.value = data.name || "My house style";
  renderCustomStyleRulesList();
  updateCustomRulesSummary();
  const nameInput = getEl("customStyleName");
  if (nameInput && !nameInput.dataset.bound) {
    nameInput.dataset.bound = "1";
    nameInput.addEventListener("change", () => saveCustomStyleFromUi());
    nameInput.addEventListener("blur", () => saveCustomStyleFromUi());
  }
}

function renderCustomStyleRulesList() {
  const el = getEl("customStyleRulesList");
  if (!el) return;
  const data = ProzaEdit.Settings.getCustomStyleGuide();
  if (!data.rules.length) {
    el.innerHTML = "<span style='color:var(--text-muted);font-size:10px;'>No custom rules yet. Add phrases your house style avoids.</span>";
    return;
  }
  el.innerHTML = data.rules
    .map((r) => {
      const label = r.replace ? `${r.find} → ${r.replace}` : r.find;
      return `<span class="tag" data-custom-rule="${escapeAttr(r.id)}" title="${escapeAttr(r.hint || "")}">${escapeHtml(label)} ×</span>`;
    })
    .join("");
  el.querySelectorAll("[data-custom-rule]").forEach((tag) => {
    tag.addEventListener("click", () => removeCustomStyleRule(tag.dataset.customRule));
  });
  updateCustomRulesSummary();
}

async function saveCustomStyleFromUi() {
  const data = ProzaEdit.Settings.getCustomStyleGuide();
  data.name = getEl("customStyleName")?.value.trim() || data.name;
  const ok = await ProzaEdit.Settings.setCustomStyleGuide(data);
  if (ok) {
    updateActiveChecksHint();
    schedulePersistSettings();
  }
  return ok;
}

async function addCustomStyleRule() {
  const find = getEl("customStyleFind")?.value.trim();
  if (!find) {
    showPeStatus("Enter a phrase to find.", "warn");
    return;
  }
  const rule = ProzaEdit.CustomStyleGuide.normalizeRule({
    find,
    replace: getEl("customStyleReplace")?.value.trim(),
    hint: getEl("customStyleHint")?.value.trim(),
  });
  if (!rule) {
    showPeStatus("Rule too long or invalid.", "warn");
    return;
  }
  const data = ProzaEdit.CustomStyleGuide.mergeRules(ProzaEdit.Settings.getCustomStyleGuide(), [rule]);
  const ok = await ProzaEdit.Settings.setCustomStyleGuide(data);
  if (!ok) {
    showPeStatus("Could not save (limit reached?).", "warn");
    return;
  }
  getEl("customStyleFind").value = "";
  getEl("customStyleReplace").value = "";
  getEl("customStyleHint").value = "";
  renderCustomStyleRulesList();
  if (!isCustomStyleGuideMode()) {
    getEl("styleGuideRef").value = "custom-plus-auto";
    toggleCustomStylePanel();
  }
  schedulePersistSettings();
  showPeStatus("Custom style rule added.", "ok");
}

async function addCustomStyleFromCard(item) {
  const find = String(item?.targetText || "").trim();
  if (!find || find.startsWith("(") || find.length > 120) {
    showPeStatus("Cannot save this finding as a house rule.", "warn");
    return;
  }
  const replace = String(item?.replacementText || "").trim();
  const hint = String(item?.explanation || "").slice(0, 200);
  const rule = ProzaEdit.CustomStyleGuide.normalizeRule({
    find,
    replace: replace.startsWith("(") ? "" : replace,
    hint,
  });
  if (!rule) return;
  const data = ProzaEdit.CustomStyleGuide.mergeRules(ProzaEdit.Settings.getCustomStyleGuide(), [rule]);
  await ProzaEdit.Settings.setCustomStyleGuide(data);
  renderCustomStyleRulesList();
  if (!isCustomStyleGuideMode()) {
    getEl("styleGuideRef").value = "custom-plus-auto";
    toggleCustomStylePanel();
  }
  schedulePersistSettings();
  showPeStatus("Saved to house style rules.", "ok");
}

async function copyCustomStyleRulesToClipboard() {
  const text = ProzaEdit.CustomStyleGuide.exportLines(ProzaEdit.Settings.getCustomStyleGuide());
  if (!text) {
    showPeStatus("No custom rules to copy.", "warn");
    return;
  }
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else if (!fallbackCopyText(text)) throw new Error("copy blocked");
    showPeStatus("Custom rules copied — paste into another doc or bulk import.", "ok");
  } catch (_) {
    if (fallbackCopyText(text)) showPeStatus("Custom rules copied.", "ok");
    else showPeStatus("Copy failed. Select the text and press Ctrl+C.", "warn");
  }
}

async function loadCustomStylePreset(presetId) {
  const preset = ProzaEdit.CustomStyleGuide.getPreset(presetId);
  if (!preset) return;
  const data = ProzaEdit.CustomStyleGuide.mergeRules(ProzaEdit.Settings.getCustomStyleGuide(), preset.rules);
  data.name = preset.name;
  await ProzaEdit.Settings.setCustomStyleGuide(data);
  getEl("customStyleName").value = preset.name;
  renderCustomStyleRulesList();
  if (!isCustomStyleGuideMode()) {
    getEl("styleGuideRef").value = "custom-plus-auto";
    toggleCustomStylePanel();
  }
  schedulePersistSettings();
  showPeStatus(`Loaded ${preset.name} rules.`, "ok");
}

async function removeCustomStyleRule(ruleId) {
  const data = ProzaEdit.Settings.getCustomStyleGuide();
  data.rules = data.rules.filter((r) => r.id !== ruleId);
  await ProzaEdit.Settings.setCustomStyleGuide(data);
  renderCustomStyleRulesList();
  showPeStatus("Rule removed.", "ok");
}

async function importCustomStyleBulk() {
  const raw = getEl("customStyleBulk")?.value || "";
  const incoming = ProzaEdit.CustomStyleGuide.parseBulk(raw);
  if (!incoming.length) {
    showPeStatus("No valid lines to import.", "warn");
    return;
  }
  const data = ProzaEdit.CustomStyleGuide.mergeRules(ProzaEdit.Settings.getCustomStyleGuide(), incoming);
  const ok = await ProzaEdit.Settings.setCustomStyleGuide(data);
  if (!ok) {
    showPeStatus("Import too large — max 60 rules.", "warn");
    return;
  }
  getEl("customStyleBulk").value = "";
  renderCustomStyleRulesList();
  if (!isCustomStyleGuideMode()) {
    getEl("styleGuideRef").value = "custom-plus-auto";
    toggleCustomStylePanel();
  }
  schedulePersistSettings();
  showPeStatus(`Imported ${incoming.length} rule(s).`, "ok");
}

/* Thesaurus */
function runThesaurusLookup() {
  const inputEl = getEl("thesaurusInput");
  const box = getEl("thesaurusResults");
  if (!box) return;
  const input = inputEl?.value.trim() || "";
  if (!input) {
    wordRun("thes-sel", async (ctx) => {
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      const t = sel.text.trim();
      if (!t || t.length > 120) {
        box.innerText = "Select one word/short phrase.";
        return;
      }
      document.getElementById("thesaurusInput").value = t;
      await renderThesaurus(t, box);
    }).catch((e) => (box.innerText = wordRecoveryMessage(e, "read your selection")));
    return;
  }
  renderThesaurus(input, box).catch(() => (box.innerText = "Lookup failed."));
}

function setupThesaurusDelegation() {
  const box = document.getElementById("thesaurusResults");
  if (!box || box.dataset.bound) return;
  box.dataset.bound = "1";
  box.addEventListener("click", (e) => {
    const tag = e.target.closest(".tag[data-target][data-replacement]");
    if (tag) replaceWithWord(tag.dataset.target, tag.dataset.replacement);
  });
}

async function renderThesaurus(word, box) {
  if (!box) return;
  box.innerHTML = "Searching…";
  const token = word.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z'-]/gi, "");
  if (!token) {
    box.innerText = "Invalid word.";
    return;
  }
  let syn = [];
  let ant = [];
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 8000);
    const [rs, ra] = await Promise.all([
      fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(token)}&max=10`, { signal: ctrl.signal }),
      fetch(`https://api.datamuse.com/words?rel_ant=${encodeURIComponent(token)}&max=8`, { signal: ctrl.signal }),
    ]);
    if (rs.ok) syn = (await rs.json()).map((x) => x.word);
    if (ra.ok) ant = (await ra.json()).map((x) => x.word);
  } catch (_) {}
  if (!syn.length) syn = ["sharp", "direct", "plain"].map((x) => `${x} ${token}`);
  let html = `<strong>${escapeHtml(token)}</strong><br/><em>Synonyms</em><br/>`;
  syn.forEach((s) => {
    html += `<span class="tag" data-target="${escapeAttr(token)}" data-replacement="${escapeAttr(s)}">${escapeHtml(s)}</span>`;
  });
  if (ant.length) {
    html += `<br/><em>Antonyms</em><br/>`;
    ant.forEach((a) => {
      html += `<span class="tag" data-target="${escapeAttr(token)}" data-replacement="${escapeAttr(a)}">${escapeHtml(a)}</span>`;
    });
  }
  box.innerHTML = html;
}

function replaceWithWord(target, replacement) {
  applyDocumentEdit(target, replacement, "Thesaurus");
}

/* Audit — pins, filter, Copilot copy */
function cloneSelectOptions(fromId, toId) {
  const from = getEl(fromId);
  const to = getEl(toId);
  if (!from || !to) return;
  to.innerHTML = from.innerHTML;
  to.value = from.value;
}

function syncAuditPinsFromMain() {
  AUDIT_PIN_FIELDS.forEach(([mainId, pinId]) => {
    const main = getEl(mainId);
    const pin = getEl(pinId);
    if (main && pin) pin.value = main.value;
  });
}

function syncMainFromPin(mainId, pinId, adaptFiction) {
  const main = getEl(mainId);
  const pin = getEl(pinId);
  if (!main || !pin) return;
  main.value = pin.value;
  if (adaptFiction) adaptModules();
  persistSettings(false);
}

function setupAuditPins() {
  AUDIT_PIN_FIELDS.forEach(([mainId, pinId, adaptFiction]) => {
    cloneSelectOptions(mainId, pinId);
    const pin = getEl(pinId);
    if (pin && !pin.dataset.bound) {
      pin.dataset.bound = "1";
      pin.addEventListener("change", () => syncMainFromPin(mainId, pinId, adaptFiction));
    }
  });
}

function setupMainTargetSync() {
  AUDIT_PIN_FIELDS.forEach(([mainId, pinId, adaptFiction]) => {
    const main = getEl(mainId);
    if (!main || main.dataset.pinSync) return;
    main.dataset.pinSync = "1";
    main.addEventListener("change", () => {
      const pin = getEl(pinId);
      if (pin) pin.value = main.value;
      if (adaptFiction) adaptModules();
    });
  });
}

function updateAuditFilterChips() {
  document.querySelectorAll(".chip[data-audit-filter]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.auditFilter === auditCardFilter);
    if (btn.dataset.auditFilter === "all" && currentAuditSuggestions.length) {
      btn.textContent = `All (${currentAuditSuggestions.length})`;
    } else if (btn.dataset.auditFilter === "confirmed") {
      const n = currentAuditSuggestions.filter((s) => s.type === "confirmed").length;
      btn.textContent = ProzaEdit.PlainLanguage?.auditFilterChipText
        ? ProzaEdit.PlainLanguage.auditFilterChipText("confirmed", n, isChecked("simpleMode", false))
        : n
          ? `Critical (${n})`
          : "Critical";
    } else if (btn.dataset.auditFilter === "preference") {
      const n = currentAuditSuggestions.filter((s) => s.type !== "confirmed").length;
      btn.textContent = n ? `Style (${n})` : "Style";
    } else if (btn.dataset.auditFilter === "styleguide") {
      const n = currentAuditSuggestions.filter((s) => isStyleGuideFinding(s)).length;
      btn.textContent = n ? `Style guide (${n})` : "Style guide";
    }
  });
}

function setAuditCardFilter(mode) {
  if (!["all", "confirmed", "preference", "styleguide"].includes(mode)) return;
  auditCardFilter = mode;
  updateAuditFilterChips();
  applyAuditCardFilter();
  syncSettingsDefaultAuditFilterSelect();
  updateAuditDefaultFilterHint();
  updateReviewModeAuditHint();
  updateSimpleModeAuditBanner();
  persistSettings(false);
}

function updateAuditSortChips() {
  document.querySelectorAll(".chip[data-audit-sort]").forEach((btn) => {
    btn.classList.toggle("chip-active", btn.dataset.auditSort === auditCardSort);
  });
}

function setAuditCardSort(mode) {
  if (!["priority", "module"].includes(mode)) return;
  auditCardSort = mode;
  updateAuditSortChips();
  applyAuditCardFilter();
  persistSettings(false);
}

function sortAuditList(list) {
  const arr = list.slice();
  if (auditCardSort === "module") {
    arr.sort((a, b) => String(a.module || "").localeCompare(String(b.module || "")));
    return arr;
  }
  arr.sort((a, b) => {
    if (a.type === "confirmed" && b.type !== "confirmed") return -1;
    if (b.type === "confirmed" && a.type !== "confirmed") return 1;
    return String(a.module || "").localeCompare(String(b.module || ""));
  });
  return arr;
}

function filteredAuditSuggestions() {
  let list = currentAuditSuggestions;
  if (auditCardFilter === "confirmed") list = list.filter((s) => s.type === "confirmed");
  else if (auditCardFilter === "preference") list = list.filter((s) => s.type !== "confirmed");
  else if (auditCardFilter === "styleguide") list = list.filter((s) => isStyleGuideFinding(s));
  return sortAuditList(list);
}

function setAuditSuggestions(list) {
  currentAuditSuggestions = Array.isArray(list) ? list.filter((s) => s && typeof s === "object") : [];
  updateAuditFilterChips();
  updateAuditTabBadge();
  applyAuditCardFilter();
  updateWorkflowNextStepHint();
  const activeTab = TAB_IDS.find((id) => document.getElementById(id)?.classList.contains("active"));
  if (activeTab) updateWorkflowStepper(activeTab);
}

function applyAuditCardFilter(options) {
  options = options || {};
  if (!options.preserveDisplayLimit) resetAuditCardDisplayLimit();
  renderAuditCards(filteredAuditSuggestions());
}

function showAuditEmptyIfNeeded() {
  if (auditBusy || deepBusy) return;
  const box = getEl("cardContainer");
  if (!box || box.querySelector(".card")) return;
  const summary = getEl("summaryReport");
  const sumText = (summary?.innerText || "").trim();
  if (/Words:\s*\d+/i.test(sumText) || /Score\s+[\d.]+/i.test(sumText)) {
    if (!box.innerHTML.trim()) box.innerHTML = "<p>No issues (or all rules muted).</p>";
    return;
  }
  if (currentAuditSuggestions.length) return;
  if (sumText && !/Run audit|Running|Deep audit/i.test(sumText)) return;
  const hint = getManuscriptTypeAwareHint();
  box.innerHTML = hint
    ? AUDIT_EMPTY_HTML.replace(
        "</div>",
        `<p class="audit-type-hint">${escapeHtml(hint)}</p></div>`
      )
    : AUDIT_EMPTY_HTML;
}

function buildCopilotAuditText() {
  const lines = [];
  lines.push("ProzaEdit audit — paste into Word Copilot");
  lines.push("");
  const summary = getEl("summaryReport");
  if (summary) lines.push(summary.innerText.trim());
  lines.push("");
  lines.push("Findings (prioritize in my voice; avoid AI clichés):");
  const src = filteredAuditSuggestions().length ? filteredAuditSuggestions() : currentAuditSuggestions;
  src.slice(0, 30).forEach((s, i) => {
    lines.push(`${i + 1}. [${s.type}] ${s.module}: ${s.explanation}`);
    if (s.targetText && s.targetText !== "(truncated)") lines.push(`   Passage: "${s.targetText}"`);
    if (s.replacementText && !String(s.replacementText).startsWith("(")) {
      lines.push(`   Try: "${s.replacementText}"`);
    }
  });
  lines.push("");
  lines.push(buildManuscriptProfile());
  return lines.join("\n").substring(0, 14000);
}

function fallbackCopyText(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (_) {}
  document.body.removeChild(ta);
  return ok;
}

async function copyFeedbackLetter() {
  if (!lastFeedbackLetter && !currentAuditSuggestions.length) {
    showPeStatus("Run an audit first.", "warn");
    return;
  }
  const text =
    lastFeedbackLetter ||
    (ProzaEdit.ManuscriptOverview?.buildFeedbackLetter
      ? ProzaEdit.ManuscriptOverview.buildFeedbackLetter(
          lastAuditExcerpt,
          buildAuditContext(),
          lastAuditMeta,
          currentAuditSuggestions
        )
      : "");
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else if (!fallbackCopyText(text)) throw new Error("copy blocked");
    showPeStatus("Feedback letter copied (0 tokens).", "ok");
  } catch (_) {
    if (fallbackCopyText(text)) showPeStatus("Feedback letter copied.", "ok");
    else showPeStatus("Copy failed. Select the text and press Ctrl+C.", "warn");
  }
}

function auditReportInput() {
  return {
    suggestions: currentAuditSuggestions,
    excerpt: lastAuditExcerpt,
    feedbackLetter: lastFeedbackLetter,
    meta: lastAuditMeta,
    buildContext: buildAuditContext,
  };
}

function auditReportUiHooks() {
  return { showPeStatus, alert, confirmAsync: (msg, opts) => peConfirm(typeof msg === "string" ? { message: msg, ...opts } : msg), wordRun };
}

function buildAuditReportPlainText() {
  return ProzaEdit.ReportDocxExport.buildAuditReportPlainText(auditReportInput());
}

function insertAuditReportInWord() {
  ProzaEdit.ReportDocxExport.insertAuditReportInWord(buildAuditReportPlainText(), auditReportUiHooks());
}

function downloadAuditReportFile(ext) {
  ProzaEdit.ReportDocxExport.downloadAuditReportFile(ext, buildAuditReportPlainText(), auditReportUiHooks());
}

async function exportAuditReportNewWordDoc() {
  await ProzaEdit.ReportDocxExport.exportComprehensiveWordReport(buildAuditReportPlainText(), auditReportUiHooks());
}

function exportAuditReportPdfGuide() {
  ProzaEdit.ReportDocxExport.exportAuditReportPdfGuide(buildAuditReportPlainText(), auditReportUiHooks());
}

function readAiQuotaLimitsFromDom() {
  return ProzaEdit.AIQuotaManager.readLimitsFromConfig({
    aiEnforceSessionCeiling: isChecked("aiEnforceSessionCeiling", false),
    aiMaxSessionTokens: getEl("aiMaxSessionTokens")?.value,
  });
}

function resetAiSessionTokens() {
  ProzaEdit.AIQuotaManager.resetSessionTokens();
  showPeStatus("Gemini session token counter reset (this browser tab).", "ok");
}

async function geminiGenerateWithQuota(prompt, generationConfig, outputReserve, signal) {
  const reserve = outputReserve != null ? outputReserve : generationConfig?.maxOutputTokens || 1024;
  const estimated = ProzaEdit.AIQuotaManager.estimateTokens(prompt) + reserve;
  const gate = ProzaEdit.AIQuotaManager.canExecute(estimated, readAiQuotaLimitsFromDom());
  if (!gate.ok) throw new Error(gate.message || "Session token ceiling reached.");
  const reply = await ProzaEdit.Gemini.generate(getApiKey(), prompt, generationConfig, { signal });
  ProzaEdit.AIQuotaManager.recordUsage(estimated);
  return reply;
}

async function copyAuditForCopilotFromAnywhere() {
  if (!currentAuditSuggestions.length) {
    showPeStatus("Run an audit first, then copy for Copilot.", "warn");
    showTab("tab3");
    return;
  }
  showTab("tab4");
  await copyAuditForCopilot();
}

async function copyAuditForCopilot() {
  if (!currentAuditSuggestions.length) {
    showPeStatus("Run an audit first.", "warn");
    return;
  }
  const text = buildCopilotAuditText();
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
    else if (!fallbackCopyText(text)) throw new Error("copy blocked");
    showPeStatus("Copied — paste into Word Copilot.", "ok");
  } catch (_) {
    if (fallbackCopyText(text)) showPeStatus("Copied — paste into Word Copilot.", "ok");
    else showPeStatus("Copy failed. Use Ctrl+C after selecting the summary text.", "warn");
  }
}

/* Audit */
function setModuleButtonsDisabled(on) {
  document.querySelectorAll("#tab3 button, #tab4 .audit-run-hub button, .pe-toolbar .btn-tool-accent").forEach((b) => {
    b.disabled = on;
  });
}

function renderTraffic(traffic, score) {
  const bar = document.getElementById("trafficBar");
  if (!bar) return;
  bar.classList.remove("hidden", "traffic-green", "traffic-yellow", "traffic-red");
  bar.classList.add(`traffic-${traffic.level}`);
  bar.textContent = `${traffic.label} — Score ${score} / 10`;
}

function renderMiniScores(scores) {
  const el = getEl("miniScores");
  if (!el || !scores) return;
  el.classList.remove("hidden");
  el.innerHTML = `<span>Correctness ${scores.correctness}/10</span><span>Clarity ${scores.clarity}/10</span><span>Engagement ${scores.engagement}/10</span>`;
}

function finalizeAudit(result, label) {
  const suggestions = result.suggestions || [];
  const metrics = result.metrics || ProzaEdit.Metrics.analyze("");
  const criticalCount = suggestions.filter((s) => s.type === "confirmed").length;
  const prefCount = suggestions.filter((s) => s.type === "preference").length;
  let score = result.score;
  if (score == null) {
    const w =
      ProzaEdit.Audit.PERSONA_WEIGHTS[getEl("criticPersona")?.value] || ProzaEdit.Audit.PERSONA_WEIGHTS["Average Reader"];
    score = Math.max(5, Math.round((10 - criticalCount * w.c - prefCount * w.p) * 10) / 10);
  }
  const traffic = result.traffic || ProzaEdit.Metrics.trafficLight(score);
  renderTraffic(traffic, score);
  if (getReportDensity() !== "light" && ProzaEdit.DocAnalytics?.computeMiniScores) {
    lastMiniScores = ProzaEdit.DocAnalytics.computeMiniScores(suggestions, metrics, lastAuditExcerpt);
    renderMiniScores(lastMiniScores);
  } else {
    lastMiniScores = null;
    getEl("miniScores")?.classList.add("hidden");
  }
  let compareLine = "";
  try {
    const prevRaw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.LAST_AUDIT_STATS);
    const prev = prevRaw ? (typeof prevRaw === "string" ? JSON.parse(prevRaw) : prevRaw) : null;
    if (prev && prev.critical != null) {
      const delta = criticalCount - prev.critical;
      compareLine = `Vs last run: ${delta > 0 ? "+" : ""}${delta} critical (${prev.critical} → ${criticalCount}).`;
    }
  } catch (_) {}
  let refLine = "";
  try {
    const refRaw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.REFERENCE_STYLE);
    const ref = refRaw ? (typeof refRaw === "string" ? JSON.parse(refRaw) : refRaw) : null;
    if (ref && ProzaEdit.DocAnalytics?.compareToReference) {
      const dlg = ProzaEdit.ManuscriptOverview.dialogueRatioPercent(lastAuditExcerpt);
      refLine = ProzaEdit.DocAnalytics.compareToReference(metrics, dlg, ref);
    }
  } catch (_) {}
  let html = `<h3>${escapeHtml(label)}</h3>`;
  html += `<p>Words: ${metrics.wordCount} · FK grade ~${metrics.fleschKincaidGrade} · FRE ~${metrics.fleschReadingEase}</p>`;
  const sevLabel = auditFilterDisplayLabel("confirmed");
  html += `<p>🔴 ${escapeHtml(sevLabel)}: ${criticalCount} · 🟡 Style: ${prefCount} · 🟢 Traffic: ${traffic.label}</p>`;
  if (compareLine) html += `<p>${escapeHtml(compareLine)}</p>`;
  if (refLine) html += `<p>${escapeHtml(refLine)}</p>`;
  html += `<p>${escapeHtml(buildManuscriptProfile())}</p>`;
  const typeHint = getManuscriptTypeAwareHint();
  if (typeHint) html += `<p class="audit-type-hint">${escapeHtml(typeHint)}</p>`;
  if (isChecked("fictionScopeReminder", true) && fictionModulesActive() && !scopeCoversFullManuscript()) {
    html += `<p style="color:#c5221f;font-weight:600;">Fiction/plot checks are running on a partial scope. Review the full manuscript (or a wide chapter range) before applying changes that affect names, facts, or continuity.</p>`;
  }
  const ctx = buildAuditContext();
  lastAuditMeta = { label, score, criticalCount, prefCount, metrics, traffic, compareLine, refLine };
  if (window.ProzaEdit?.ManuscriptOverview?.buildHtml && lastAuditExcerpt) {
    let heatmapHtml = "";
    try {
      const hmRaw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CHAPTER_HEATMAP);
      if (hmRaw && ProzaEdit.ChapterHeatmap?.heatmapHtml) {
        const entries = typeof hmRaw === "string" ? JSON.parse(hmRaw) : hmRaw;
        if (Array.isArray(entries) && entries.length) heatmapHtml = ProzaEdit.ChapterHeatmap.heatmapHtml(entries);
      }
    } catch (_) {}
    html += ProzaEdit.ManuscriptOverview.buildHtml(lastAuditExcerpt, ctx, lastAuditMeta, {
      docStats: lastDocStats,
      heatmapHtml,
    });
  }
  lastFeedbackLetter = ProzaEdit.ManuscriptOverview?.buildFeedbackLetter
    ? ProzaEdit.ManuscriptOverview.buildFeedbackLetter(lastAuditExcerpt, ctx, { ...lastAuditMeta, label }, suggestions)
    : "";
  const summary = getEl("summaryReport");
  if (summary) summary.innerHTML = html;
  setAuditSuggestions(suggestions);
  updateWorkflowCrossNav(getCurrentActiveTabId() || "tab4");
  updateChecksPostRunNav();
  cacheAudit(label, html, suggestions, traffic, score);
  lastAuditHadTruncation = suggestions.some((s) => s.id === "sys_trunc" || s.ruleId === "sys:truncated");
  lastAuditScopeModeAtRun = getScopeMode();
  updateAuditScopeFootnote();
  if (lastAuditHadTruncation) {
    showPeStatus(
      "Scope hit the character cap — open the Truncated scope card below, or try Selected chapters / Page range.",
      "warn"
    );
  }
}

function cacheAudit(label, html, suggestions, traffic, score) {
  const safeList = Array.isArray(suggestions) ? suggestions.slice(0, 80) : [];
  const json = JSON.stringify({
    label,
    summaryHtml: html,
    suggestions: safeList,
    traffic,
    score,
    miniScores: lastMiniScores,
    at: new Date().toISOString(),
  });
  if (json.length <= MAX_AUDIT_CACHE_CHARS) {
    ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.LAST_AUDIT, json);
    ProzaEdit.Settings.setAsync(
      ProzaEdit.Settings.KEYS.LAST_AUDIT_STATS,
      JSON.stringify({
        critical: safeList.filter((s) => s.type === "confirmed").length,
        pref: safeList.filter((s) => s.type !== "confirmed").length,
        score,
        at: new Date().toISOString(),
      })
    );
  }
}

function restoreCachedAuditIfEmpty() {
  if (auditBusy || deepBusy || currentAuditSuggestions.length) return;
  const cards = getEl("cardContainer");
  if (cards?.querySelector(".card")) return;
  const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.LAST_AUDIT);
  if (!raw) return;
  try {
    const d = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!d || !Array.isArray(d.suggestions)) return;
    if (d.summaryHtml) getEl("summaryReport").innerHTML = d.summaryHtml;
    if (d.traffic && d.score != null) renderTraffic(d.traffic, d.score);
    if (d.miniScores) {
      lastMiniScores = d.miniScores;
      renderMiniScores(d.miniScores);
    } else {
      getEl("miniScores")?.classList.add("hidden");
    }
    setAuditSuggestions(d.suggestions);
    lastAuditHadTruncation = (d.suggestions || []).some(
      (s) => s.id === "sys_trunc" || s.ruleId === "sys:truncated"
    );
    lastAuditScopeModeAtRun = getScopeMode();
    updateAuditScopeFootnote();
  } catch (_) {}
}

function runProzaEditAudit() {
  runAuditInternal({ extendedLocal: false, label: "Full audit (local)", status: "Running local audit…" });
}

function runExtendedLocalAudit() {
  runAuditInternal({
    extendedLocal: true,
    label: "Extended local audit",
    status: "Running extended local audit (0 tokens)…",
    btnId: "btnRunAudit",
    btnDone: "Run audit",
  });
}

function createPhaseTiming() {
  const enabled = !!ProzaEdit.PhaseTiming?.isEnabled?.(window);
  return ProzaEdit.PhaseTiming?.create?.({ enabled }) || { enabled: false, mark() {}, summary: () => "" };
}

function reportPhaseTiming(label, timing) {
  const summary = timing?.summary?.() || "";
  if (!summary) return "";
  try {
    console.info(`[ProzaEdit timing] ${label}: ${summary}`);
  } catch (_) {}
  return summary;
}

function restoreScopeModeIfChanged(mode) {
  const el = getEl("scope");
  if (!el || !mode || el.value === mode) return;
  if (![...el.options].some((o) => o.value === mode)) return;
  el.value = mode;
  syncScopePanels();
  updateActiveChecksHint();
  updateWorkflowStatusLine();
}

function runAuditInternal(opts) {
  opts = opts || {};
  if (isOperationBusy(!!opts.fromBatch)) {
    warnOperationBusy();
    return Promise.resolve(false);
  }
  auditStarting = true;
  const start = () =>
    prepareScopeForAudit(opts).then((ready) => {
      if (!ready) return false;
      const run = runAuditInternalCore(opts);
      auditStarting = false;
      return run;
    });
  const actionId = opts.skipLongOpWarning
    ? null
    : ProzaEdit.LongOp?.actionIdForAudit?.(getScopeMode(), !!opts.extendedLocal);
  return runAfterLongOperationWarning(actionId, start)
    .catch((e) => {
      reportActionError(e, "start this audit");
      return false;
    })
    .finally(() => {
      auditStarting = false;
    });
}

function runAuditInternalCore(opts) {
  if (auditBusy || deepBusy) return Promise.resolve(false);
  auditBusy = true;
  lastDocStats = null;
  clearRetry();
  const timing = createPhaseTiming();
  const scopeModeAtStart = getScopeMode();
  const auditBtn = getEl(opts.btnId || "btnRunAudit");
  const auditBtnDefault = opts.btnDone || "Run audit";
  const extBtn = getEl("btnAuditPrimary");
  const sumEl = getEl("summaryReport");
  let longOp = null;
  let cancelled = false;
  let failed = false;

  const finish = () => {
    auditBusy = false;
    setModuleButtonsDisabled(false);
    endLongOperation(longOp);
    if (auditBtn) setRunAuditHubButtonLabel(auditBtn, auditBtnDefault);
    const primary = getEl("btnAuditPrimary");
    if (primary) setRunAuditHubButtonLabel(primary, "Run audit");
  };

  const handleFailure = (e) => {
    if (isLongOpCancelledError(e)) {
      cancelled = true;
      clearRetry();
      resetAuditCardDisplayLimit();
      lastAuditExcerpt = "";
      currentAuditSuggestions = [];
      if (sumEl) sumEl.textContent = "Cancelled. Run audit again when ready.";
      showAuditEmptyIfNeeded();
      return false;
    }
    failed = true;
    const message = wordRecoveryMessage(e, "finish this audit");
    if (ProzaEdit.AuditReview?.isRetryable?.(e)) {
      registerRetry("Audit", () => {
        restoreScopeModeIfChanged(scopeModeAtStart);
        return runAuditInternal({ ...opts, skipLongOpWarning: true });
      });
    }
    const sum = getEl("summaryReport");
    if (sum) sum.innerHTML = `<span style="color:var(--red)">${escapeHtml(message)}</span>`;
    showAuditEmptyIfNeeded();
    ProzaEdit.Diagnostics?.reportMajor?.(
      { phase: "runAudit", scope: getScopeMode(), label: opts.label },
      e?.message || "Audit failed"
    )?.catch?.(() => {});
    return false;
  };

  try {
    setModuleButtonsDisabled(true);
    longOp = beginLongOperation({
      initialStatus: "Reading document…",
      setStatus: (msg) => showPeStatus(msg),
    });
    if (auditBtn) setRunAuditHubButtonLabel(auditBtn, "Reading…");
    if (extBtn) setRunAuditHubButtonLabel(extBtn, "Reading…");
    showPeStatus(opts.status || "Reading document…");
    persistSettings(false);
    showTab("tab4");
    currentAuditSuggestions = [];
    const cardBox = getEl("cardContainer");
    if (cardBox) cardBox.innerHTML = "";
    if (sumEl) sumEl.textContent = opts.status || "Reading document…";
  } catch (e) {
    handleFailure(e);
    finish();
    showPeStatus("Audit could not start. Try again.", "warn");
    return Promise.resolve(false);
  }

  return wordRun("audit", async (ctx) => {
    longOp.setStatus("Reading document…");
    if (getScopeMode() === "full") {
      const paras = ctx.document.body.paragraphs;
      paras.load("items");
      await ctx.sync();
      longOp.throwIfCancelled();
      const pn = paras.items.length;
      if (pn <= MAX_PARAS) lastDocStats = { paragraphs: pn, estWords: Math.round(pn * 42) };
      else lastDocStats = { paragraphs: pn, estWords: "(use section loop)" };
    }
    let text = await readScopeText(ctx, longOp);
    longOp.throwIfCancelled();
    timing.mark("read");
    longOp.setStatus("Analyzing…");
    if (auditBtn) setRunAuditHubButtonLabel(auditBtn, "Analyzing…");
    if (extBtn) setRunAuditHubButtonLabel(extBtn, "Analyzing…");
    if (sumEl) sumEl.textContent = "Analyzing…";
    let truncated = false;
    const cap = getScopeCharLimit(getScopeMode());
    if (text.length > cap) {
      text = text.substring(0, cap);
      truncated = true;
    }
    await new Promise((r) => setTimeout(r, 0));
    longOp.throwIfCancelled();
    const result = ProzaEdit.Audit.run(text, buildAuditContext({ extendedLocal: !!opts.extendedLocal }));
    timing.mark("analyze");
    longOp.throwIfCancelled();
    if (truncated) {
      result.suggestions.unshift({
        id: "sys_trunc",
        ruleId: "sys:truncated",
        module: "ProzaEdit",
        type: "preference",
        explanation: "Excerpt truncated for performance. Use selection or section loop for full coverage.",
        targetText: "(truncated)",
        replacementText: "(smaller scope)",
      });
    }
    lastAuditExcerpt = text;
    ProzaEdit.ScopeReader.clearScopeResumeSnapshot?.();
    finalizeAudit(result, opts.label || "Full audit (local)");
    timing.mark("render");
    sessionAuditCompletedThisSession = true;
    updateWorkflowNextStepHint();
    lastSessionSummaryRanAudit = true;
    scheduleLastSessionSummaryPersist({ ranAudit: true });
  })
    .catch(handleFailure)
    .finally(() => {
      finish();
      const timingSummary = reportPhaseTiming(opts.label || "audit", timing);
      if (cancelled) showPeStatus("Cancelled.", "warn");
      else if (failed) {
        showPeStatus(
          getRetryController()?.has?.()
            ? "Audit could not finish. Review the recovery steps above, or use Try again."
            : "Audit could not finish. Review the recovery steps above.",
          "warn"
        );
      } else showPeStatus(timingSummary ? `Audit finished (0 tokens). ${timingSummary}` : "Audit finished (0 tokens).", "ok");
    })
    .then((v) => v !== false);
}

function renderAuditCards(list) {
  const box = document.getElementById("cardContainer");
  if (!box) return;
  box.innerHTML = "";
  list = Array.isArray(list) ? list : [];
  const ic = (name) => (window.ProzaEdit?.PeIcons?.svg ? ProzaEdit.PeIcons.svg(name) : "");
  if (!list.length) {
    if (currentAuditSuggestions.length && auditCardFilter !== "all") {
      box.innerHTML = "<p class=\"audit-empty\">No items in this filter. Try <strong>All</strong>.</p>";
    } else if (currentAuditSuggestions.length) {
      box.innerHTML = "<p>No issues (or all rules muted).</p>";
    } else {
      showAuditEmptyIfNeeded();
    }
    return;
  }
  const capped = ProzaEdit.AuditReview?.capCards?.(list, auditCardDisplayLimit) || { shown: list, hiddenCount: 0 };
  const renderOne = (item, i) => {
    if (!item || typeof item !== "object") return;
    const id = String(item.id || `c${i}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    item.id = id;
    item.module = String(item.module || "Finding");
    item.explanation = String(item.explanation || "");
    item.targetText = String(item.targetText || "");
    item.replacementText = String(item.replacementText || "");
    const canApply = item.replacementText && !String(item.replacementText).startsWith("(");
    const canRewrite = item.targetText && !String(item.targetText).startsWith("(");
    const showHouse = isStyleGuideFinding(item) && item.targetText && !String(item.targetText).startsWith("(");
    const div = document.createElement("div");
    div.className = `card ${String(item.type || "preference").replace(/[^a-z-]/gi, "")}`;
    div.id = `card_${id}`;
    div.tabIndex = -1;
    div.setAttribute("role", "group");
    div.setAttribute("aria-label", `${ProzaEdit.AuditReview?.progressLabel?.(i, list.length) || `Finding ${i + 1} of ${list.length}`}: ${item.module}`);
    div.innerHTML = `
      <span class="card-review-progress">${escapeHtml(ProzaEdit.AuditReview?.progressLabel?.(i, list.length) || `Finding ${i + 1} of ${list.length}`)}</span>
      <span class="badge ${item.type === "confirmed" ? "badge-confirmed" : "badge-pref"}">${escapeHtml(item.type)}</span>
      <strong>${escapeHtml(item.module)}</strong>
      <p class="card-explanation">${escapeHtml(item.explanation)}</p>
      <p class="card-target">"${escapeHtml(item.targetText)}"</p>
      <p class="card-replacement">"${escapeHtml(item.replacementText)}"</p>
      <div class="card-actions">
        <div class="card-actions-trust" role="group" aria-label="Apply and undo">
          <button type="button" class="btn-secondary btn-trust btn-card-undo btn-with-icon" data-a="undo" aria-label="Undo last ProzaEdit replace">${ic("undo")} Undo</button>
          ${canApply ? `<button type="button" class="btn-apply btn-trust btn-with-icon" data-a="apply" data-pe-tip="btn-card-apply" aria-label="Apply fix">${ic("check")} Apply</button>` : ""}
        </div>
        <div class="card-actions-primary">
          <button type="button" class="btn-go btn-with-icon" data-a="goto" data-pe-tip="btn-card-goto" aria-label="Go to finding in Word">${ic("locate")} Go to</button>
          ${canRewrite ? `<button type="button" class="btn-go btn-with-icon" data-a="rewrite" data-pe-tip="btn-card-rewrite" aria-label="Rewrite finding">${ic("edit")} Rewrite</button>` : ""}
          <button type="button" class="btn-go" data-a="localtip">Local tip</button>
        </div>
        <div class="card-actions-secondary">
          <button type="button" class="btn-go" data-a="dict">Dict</button>
          ${showHouse ? '<button type="button" class="btn-go" data-a="house">House rule</button>' : ""}
          <button type="button" class="btn-go btn-with-icon" data-a="mute" data-pe-tip="btn-card-mute" aria-label="Mute rule">${ic("bell-off")} Mute</button>
          <button type="button" class="btn-go" data-a="chat" title="Optional Gemini">Gemini</button>
          <button type="button" class="btn-dismiss btn-with-icon" data-a="dismiss" data-pe-tip="btn-card-dismiss" aria-label="Dismiss finding">${ic("eye-off")} Dismiss</button>
        </div>
        ${
          ProzaEdit.WorkflowNav?.shouldShowCardDictionaryFooter?.(item)
            ? '<p class="card-footer-trust help-muted"><button type="button" class="btn-linkish" data-a="dict-footer">Manage dictionary</button> for names and terms that should not be flagged.</p>'
            : ""
        }
      </div>`;
    div.querySelectorAll("[data-a]").forEach((btn) => {
      btn.setAttribute("aria-label", ProzaEdit.AuditReview?.cardActionLabel?.(btn.dataset.a, item) || btn.textContent.trim());
    });
    div.querySelector('[data-a="goto"]').onclick = () => goToIssue(item.targetText);
    const undoBtn = div.querySelector('[data-a="undo"]');
    if (undoBtn) undoBtn.onclick = () => prozaEditUndo();
    const rewriteBtn = div.querySelector('[data-a="rewrite"]');
    if (rewriteBtn) rewriteBtn.onclick = () => sendIssueToRewrite(item);
    div.querySelector('[data-a="localtip"]').onclick = () => showLocalTipForIssue(item);
    div.querySelector('[data-a="chat"]').onclick = () => sendIssueToChat(item);
    if (canApply) div.querySelector('[data-a="apply"]').onclick = () => applyFix(id, item.targetText, item.replacementText);
    div.querySelector('[data-a="dict"]').onclick = () => addDictionaryWordFromCard(item.targetText);
    const dictFooter = div.querySelector('[data-a="dict-footer"]');
    if (dictFooter) dictFooter.onclick = () => openSettingsModal("dictionary");
    if (showHouse) div.querySelector('[data-a="house"]').onclick = () => addCustomStyleFromCard(item);
    div.querySelector('[data-a="mute"]').onclick = () => muteRule(item);
    div.querySelector('[data-a="dismiss"]').onclick = () => dismissCard(item);
    box.appendChild(div);
  };
  const batches =
    ProzaEdit.AuditReview?.planCardRenderBatches?.(capped.shown.length, ProzaEdit.AuditReview.CARD_RENDER_BATCH) ||
    [{ start: 0, end: capped.shown.length - 1 }];
  for (let b = 0; b < batches.length; b++) {
    activeLongOp?.throwIfCancelled?.();
    const batch = batches[b];
    for (let i = batch.start; i <= batch.end; i++) renderOne(capped.shown[i], i);
  }
  if (capped.hiddenCount > 0) {
    const note = document.createElement("p");
    note.className = "pe-card-cap-note";
    note.setAttribute("role", "status");
    const step = capped.loadMoreStep || 100;
    note.textContent = `Showing ${capped.shown.length} of ${list.length} findings (${capped.hiddenCount} not shown). `;
    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "btn-linkish";
    loadBtn.textContent = `Show next ${Math.min(step, capped.hiddenCount)}`;
    loadBtn.onclick = () => loadMoreAuditCards();
    note.appendChild(loadBtn);
    note.appendChild(document.createTextNode(" — or fix/dismiss cards, change the filter, or narrow scope."));
    box.appendChild(note);
  }
  if (ProzaEdit.TooltipRegistry?.refreshTooltips) {
    ProzaEdit.TooltipRegistry.refreshTooltips(isChecked("showHoverTips", true));
  }
  updateUndoRedoUi();
}

let peCardActionLock = null;

async function withCardActionLock(key, action, fn) {
  if (!peCardActionLock) peCardActionLock = ProzaEdit.Recovery.createKeyedLock();
  const release = peCardActionLock.tryAcquire(key);
  if (!release) return;
  try {
    await fn();
  } catch (e) {
    reportActionError(e, action);
  } finally {
    release();
  }
}

function muteRule(item) {
  if (!item || !item.ruleId) return Promise.resolve();
  return withCardActionLock(`mute:${item.id}`, "mute this rule", async () => {
    await ProzaEdit.Settings.muteRule(item.ruleId);
    if (item.targetText) {
      await ProzaEdit.Settings.dismissTarget(item.targetText);
      const candidate = String(item.targetText).trim().split(/\s+/)[0];
      if (candidate && !candidate.startsWith("(") && candidate.length <= 80) {
        lastMutedDictionaryCandidate = candidate;
        updateDictionaryCountBadge();
      }
    }
    removeAuditCard(item.id);
    const showDictNudge = ProzaEdit.PlainLanguage?.shouldShowMuteDictionaryNudge?.(
      item,
      muteDictionaryNudgeShownThisSession
    );
    if (showDictNudge) {
      muteDictionaryNudgeShownThisSession = true;
      showPeStatusHtml(ProzaEdit.PlainLanguage.muteDictionaryNudgeStatusHtml(), "ok");
    } else {
      showPeStatus("Rule muted — saved in this document and this browser (not other PCs or files).", "ok");
    }
  });
}

function dismissCard(item) {
  if (!item) return Promise.resolve();
  return withCardActionLock(`dismiss:${item.id}`, "dismiss this finding", async () => {
    if (item.ruleId) await ProzaEdit.Settings.muteRule(item.ruleId);
    if (item.targetText) await ProzaEdit.Settings.dismissTarget(item.targetText);
    removeAuditCard(item.id);
  });
}

function removeAuditCard(id) {
  const box = getEl("cardContainer");
  const visibleIds = box
    ? [...box.querySelectorAll(".card")].map((card) => String(card.id || "").replace(/^card_/, ""))
    : [];
  const removedCard = getEl(`card_${id}`);
  const active = document.activeElement;
  const shouldRestoreFocus = !!(removedCard && active && removedCard.contains(active));
  const action = shouldRestoreFocus ? active.closest?.("[data-a]")?.dataset?.a || "" : "";
  const oldTop = removedCard?.getBoundingClientRect?.().top;
  const nextId = ProzaEdit.AuditReview?.nextTargetId?.(visibleIds, id) || "";
  currentAuditSuggestions = currentAuditSuggestions.filter((x) => x.id !== id);
  updateAuditFilterChips();
  updateAuditTabBadge();
  applyAuditCardFilter();
  const nextCard = nextId ? getEl(`card_${nextId}`) : null;
  if (nextCard && Number.isFinite(oldTop)) {
    const newTop = nextCard.getBoundingClientRect?.().top;
    if (Number.isFinite(newTop)) window.scrollBy(0, newTop - oldTop);
  }
  if (shouldRestoreFocus) {
    const focusTarget =
      nextCard?.querySelector(action ? `[data-a="${action}"]` : "button") ||
      nextCard ||
      document.querySelector('.chip[data-audit-filter].chip-active');
    focusTarget?.focus?.({ preventScroll: true });
  }
}

function clearAuditReport() {
  currentAuditSuggestions = [];
  lastAuditExcerpt = "";
  lastAuditHadTruncation = false;
  lastAuditScopeModeAtRun = "";
  lastAuditMeta = {};
  lastFeedbackLetter = "";
  auditCardFilter = isChecked("simpleMode", false) ? "confirmed" : "all";
  updateAuditFilterChips();
  const box = getEl("cardContainer");
  const sum = getEl("summaryReport");
  if (box) box.innerHTML = "";
  if (sum) sum.innerHTML = "Audit cleared. Run audit again for a fresh pass.";
  getEl("trafficBar")?.classList.add("hidden");
  getEl("miniScores")?.classList.add("hidden");
  updateAuditScopeFootnote();
  ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.LAST_AUDIT, "");
  showAuditEmptyIfNeeded();
  updateAuditTabBadge();
  showPeStatus("Audit report cleared.", "ok");
}

let peGotoLock = null;

function goToIssue(target) {
  if (!target || String(target).startsWith("(")) {
    showPeStatus("Cannot locate this item.", "warn");
    return Promise.resolve(false);
  }
  if (!peGotoLock) peGotoLock = ProzaEdit.Recovery.createLock();
  const release = peGotoLock.tryAcquire();
  if (!release) return Promise.resolve(false);
  return wordRun("goto", async (ctx) => {
    await ProzaEdit.WordSafeNavigator.selectFirstInBody(ctx, target);
  })
    .then(() => {
      clearRetry();
      return true;
    })
    .catch((e) => {
      const result = reportActionError(e, "locate this finding", {
        retry: { label: "Go to", run: () => goToIssue(target) },
      });
      if (!result.cancelled) {
        showPeStatusHtml(
          `${result.message} Use <strong>Try again</strong> above, or open ` +
            `<button type="button" class="btn-linkish" onclick="showTab('tab7');var d=document.getElementById('peHelpGotoTroubleshoot');if(d)d.open=true;">Help → Go to troubleshooting</button>.`,
          "warn",
          true
        );
      }
      return false;
    })
    .finally(release);
}

function applyFix(cardId, target, replacement) {
  if (!target || String(replacement || "").startsWith("(")) {
    showPeStatus("This card has no automatic replacement.", "warn");
    return Promise.resolve(false);
  }
  return applyDocumentEdit(target, replacement, "Audit fix", {
    forceDocument: true,
    onSuccess: () => {
      removeAuditCard(cardId);
      scheduleManuscriptIndexBuild(true);
      scheduleLastSessionSummaryPersist();
    },
  });
}

function parseManifestVersion(xml) {
  const m = String(xml || "").match(/<Version>([^<]+)<\/Version>/i);
  return m ? m[1].trim() : "";
}

function compareVersion(a, b) {
  const pa = String(a || "0").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = String(b || "0").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 4; i++) {
    const da = pa[i] || 0;
    const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
}

async function checkForUpdates(manual) {
  const statusEl = getEl("updateStatus");
  const setStatus = (msg, warn) => {
    if (statusEl) statusEl.textContent = msg;
    if (manual) showPeStatus(msg, warn ? "warn" : "ok");
  };
  setStatus("Checking GitHub…");
  try {
    const res = await fetch(`${PROZAEDIT_MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not reach GitHub.");
    const xml = await res.text();
    const remote = parseManifestVersion(xml);
    if (!remote) throw new Error("Manifest version not found online.");
    const cmp = compareVersion(remote, PROZAEDIT_BUILD_VERSION);
    const aboutManifest = getEl("peAboutManifestVersion");
    if (aboutManifest) aboutManifest.textContent = remote;
    if (cmp > 0) {
      setStatus(
        `Update available: manifest ${remote} (you have UI ${PROZAEDIT_BUILD_VERSION}). Close this pane and reopen ProzaEdit; re-upload manifest if Word asks.`,
        true
      );
      if (
        manual &&
        (await peConfirm({
          title: "Reload pane?",
          message: "Reload the task pane now to pull the latest UI from GitHub?",
          confirmLabel: "Reload",
          cancelLabel: "Not now",
        }))
      ) {
        location.reload();
      }
    } else if (cmp === 0) {
      setStatus(`Up to date (manifest ${remote}). UI loads from ${PROZAEDIT_UI_URL}`);
    } else {
      setStatus(`Online manifest ${remote}; this pane reports ${PROZAEDIT_BUILD_VERSION}. Reload if behavior seems stale.`);
    }
  } catch (e) {
    setStatus(e.message || "Update check failed.", true);
  }
}

function formatCoachHtml(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function appendCoachMessage(text, isUser) {
  const log = getEl("chatLog");
  if (!log) return;
  if (isUser) log.innerHTML += `<div class="chat-msg chat-user">${escapeHtml(text)}</div>`;
  else log.innerHTML += `<div class="chat-msg chat-ai coach-md">${formatCoachHtml(text)}</div>`;
  trimChatLog(log);
  log.scrollTop = log.scrollHeight;
}

function showLocalTipForIssue(item) {
  showTab("tab5");
  const reply = ProzaEdit.LocalCoach.forIssue(item);
  appendCoachMessage(`Tip for: ${item.module}`, true);
  appendCoachMessage(reply, false);
  showPeStatus("Local tip (0 tokens).", "ok");
}

async function sendLocalCoachMessage() {
  const prompt = getEl("chatInput")?.value.trim() || "";
  if (!prompt) {
    showPeStatus("Enter a question for Local Coach.", "warn");
    return;
  }
  appendCoachMessage(prompt, true);
  getEl("chatInput").value = "";
  let snippet = "";
  try {
    snippet = await wordRun("coach-ctx", async (ctx) => {
      if (!isChecked("chatSelectionOnly", true)) return "";
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      return (sel.text || "").trim().substring(0, 600);
    });
  } catch (_) {}
  const profile = buildManuscriptProfile();
  const reply = ProzaEdit.LocalCoach.answer(prompt, snippet ? `${profile}\n\nSelection excerpt:\n${snippet}` : profile);
  appendCoachMessage(reply, false);
  showPeStatus("Local Coach (0 tokens).", "ok");
}

function getChapterIndex() {
  const v = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CHAPTER_IDX, 0);
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

async function selectNextChapterAndAudit() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  try {
    await selectNextChapter();
    await new Promise((r) => setTimeout(r, 150));
    runPrimaryAudit();
  } catch (e) {
    reportActionError(e, "select the next chapter");
  }
}

function cancelBatchAudit() {
  batchCancel = true;
  activeLongOp?.cancel?.();
  showPeStatus("Batch cancelled.", "warn");
}

function runBatchSectionAudit() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  const actionId = ProzaEdit.LongOp?.ACTION_IDS?.BATCH_AUDIT;
  return runAfterLongOperationWarning(actionId, () => runBatchSectionAuditCore());
}

async function runBatchSectionAuditCore() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  const n = Math.min(8, Math.max(1, parseInt(getEl("batchSectionCount")?.value, 10) || 3));
  batchCancel = false;
  batchRunning = true;
  clearRetry();
  const batchOp = beginLongOperation({ initialStatus: `Batch 0/${n}…` });
  let failed = false;
  try {
    for (let i = 0; i < n; i++) {
      if (batchCancel || batchOp.isCancelled()) break;
      batchOp.setStatus(`Batch ${i + 1}/${n}…`);
      try {
        await selectNextSection();
        await new Promise((r) => setTimeout(r, 200));
        if (batchCancel || batchOp.isCancelled()) break;
        const ok = await runAuditInternal({
          extendedLocal: isAuditExtended(),
          label: `Batch audit ${i + 1}/${n}`,
          status: `Batch ${i + 1}/${n}…`,
          skipLongOpWarning: true,
          fromBatch: true,
        });
        if (!ok) break;
      } catch (e) {
        failed = true;
        reportActionError(e, "run the batch audit");
        break;
      }
    }
  } finally {
    batchRunning = false;
    endLongOperation(batchOp);
  }
  if (batchCancel || batchOp.isCancelled()) showPeStatus("Cancelled.", "warn");
  else if (!failed) showPeStatus("Batch complete.", "ok");
}

function buildChronologyContext() {
  return {
    chronoDepth: getEl("selChronoDepth")?.value || "meso",
    chronoSpoilerGuard: isChecked("chkChronoSpoilerGuard", false),
    manuscriptType: getEl("manuscriptType")?.value || "",
    mutedRules: ProzaEdit.Settings.getMutedRules(),
    reportDensity: getEl("reportDensity")?.value || "balanced",
  };
}

function chronoGotoText(ev) {
  const raw = (ev.label && String(ev.label).length <= 255 ? ev.label : ev.excerpt || "").trim();
  return raw && !raw.startsWith("(") ? raw : "";
}

function renderChronologyTimeline(events) {
  const box = getEl("chronoTimelineList");
  if (!box) return;
  if (!events?.length) {
    box.innerHTML = "<p class=\"help-inline\">No timeline anchors in this scope.</p>";
    return;
  }
  const rows = events.slice(0, 120).filter((ev) => chronoGotoText(ev));
  let html = `<p class="help-inline">${events.length} anchor(s) in document order.</p><ul class="chrono-timeline-list">`;
  rows.forEach((ev) => {
    const label = escapeHtml(String(ev.label || ev.type).substring(0, 72));
    const para = ev.paraIndex != null ? ev.paraIndex + 1 : "?";
    html += `<li><span class="chrono-idx">¶${para}</span><span class="chrono-label">${label}</span>`;
    html += `<button type="button" class="btn-go btn-go-compact">Go to</button></li>`;
  });
  html += "</ul>";
  box.innerHTML = html;
  box.querySelectorAll(".btn-go-compact").forEach((btn, i) => {
    const text = chronoGotoText(rows[i]);
    if (text) btn.onclick = () => goToIssue(text);
  });
}

function buildCitationContext() {
  return {
    citationStyle: getEl("selCitationStyle")?.value || "auto",
    citationReconcileBiblio: isChecked("chkCitationReconcile", true),
    manuscriptType: getEl("manuscriptType")?.value || "",
    mutedRules: ProzaEdit.Settings.getMutedRules(),
    reportDensity: getEl("reportDensity")?.value || "balanced",
  };
}

function renderCitationSamples(inTextCitations) {
  const box = getEl("citationSampleList");
  if (!box) return;
  const rows = (inTextCitations || []).slice(0, 40).filter((c) => c.raw && String(c.raw).length <= 255);
  if (!rows.length) {
    box.innerHTML = "<p class=\"help-inline\">No citation-shaped patterns in this scope.</p>";
    return;
  }
  let html = `<p class="help-inline">${inTextCitations.length} pattern(s) detected (samples).</p><ul class="cite-sample-list">`;
  rows.forEach((c) => {
    const raw = escapeHtml(String(c.raw).substring(0, 72));
    html += `<li><span class="cite-sample-raw">${raw}</span><button type="button" class="btn-go btn-go-compact">Go to</button></li>`;
  });
  html += "</ul>";
  box.innerHTML = html;
  box.querySelectorAll(".btn-go-compact").forEach((btn, i) => {
    const text = rows[i].raw;
    if (text) btn.onclick = () => goToIssue(text.substring(0, 120));
  });
}

function runCitationScanFromTarget() {
  if (!isChecked("chkCitationScan", false)) {
    showPeStatus("Enable “Citation pattern scan (opt-in)” on the Checks tab first.", "warn");
    showTab("tab3");
    return;
  }
  runCitationScan();
}

function runCitationScan() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  const manuscriptType = getEl("manuscriptType")?.value || "";
  if (!ProzaEdit.CitationEngine?.isEligibleManuscript?.(manuscriptType)) {
    showPeStatus("Citation verify is for Academic, Business, or Technical/Journalism manuscripts. Set Manuscript type on Target.", "warn");
    return;
  }
  if (!isChecked("chkCitationScan", false)) {
    showPeStatus("Opt in on Checks: turn on “Enable citation pattern scan”, then run Verify citations.", "warn");
    showTab("tab3");
    return;
  }
  const actionId =
    ProzaEdit.LongOp?.isSlowScopeMode?.(getScopeMode()) ? ProzaEdit.LongOp.ACTION_IDS.CITATION_SCAN : null;
  return runAfterLongOperationWarning(actionId, () => runCitationScanCore());
}

async function runCitationScanCore() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  citationBusy = true;
  clearRetry();
  const longOp = beginLongOperation({ initialStatus: "Citation scan (local)…" });
  const btn = getEl("btnScanCitations");
  const targetBtn = getEl("btnVerifyCitationsTarget");
  const statusEl = getEl("citationScanStatus");
  if (btn) btn.disabled = true;
  if (targetBtn) targetBtn.disabled = true;
  const btnLabel = btn?.textContent || "Verify citations";
  if (btn) btn.textContent = "Scanning…";
  showPeStatus("Citation scan (local)…");
  let cancelled = false;
  try {
    const ready = await prepareScopeForAudit();
    if (!ready) return;
    const result = await wordRun("cite", async (ctx) => {
      const opts = getScopeOptions();
      if (
        opts.mode === "selected-chapters" ||
        opts.mode === "chapter" ||
        opts.mode === "chapter-range"
      ) {
        opts.chapters = scopeChapterListCache;
      }
      opts.cancelCheck = () => longOp.throwIfCancelled();
      const paragraphs = await ProzaEdit.ScopeReader.readParagraphsInScope(ctx, opts);
      longOp.throwIfCancelled();
      return ProzaEdit.CitationEngine.analyze(paragraphs, buildCitationContext());
    });
    renderCitationSamples(result.inTextCitations);
    if (statusEl) {
      let msg = `${result.stats.inTextCount || 0} in-text pattern(s), ${result.findings.length} finding(s). Style: ${result.stats.style || "auto"}.`;
      if (result.bibliography?.entryCount != null) {
        msg += ` Bibliography entries scanned: ${result.bibliography.entryCount}.`;
      } else if (result.bibliography?.skipped) {
        msg += ` Biblio: ${result.bibliography.skipped}.`;
      }
      statusEl.textContent = msg;
    }
    if (result.findings.length) {
      currentAuditSuggestions = ProzaEdit.CitationEngine.mergeFindings(currentAuditSuggestions, result.findings);
      applyAuditCardFilter();
      showPeStatus(`${result.findings.length} citation finding(s) added to Audit cards.`, "ok");
    } else {
      showPeStatus("Citation scan complete.", "ok");
    }
    if (ProzaEdit.TooltipRegistry?.refreshTooltips) {
      ProzaEdit.TooltipRegistry.refreshTooltips(isChecked("showHoverTips", true));
    }
  } catch (e) {
    if (isLongOpCancelledError(e)) {
      cancelled = true;
      if (statusEl) statusEl.textContent = "";
      showPeStatus("Cancelled.", "warn");
    } else {
      if (statusEl) statusEl.textContent = "";
      reportActionError(e, "finish the citation scan", {
        retry: { label: "Citation scan", run: () => runCitationScanCore() },
      });
    }
  } finally {
    citationBusy = false;
    endLongOperation(longOp);
    adaptModules();
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnLabel;
    }
  }
}

function runTimelineScan() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  const fiction = (getEl("manuscriptType")?.value || "").includes("Fiction");
  if (!fiction) {
    showPeStatus("Timeline scan is for fiction manuscripts. Set Manuscript type to Fiction on Target.", "warn");
    return;
  }
  const actionId =
    ProzaEdit.LongOp?.isSlowScopeMode?.(getScopeMode()) ? ProzaEdit.LongOp.ACTION_IDS.TIMELINE_SCAN : null;
  return runAfterLongOperationWarning(actionId, () => runTimelineScanCore());
}

async function runTimelineScanCore() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  chronologyBusy = true;
  clearRetry();
  const longOp = beginLongOperation({ initialStatus: "Timeline scan (local)…" });
  const btn = getEl("btnScanTimeline");
  const statusEl = getEl("chronoScanStatus");
  if (btn) btn.disabled = true;
  const btnLabel = btn?.textContent || "Scan timeline";
  if (btn) btn.textContent = "Scanning…";
  showPeStatus("Timeline scan (local)…");
  let cancelled = false;
  try {
    const ready = await prepareScopeForAudit();
    if (!ready) return;
    const result = await wordRun("chrono", async (ctx) => {
      const opts = getScopeOptions();
      if (
        opts.mode === "selected-chapters" ||
        opts.mode === "chapter" ||
        opts.mode === "chapter-range"
      ) {
        opts.chapters = scopeChapterListCache;
      }
      opts.cancelCheck = () => longOp.throwIfCancelled();
      const paragraphs = await ProzaEdit.ScopeReader.readParagraphsInScope(ctx, opts);
      longOp.throwIfCancelled();
      return ProzaEdit.ChronologyEngine.analyze(paragraphs, buildChronologyContext());
    });
    renderChronologyTimeline(result.timeline);
    if (statusEl) {
      let msg = `${result.timeline.length} event(s), ${result.findings.length} finding(s).`;
      if (result.truncated) msg += " List truncated at cap.";
      statusEl.textContent = msg;
    }
    if (result.findings.length) {
      currentAuditSuggestions = ProzaEdit.ChronologyEngine.mergeFindings(currentAuditSuggestions, result.findings);
      applyAuditCardFilter();
      showPeStatus(`${result.findings.length} timeline finding(s) added to Audit cards.`, "ok");
    } else {
      showPeStatus("Timeline scan complete.", "ok");
    }
    if (ProzaEdit.TooltipRegistry?.refreshTooltips) {
      ProzaEdit.TooltipRegistry.refreshTooltips(isChecked("showHoverTips", true));
    }
  } catch (e) {
    if (isLongOpCancelledError(e)) {
      cancelled = true;
      if (statusEl) statusEl.textContent = "";
      showPeStatus("Cancelled.", "warn");
    } else {
      if (statusEl) statusEl.textContent = "";
      reportActionError(e, "finish the timeline scan", {
        retry: { label: "Timeline scan", run: () => runTimelineScanCore() },
      });
    }
  } finally {
    chronologyBusy = false;
    endLongOperation(longOp);
    if (btn) {
      btn.disabled = false;
      btn.textContent = btnLabel;
    }
  }
}

async function scanChapterHeatmap() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  heatmapBusy = true;
  setModuleButtonsDisabled(true);
  showPeStatus("Building chapter heatmap…");
  try {
    const entries = await wordRun("heatmap", (ctx) => ProzaEdit.ChapterHeatmap.scanDocument(ctx));
    if (!entries?.length) throw new Error("No Heading 1–3 chapters found. Apply heading styles first.");
    const payload = JSON.stringify(entries.slice(0, 40));
    if (payload.length > 48000) throw new Error("Heatmap too large to store; use fewer chapters.");
    await ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.CHAPTER_HEATMAP, payload);
    showPeStatus(`Heatmap saved (${entries.length} chapters). Re-run audit to view.`, "ok");
  } catch (e) {
    reportActionError(e, "build the chapter heatmap", {
      retry: { label: "Chapter heatmap", run: () => scanChapterHeatmap() },
    });
  } finally {
    heatmapBusy = false;
    if (!auditBusy && !deepBusy) setModuleButtonsDisabled(false);
  }
}

async function captureReferenceStyle() {
  try {
    const text = await wordRun("ref-style", async (ctx) => {
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      const t = (sel.text || "").trim();
      if (!t || t.length < 80) throw new Error("Highlight a reference passage (80+ characters).");
      return t.substring(0, MAX_LOCAL_AUDIT_CHARS);
    });
    const metrics = ProzaEdit.Metrics.analyze(text);
    const dialoguePct = ProzaEdit.ManuscriptOverview.dialogueRatioPercent(text);
    await ProzaEdit.Settings.setAsync(
      ProzaEdit.Settings.KEYS.REFERENCE_STYLE,
      JSON.stringify({
        fk: metrics.fleschKincaidGrade,
        dialoguePct,
        wordCount: metrics.wordCount,
        at: new Date().toISOString(),
      })
    );
    showPeStatus("Reference style captured for this document.", "ok");
  } catch (e) {
    reportActionError(e, "capture the reference style");
  }
}

function selectNextChapter() {
  return wordRun("chapter", async (ctx) => {
    const paras = ctx.document.body.paragraphs;
    paras.load("items");
    await ctx.sync();
    const total = paras.items.length;
    if (!total) throw new Error("No paragraphs.");
    if (total > MAX_PARAS) throw new Error("Document too large—use section loop.");
    for (let i = 0; i < total; i++) paras.items[i].load("styleBuiltIn");
    await ctx.sync();
    const headingIdx = [];
    for (let i = 0; i < total; i++) {
      const s = paras.items[i].styleBuiltIn;
      if (s === Word.Style.heading1 || s === Word.Style.heading2 || s === Word.Style.heading3) headingIdx.push(i);
    }
    if (!headingIdx.length) {
      throw new Error("No Heading 1–3 paragraphs. Apply Word heading styles to chapter titles (PMAT-style splits).");
    }
    let ptr = getChapterIndex();
    if (ptr >= headingIdx.length) {
      ptr = 0;
      showPeStatus("Wrapped to the first chapter.", "ok");
    }
    const start = headingIdx[ptr];
    const endPara = ptr + 1 < headingIdx.length ? headingIdx[ptr + 1] - 1 : total - 1;
    paras.items[start].getRange("Start").expandTo(paras.items[endPara].getRange("End")).select();
    await ctx.sync();
    await ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.CHAPTER_IDX, ptr + 1);
    const scopeEl = getEl("scope");
    if (scopeEl) scopeEl.value = "selection";
    const pinScope = getEl("pinScope");
    if (pinScope) pinScope.value = "selection";
  });
}

function sendLocalCoachStarter(kind) {
  const prompts = {
    pacing: "How can I improve pacing in my current selection?",
    pov: "How do I fix POV slips in this passage?",
    plot: "What should I check for plot and chapter structure?",
    export: "How do I export audit results for beta readers without using AI tokens?",
  };
  const input = getEl("chatInput");
  if (input) input.value = prompts[kind] || prompts.pacing;
  sendLocalCoachMessage();
}

function sendIssueToChat(item) {
  showTab("tab5");
  const input = getEl("chatInput");
  if (!input) return;
  if (!getApiKey()) {
    showLocalTipForIssue(item);
    showPeStatus("No API key — showed local tip instead.", "ok");
    return;
  }
  input.value = `Issue (${item.module}): "${item.targetText}"\n${item.explanation}\nSuggest a fix in my voice. One paragraph.`;
  updateTokenEstimate();
  input.focus();
}

async function sendIssueToRewrite(item) {
  const target = item?.targetText;
  if (!target || String(target).startsWith("(")) {
    showPeStatus("Cannot paraphrase this item.", "warn");
    return;
  }
  rewriteFromAuditSession = true;
  updateRewriteBackNav();
  showTab("tab6");
  lastRewritePreview = "";
  lastRewriteOriginal = "";
  const preview = getEl("rewritePreview");
  if (preview) preview.innerText = "Selecting passage in Word…";
  try {
    await wordRun("rewrite-from-card", async (ctx) => {
      await ProzaEdit.WordSafeNavigator.selectFirstInBody(ctx, target);
    });
    const scopeEl = getEl("scope");
    if (scopeEl && scopeEl.value !== "selection") {
      scopeEl.value = "selection";
      const pinScope = getEl("pinScope");
      if (pinScope) pinScope.value = "selection";
      await persistSettings(false);
    }
    const snippet = String(target).length > 120 ? `${String(target).slice(0, 117)}…` : target;
    if (preview) {
      preview.innerText = `Selected in Word: “${snippet}”\n\nPick a paraphrase mode, then Local paraphrase (free). Nothing changes until you apply the preview.`;
    }
    showPeStatus("Rewrite tab — run Local paraphrase when ready.", "ok");
    getEl("rewriteMode")?.focus();
  } catch (e) {
    if (preview) preview.innerText = wordRecoveryMessage(e, "select that passage");
    reportActionError(e, "select that passage");
  }
}

/* Section loop */
function getSectionParagraphCount() {
  const n = parseInt(document.getElementById("sectionParagraphCount")?.value, 10);
  return isNaN(n) ? 40 : Math.min(150, Math.max(5, n));
}

function getSectionIndex() {
  const v = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.SECTION_IDX, 0);
  const n = typeof v === "number" ? v : parseInt(v, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

function selectNextSection() {
  return wordRun("section", async (ctx) => {
    const paras = ctx.document.body.paragraphs;
    paras.load("items");
    await ctx.sync();
    const total = paras.items.length;
    if (!total) throw new Error("No paragraphs.");
    if (total > MAX_PARAS) throw new Error("Too many paragraphs—select manually.");
    let idx = getSectionIndex();
    if (idx >= total) {
      idx = 0;
      showPeStatus("Wrapped to the start of the document.", "ok");
    }
    const end = Math.min(idx + getSectionParagraphCount() - 1, total - 1);
    paras.items[idx].getRange("Start").expandTo(paras.items[end].getRange("End")).select();
    await ctx.sync();
    await ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.SECTION_IDX, end + 1);
    const scopeEl = getEl("scope");
    if (scopeEl) scopeEl.value = "selection";
    const pinScope = getEl("pinScope");
    if (pinScope) pinScope.value = "selection";
    await persistSettings(false);
  });
}

async function selectNextSectionAndAudit() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  try {
    await selectNextSection();
    await new Promise((r) => setTimeout(r, 100));
    runPrimaryAudit();
  } catch (e) {
    reportActionError(e, "select the next section");
  }
}

function openWordProofing() {
  showPeStatus("In Word: press F7 or Review → Editor (M365).", "ok");
}

/* Gemini */
function getApiKey() {
  return getEl("apiKey")?.value.trim() || "";
}

async function runDeepAuditAI() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  const key = getApiKey();
  if (!key) {
    showPeStatus("Add a Gemini API key under Settings → Essentials (optional Gemini), or use the free local audit.", "warn");
    showTab("tab5");
    return;
  }
  if (
    !(await peConfirm({
      title: "Deep audit via Gemini",
      message:
        "Deep Audit uses 1 Gemini API call.\n\nTry Extended local audit (0 tokens) or Copy for Copilot first.\n\nContinue with Gemini?",
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
    }))
  )
    return;
  const actionId = ProzaEdit.LongOp?.ACTION_IDS?.DEEP_AUDIT;
  return runAfterLongOperationWarning(actionId, () => runDeepAuditAICore());
}

async function runDeepAuditAICore() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  deepBusy = true;
  clearRetry();
  const timing = createPhaseTiming();
  let longOp = null;
  let cancelled = false;
  let failed = false;
  const sumD = getEl("summaryReport");
  try {
    setModuleButtonsDisabled(true);
    longOp = beginLongOperation({ initialStatus: "Reading for deep audit…" });
    showTab("tab4");
    currentAuditSuggestions = [];
    const cardD = getEl("cardContainer");
    if (sumD) sumD.textContent = "Deep audit…";
    if (cardD) cardD.innerHTML = "";

    let excerpt = "";
    try {
      excerpt = await wordRun("deep-read", async (ctx) => {
        longOp.setStatus("Reading for deep audit…");
        return (await readScopeText(ctx, longOp)).substring(0, MAX_DEEP);
      });
    } catch (e) {
      if (isLongOpCancelledError(e)) {
        cancelled = true;
        if (sumD) sumD.textContent = "Cancelled.";
        return;
      }
      failed = true;
      const message = wordRecoveryMessage(e, "read the document for deep audit");
      if (sumD) sumD.innerHTML = `<span style="color:var(--red)">${escapeHtml(message)}</span>`;
      if (ProzaEdit.AuditReview?.isRetryable?.(e)) registerRetry("Deep audit", () => runDeepAuditAICore());
      return;
    }
    timing.mark("read");
    longOp.throwIfCancelled();
    longOp.setStatus("Waiting for Gemini…");

    const prompt =
      `${GUARDRAILS}\n${buildManuscriptProfile()}\nReturn ONLY JSON array (max 6):\n[{"module":"","type":"confirmed|preference","explanation":"","targetText":"","replacementText":"","ruleId":""}]\n\nEXCERPT:\n${excerpt}`;
    const reply = await geminiGenerateWithQuota(prompt, { maxOutputTokens: 1200, temperature: 0.3 }, null, longOp.abortSignal);
    timing.mark("gemini");
    longOp.throwIfCancelled();
    let ai = [];
    try {
      const start = reply.indexOf("[");
      const end = reply.lastIndexOf("]");
      if (start < 0 || end <= start) throw new Error("Bad AI JSON—use local audit.");
      const t = reply.substring(start, end + 1);
      const parsed = JSON.parse(t);
      if (!Array.isArray(parsed)) throw new Error("Bad AI JSON—use local audit.");
      ai = parsed
        .slice(0, 8)
        .filter((x) => x && typeof x === "object")
        .map((x, i) => ({
          id: `ai_${i}`,
          ruleId: x.ruleId || `ai:${i}`,
          module: x.module || "Deep audit",
          type: x.type === "confirmed" ? "confirmed" : "preference",
          explanation: String(x.explanation || ""),
          targetText: String(x.targetText || ""),
          replacementText: String(x.replacementText || ""),
        }))
        .filter((x) => x.targetText && x.explanation);
    } catch (_) {
      throw new Error("Bad AI JSON—use local audit.");
    }
    lastAuditExcerpt = excerpt;
    const local = ProzaEdit.Audit.run(excerpt, buildAuditContext());
    const merged = ProzaEdit.Audit._dedupe([...local.suggestions, ...ai]).slice(0, 60);
    const score = Math.max(5, Math.round((10 - merged.filter((s) => s.type === "confirmed").length * 0.45) * 10) / 10);
    finalizeAudit({ ...local, suggestions: merged, score, traffic: ProzaEdit.Metrics.trafficLight(score) }, "Deep audit");
    timing.mark("render");
  } catch (e) {
    if (isLongOpCancelledError(e)) {
      cancelled = true;
      if (sumD) sumD.textContent = "Cancelled.";
      showAuditEmptyIfNeeded();
    } else {
      failed = true;
      const message = wordRecoveryMessage(e, "finish the deep audit");
      if (sumD) sumD.innerHTML = `<span style="color:var(--red)">${escapeHtml(message)}</span>`;
      if (ProzaEdit.AuditReview?.isRetryable?.(e)) registerRetry("Deep audit", () => runDeepAuditAICore());
    }
  } finally {
    deepBusy = false;
    setModuleButtonsDisabled(false);
    endLongOperation(longOp);
    const timingSummary = reportPhaseTiming("deep audit", timing);
    if (cancelled) showPeStatus("Cancelled.", "warn");
    else if (failed) {
      showPeStatus(
        getRetryController()?.has?.() ? "Deep audit could not finish. Use Try again, or run the free local audit." : "Deep audit could not finish.",
        "warn"
      );
    } else showPeStatus(timingSummary ? `Deep audit finished. ${timingSummary}` : "Deep audit finished.", "ok");
  }
}

function setupChatTokenEstimate() {
  const input = document.getElementById("chatInput");
  if (!input) return;
  input.addEventListener("input", updateTokenEstimate);
  updateTokenEstimate();
}

function updateTokenEstimate() {
  const chat = getEl("chatInput")?.value || "";
  const el = getEl("tokenEstimate");
  if (!el) return;
  const key = getApiKey();
  if (!key) {
    el.textContent = "Local Coach: 0 tokens (add API key only for Gemini)";
    return;
  }
  el.textContent = `Gemini est.: ~${ProzaEdit.Gemini.estimateTokens(chat) + 400} tokens if you use Send via Gemini`;
}

function appendChatMessage(log, text, cls, isError) {
  if (!log) return;
  const div = document.createElement("div");
  div.className = `chat-msg ${cls}`;
  if (isError) div.style.color = "var(--red)";
  div.textContent = String(text == null ? "" : text);
  log.appendChild(div);
}

async function sendChatMessage() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  const key = getApiKey();
  const prompt = getEl("chatInput")?.value.trim() || "";
  if (!prompt) {
    showPeStatus("Enter a message first.", "warn");
    return;
  }
  if (!key) {
    if (
      await peConfirm({
        title: "No API key",
        message: "No Gemini API key. Use free Local Coach instead?",
        confirmLabel: "Use Local Coach",
        cancelLabel: "Cancel",
      })
    )
      sendLocalCoachMessage();
    return;
  }
  if (
    !(await peConfirm({
      title: "Send via Gemini",
      message: "Send via Gemini (uses API tokens)?",
      confirmLabel: "Send",
      cancelLabel: "Cancel",
    }))
  )
    return;
  if (
    ProzaEdit.Gemini.estimateTokens(prompt) > 2000 &&
    !(await peConfirm({
      title: "Large prompt",
      message: "Large prompt—continue?",
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
    }))
  )
    return;

  const log = getEl("chatLog");
  if (!log) return;

  appendChatMessage(log, prompt, "chat-user");
  getEl("chatInput").value = "";
  let context = "";
  auditStarting = true;
  try {
    context = await wordRun("chat-ctx", readChatContext);
  } catch (e) {
    const result = reportActionError(e, "read the chat context");
    appendChatMessage(log, result.message, "chat-ai", true);
    trimChatLog(log);
    log.scrollTop = log.scrollHeight;
    return;
  } finally {
    auditStarting = false;
  }
  const text = `${GUARDRAILS}\n${buildManuscriptProfile()}\n\nContext:\n${context}\n\nQuestion:\n${prompt}`;
  await runChatGeminiCall(text);
}

async function runChatGeminiCall(text) {
  if (isOperationBusy()) {
    warnOperationBusy();
    return false;
  }
  const log = getEl("chatLog");
  if (!log) return false;
  const sendBtn = document.querySelector("#tab5 .btn-main");
  chatBusy = true;
  clearRetry();
  if (sendBtn) sendBtn.disabled = true;
  const op = beginLongOperation({ initialStatus: "Waiting for Gemini…" });
  try {
    const reply = await geminiGenerateWithQuota(text, { maxOutputTokens: 1024, temperature: 0.5 }, null, op.abortSignal);
    op.throwIfCancelled();
    appendChatMessage(log, reply, "chat-ai");
    return true;
  } catch (e) {
    const result = reportActionError(e, "get a Gemini reply", {
      retry: { label: "Gemini chat", run: () => runChatGeminiCall(text) },
    });
    appendChatMessage(log, result.message, "chat-ai", !result.cancelled);
    return false;
  } finally {
    chatBusy = false;
    if (sendBtn) sendBtn.disabled = false;
    endLongOperation(op);
    trimChatLog(log);
    log.scrollTop = log.scrollHeight;
    persistSettings(false);
  }
}

function trimChatLog(log) {
  if (!log) return;
  const items = log.querySelectorAll(".chat-msg");
  if (items.length > 40) {
    for (let i = 0; i < items.length - 40; i++) items[i].remove();
  }
}

function syncShaperSliderLabels() {
  [
    ["slider-shaper-complexity", "label-shaper-complexity"],
    ["slider-shaper-intensity", "label-shaper-intensity"],
    ["slider-shaper-density", "label-shaper-density"],
  ].forEach(([sid, lid]) => {
    const s = getEl(sid);
    const l = getEl(lid);
    if (s && l) l.textContent = s.value;
  });
}

/* Rewrite tab */
async function runLocalRewrite() {
  if (rewriteBusy) return;
  if (!window.ProzaEdit?.LocalRewrite?.run) {
    showPeStatus("Local paraphrase failed to load. Reload the task pane.", "warn");
    return;
  }
  rewriteBusy = true;
  const mode = getEl("rewriteMode")?.value || "fluency";
  const preview = getEl("rewritePreview");
  if (preview) preview.innerText = "Processing locally…";

  try {
    const excerpt = await wordRun("rewrite-local", async (ctx) => {
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      const t = (sel.text || "").trim();
      if (!t) throw new Error("Highlight text to paraphrase.");
      if (t.length > MAX_CHAT) throw new Error("Selection too long—use a smaller passage.");
      return t;
    });
    lastRewriteOriginal = excerpt;
    if (ProzaEdit.LexicalShaper?.isShaperPanelActive?.()) {
      lastRewritePreview = ProzaEdit.LexicalShaper.shape(
        excerpt,
        mode,
        ProzaEdit.LexicalShaper.readSettingsFromDom()
      );
    } else {
      lastRewritePreview = ProzaEdit.LocalRewrite.run(mode, excerpt);
    }
    if (preview) preview.innerText = lastRewritePreview || excerpt;
    const est = getEl("rewriteTokenEstimate");
    if (est) est.textContent = "Local paraphrase: 0 tokens";
    showPeStatus("Local paraphrase ready (0 tokens).", "ok");
  } catch (e) {
    if (preview) preview.innerText = wordRecoveryMessage(e, "paraphrase this selection");
    lastRewritePreview = "";
    lastRewriteOriginal = "";
  } finally {
    rewriteBusy = false;
  }
}

async function runSmartRewrite() {
  if (isOperationBusy()) {
    warnOperationBusy();
    return;
  }
  const key = getApiKey();
  if (!key) {
    showPeStatus("Add a Gemini API key under Settings → Essentials, or use Local paraphrase (free).", "warn");
    showTab("tab5");
    return;
  }
  if (
    !(await peConfirm({
      title: "Rewrite via Gemini",
      message: "Rewrite via Gemini uses API tokens. Continue?",
      confirmLabel: "Continue",
      cancelLabel: "Cancel",
    }))
  )
    return;
  const mode = getEl("rewriteMode")?.value || "fluency";
  const preview = getEl("rewritePreview");
  if (!preview) return;
  rewriteBusy = true;
  preview.innerText = "Reading selection…";
  let excerpt = "";
  try {
    excerpt = await wordRun("rewrite-read", async (ctx) => {
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      const t = (sel.text || "").trim();
      if (!t) throw new Error("Highlight text to rewrite.");
      if (t.length > MAX_CHAT) throw new Error("Selection too long—use a smaller passage.");
      lastRewriteOriginal = t;
      return t;
    });
  } catch (e) {
    preview.innerText = wordRecoveryMessage(e, "read your selection");
    lastRewritePreview = "";
    return;
  } finally {
    rewriteBusy = false;
  }
  const est = getEl("rewriteTokenEstimate");
  if (est) est.textContent = `Est. tokens: ~${ProzaEdit.Gemini.estimateTokens(excerpt) + 200}`;
  const prompt = ProzaEdit.Gemini.buildRewritePrompt(mode, excerpt, buildManuscriptProfile(), GUARDRAILS);
  await runRewriteGeminiCall(prompt);
}

async function runRewriteGeminiCall(prompt) {
  if (isOperationBusy()) {
    warnOperationBusy();
    return false;
  }
  const preview = getEl("rewritePreview");
  if (!preview) return false;
  rewriteBusy = true;
  clearRetry();
  preview.innerText = "Rewriting…";
  const op = beginLongOperation({ initialStatus: "Waiting for Gemini…" });
  try {
    const text = await geminiGenerateWithQuota(prompt, { maxOutputTokens: 1024, temperature: 0.55 }, null, op.abortSignal);
    op.throwIfCancelled();
    lastRewritePreview = text;
    preview.innerText = text;
    showPeStatus("Gemini rewrite ready.", "ok");
    return true;
  } catch (e) {
    lastRewritePreview = "";
    const result = reportActionError(e, "get a Gemini rewrite", {
      retry: { label: "Gemini rewrite", run: () => runRewriteGeminiCall(prompt) },
    });
    preview.innerText = result.cancelled ? "Cancelled. Nothing was changed in Word." : result.message;
    return false;
  } finally {
    rewriteBusy = false;
    endLongOperation(op);
  }
}

function applyRewritePreview() {
  if (!lastRewritePreview) {
    showPeStatus("Run rewrite first.", "warn");
    return;
  }
  if (!lastRewriteOriginal) {
    showPeStatus("Re-run rewrite on your selection, then apply.", "warn");
    return;
  }
  applyDocumentEdit(lastRewriteOriginal, lastRewritePreview, "Rewrite").then((ok) => {
    if (ok) lastRewriteOriginal = lastRewritePreview;
  });
}

/* Speech */
function initSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.getElementById("micBtn")?.remove();
    return;
  }
  if (recognition) return;
  recognition = new SR();
  recognition.interimResults = true;
  recognition.onresult = (ev) => {
    let t = "";
    for (let i = ev.resultIndex; i < ev.results.length; i++) t += ev.results[i][0].transcript;
    document.getElementById("chatInput").value = t;
    updateTokenEstimate();
  };
  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();
}

function toggleVoiceDictation() {
  if (!recognition) initSpeechRecognition();
  if (!recognition) return;
  if (isRecording) recognition.stop();
  else {
    recognition.lang = document.getElementById("language").value || "en-US";
    try {
      recognition.start();
      isRecording = true;
      document.getElementById("micStatus").innerText = "Listening…";
    } catch (_) {}
  }
}

function stopMic() {
  isRecording = false;
  document.getElementById("micStatus").innerText = "";
}

function setupEnterKeyHandler() {
  const input = getEl("chatInput");
  if (!input || input.dataset.boundEnter) return;
  input.dataset.boundEnter = "1";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}
