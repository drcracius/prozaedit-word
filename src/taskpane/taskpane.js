/**
 * ProzaEdit Word Task Pane (Phases 1–4 integrated).
 * Release/build semver: PROZAEDIT_BUILD_VERSION — must match manifest.hosted.xml <Version>.
 */
const PROZAEDIT_BUILD_VERSION = "2.0.0.14";
const PROZAEDIT_MANIFEST_URL = "https://raw.githubusercontent.com/drcracius/prozaedit-word/main/manifest.hosted.xml";
const PROZAEDIT_UI_URL = "https://drcracius.github.io/prozaedit-word/src/taskpane/taskpane.html";
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
let auditCardSort = "priority";
let batchCancel = false;
let lastAuditExcerpt = "";
let lastAuditMeta = {};
let lastFeedbackLetter = "";
let lastDocStats = null;
let lastMiniScores = null;
let heatmapBusy = false;
let persistDebounceTimer = null;
let skipFullScanConfirm = false;
let msIndexCache = null;
let msIndexBusy = false;
let scopeChapterListCache = [];

const AUDIT_PIN_FIELDS = [
  ["manuscriptType", "pinManuscriptType", true],
  ["scope", "pinScope", false],
  ["criticPersona", "pinCriticPersona", false],
];

const AUDIT_EMPTY_HTML = `<div class="audit-empty">
  <div class="audit-empty-icon" aria-hidden="true">📝</div>
  <p><strong>No audit yet</strong></p>
  <p>Highlight a passage in Word (or use <strong>Checks → Section + audit</strong>).</p>
  <button type="button" class="btn-secondary" onclick="runPrimaryAudit()">Run audit</button>
  <button type="button" class="btn-secondary" onclick="showTab('tab3')">Configure checks</button>
</div>`;

function confirmBeforeApply(actionLabel) {
  const el = document.getElementById("confirmBeforeApply");
  if (el && !el.checked) return true;
  return confirm(`Apply this change to Word?\n\n${actionLabel}`);
}

function setupSafeHandlers() {
  const remember = document.getElementById("rememberApiKey");
  if (remember) {
    remember.addEventListener("change", () => {
      if (remember.checked) {
        alert("API key will be stored inside this Word document. Use only on your private PC.");
      } else {
        const keyEl = getEl("apiKey");
        if (keyEl) keyEl.value = "";
        persistSettings(false);
      }
    });
  }
  const scope = document.getElementById("scope");
  if (scope) {
    scope.addEventListener("change", () => {
      syncScopePanels();
      updateActiveChecksHint();
      if (scope.value === "full") {
        alert("Full manuscript scans can be slow on long docs. For plot/character checks, prefer full or wide chapter range when possible.");
      }
      if (scope.value === "chapter" || scope.value === "chapter-range") refreshChapterScopeLists();
      schedulePersistSettings();
    });
  }
}

function getScopeMode() {
  return getEl("scope")?.value || "selection";
}

function getScopeCharLimit(mode) {
  return ProzaEdit.ScopeReader?.getLimit?.(mode || getScopeMode()) || MAX_LOCAL_AUDIT_CHARS;
}

function getScopeOptions() {
  return {
    mode: getScopeMode(),
    pageFrom: getEl("scopePageFrom")?.value || 1,
    pageTo: getEl("scopePageTo")?.value || 5,
    chapterSingle: getEl("scopeChapterSingle")?.value || 1,
    chapterFrom: getEl("scopeChapterFrom")?.value || 1,
    chapterTo: getEl("scopeChapterTo")?.value || 1,
    chapters: scopeChapterListCache,
  };
}

function syncScopePanels() {
  const mode = getScopeMode();
  const pages = getEl("scopePagesPanel");
  const ch = getEl("scopeChapterPanel");
  const single = getEl("scopeChapterSingleWrap");
  const range = getEl("scopeChapterRangeWrap");
  if (pages) pages.classList.toggle("hidden", mode !== "pages");
  if (ch) ch.classList.toggle("hidden", mode !== "chapter" && mode !== "chapter-range");
  if (single) single.classList.toggle("hidden", mode !== "chapter");
  if (range) {
    range.classList.toggle("hidden", mode !== "chapter-range");
    range.style.display = mode === "chapter-range" ? "flex" : "none";
  }
}

function setupScopeUi() {
  syncScopePanels();
  ["scopePageFrom", "scopePageTo", "scopeChapterSingle", "scopeChapterFrom", "scopeChapterTo"].forEach((id) => {
    const el = getEl(id);
    if (el && !el.dataset.scopeBound) {
      el.dataset.scopeBound = "1";
      el.addEventListener("change", () => {
        schedulePersistSettings();
        refreshScopeCharPreview();
      });
    }
  });
}

function fillChapterSelects(list) {
  scopeChapterListCache = list || [];
  const opts = (n) => {
    const sel = getEl(n);
    if (!sel) return;
    sel.innerHTML = "";
    if (!list.length) {
      sel.innerHTML = '<option value="1">No Heading 1–3 chapters found</option>';
      return;
    }
    list.forEach((c) => {
      const o = document.createElement("option");
      o.value = String(c.index);
      o.textContent = `${c.index}. ${c.title.substring(0, 48)}`;
      sel.appendChild(o);
    });
  };
  opts("scopeChapterSingle");
  opts("scopeChapterFrom");
  opts("scopeChapterTo");
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
    .catch((e) => showPeStatus(e.message, "warn"));
}

function updateScopeCharPreviewDisplay(charCount, label, mode) {
  const el = getEl("scopeCharPreview");
  if (!el) return;
  const limit = getScopeCharLimit(mode);
  const over = charCount > limit;
  el.classList.toggle("over-limit", over);
  const fmt = charCount.toLocaleString();
  const lim = limit.toLocaleString();
  el.textContent = over
    ? `${label}: ~${fmt} characters — over limit (${lim}). Narrow scope or use section loop.`
    : `${label}: ~${fmt} characters (limit ${lim}).`;
}

function refreshScopeCharPreview() {
  if (auditBusy) {
    showPeStatus("Wait for audit to finish.", "warn");
    return Promise.resolve();
  }
  const mode = getScopeMode();
  if (mode === "chapter" || mode === "chapter-range") {
    if (!scopeChapterListCache.length) {
      updateScopeCharPreviewDisplay(0, "Chapters not loaded", mode);
      return refreshChapterScopeLists();
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
        el.textContent = e.message;
        el.classList.add("over-limit");
      }
    });
}

function scheduleManuscriptIndexBuild(force) {
  if (msIndexBusy && !force) return;
  msIndexBusy = true;
  wordRun("ms-index", async (ctx) => {
    const body = ctx.document.body;
    body.load("text");
    await ctx.sync();
    return (body.text || "").substring(0, 600000);
  })
    .then((text) => {
      if (text.length < 200) return;
      msIndexCache = ProzaEdit.ContinuityGuard.buildIndex(text);
      return ProzaEdit.Settings.setAsync(ProzaEdit.ContinuityGuard.KEYS.INDEX, JSON.stringify(msIndexCache));
    })
    .catch(() => {})
    .finally(() => {
      msIndexBusy = false;
    });
}

function getManuscriptIndex() {
  if (msIndexCache) return msIndexCache;
  try {
    const raw = ProzaEdit.Settings.get(ProzaEdit.ContinuityGuard.KEYS.INDEX, null);
    if (raw) msIndexCache = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (_) {}
  return msIndexCache;
}

function fictionModulesActive() {
  return ["mPlot", "mMotivation", "mDialogue", "mContinuity", "mPlausibility", "mPacing", "mSpoiler"].some((id) =>
    isModuleEnabled(id)
  );
}

function scopeCoversFullManuscript() {
  const mode = getScopeMode();
  if (mode === "full") return true;
  if (mode === "chapter-range" && scopeChapterListCache.length) {
    const from = parseInt(getEl("scopeChapterFrom")?.value, 10) || 1;
    const to = parseInt(getEl("scopeChapterTo")?.value, 10) || 1;
    return from <= 1 && to >= scopeChapterListCache.length;
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

Office.onReady((info) => {
  if (typeof Office === "undefined") {
    document.body.insertAdjacentHTML("afterbegin", '<p style="color:#d93025;">Office.js failed to load. Check network and reload.</p>');
    return;
  }
  if (info.host !== Office.HostType.Word) {
    document.body.insertAdjacentHTML("afterbegin", '<p style="color:#d93025;">Open ProzaEdit inside Microsoft Word.</p>');
    return;
  }
  try {
    loadSavedSettings();
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
    bindWorkflowStepper();
    updateWorkflowStepper("tab1");
    updateUndoRedoUi();
    updateAuditFilterChips();
    updateAuditSortChips();
    applySimpleMode();
    syncShaperSliderLabels();
    applyHoverTips();
    updateActiveChecksHint();
    try {
      skipFullScanConfirm = sessionStorage.getItem("PROZAEDIT_FULL_OK") === "1";
    } catch (_) {}
    const sm = getEl("simpleMode");
    if (sm && !sm.dataset.bound) {
      sm.dataset.bound = "1";
      sm.addEventListener("change", () => {
        applySimpleMode();
        persistSettings(false);
      });
    }
    showAuditEmptyIfNeeded();
    setTimeout(() => scheduleManuscriptIndexBuild(false), 2500);
    try {
      if (sessionStorage.getItem("PROZAEDIT_UPDATE_CHECK") !== PROZAEDIT_BUILD_VERSION) {
        sessionStorage.setItem("PROZAEDIT_UPDATE_CHECK", PROZAEDIT_BUILD_VERSION);
        setTimeout(() => checkForUpdates(false), 4000);
      }
    } catch (_) {}
  } catch (e) {
    console.error(e);
    alert("ProzaEdit failed to initialize. Reload the task pane.");
  }
});

function updateWorkflowStepper(tabId) {
  let step = "1";
  if (tabId === "tab3") step = "2";
  else if (tabId === "tab4") step = currentAuditSuggestions.length ? "4" : "3";
  else if (tabId === "tab1") step = "1";
  document.querySelectorAll(".workflow-step[data-workflow-step]").forEach((el) => {
    el.classList.toggle("workflow-step-active", el.dataset.workflowStep === step);
  });
}

function showTab(tabId) {
  if (!TAB_IDS.includes(tabId)) return;
  TAB_IDS.forEach((id) => {
    document.getElementById(id)?.classList.toggle("active", id === tabId);
  });
  document.querySelectorAll(".tab-btn[data-pe-tab]").forEach((btn) => {
    const on = btn.dataset.peTab === tabId;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  updateWorkflowStepper(tabId);
  if (tabId === "tab4") {
    syncAuditPinsFromMain();
    restoreCachedAuditIfEmpty();
    showAuditEmptyIfNeeded();
    updateActiveChecksHint();
  }
  if (tabId === "tab3") updateActiveChecksHint();
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
  const fiction = (getEl("manuscriptType")?.value || "").includes("Fiction");
  ["mPlot", "mMotivation", "mDialogue", "mContinuity", "mPlausibility", "mPacing", "mSpoiler"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !fiction;
  });
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
    scopeChapterSingle: getEl("scopeChapterSingle")?.value || "1",
    scopeChapterFrom: getEl("scopeChapterFrom")?.value || "1",
    scopeChapterTo: getEl("scopeChapterTo")?.value || "1",
    auditExtended: isAuditExtended(),
    reportDensity: getEl("reportDensity")?.value || "balanced",
    modules: {},
  };
  MODULE_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) cfg.modules[id] = !!el.checked;
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
  const setV = (id, v) => {
    const el = document.getElementById(id);
    if (el && v != null) el.value = v;
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
  if (p.auditCardFilter && ["all", "confirmed", "preference", "styleguide"].includes(p.auditCardFilter)) {
    auditCardFilter = p.auditCardFilter;
    updateAuditFilterChips();
  }
  if (p.auditCardSort && ["priority", "module"].includes(p.auditCardSort)) {
    auditCardSort = p.auditCardSort;
    updateAuditSortChips();
  }
  setC("simpleMode", p.simpleMode);
  setC("showHoverTips", p.showHoverTips !== false);
  setC("fkLock", p.fkLock);
  setC("remindVersionHistory", p.remindVersionHistory);
  setC("fictionScopeReminder", p.fictionScopeReminder !== false);
  if (p.continuityWarnLevel) setV("continuityWarnLevel", p.continuityWarnLevel);
  if (p.scopePageFrom) setV("scopePageFrom", p.scopePageFrom);
  if (p.scopePageTo) setV("scopePageTo", p.scopePageTo);
  setC("auditExtended", p.auditExtended);
  if (p.reportDensity) setV("reportDensity", p.reportDensity);
  syncExtendedAuditToggles();
  syncScopePanels();
  applySimpleMode();
  updateActiveChecksHint();
}

function loadSavedSettings() {
  const raw = ProzaEdit.Settings.get(ProzaEdit.Settings.KEYS.CONFIG);
  if (!raw) return;
  try {
    applyUiConfig(typeof raw === "string" ? JSON.parse(raw) : raw);
    adaptModules();
    toggleCustomStylePanel();
    if (!isChecked("rememberApiKey", false)) persistSettings(false);
  } catch (e) {
    console.warn(e);
  }
}

function persistSettings(showAlert) {
  updateActiveChecksHint();
  return ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.CONFIG, JSON.stringify(collectUiConfig())).then((ok) => {
    if (showAlert) {
      showPeStatus(ok ? "Settings saved with this document." : "Save failed.", ok ? "ok" : "warn");
    }
    return ok;
  });
}

function schedulePersistSettings() {
  if (persistDebounceTimer) clearTimeout(persistDebounceTimer);
  persistDebounceTimer = setTimeout(() => persistSettings(false), 350);
}

function saveConfiguration() {
  persistSettings(true);
}

function isAuditExtended() {
  const boxes = document.querySelectorAll('input[data-audit-extended="1"]');
  for (let i = 0; i < boxes.length; i++) if (boxes[i].checked) return true;
  return false;
}

function syncExtendedAuditToggles() {
  const on = isChecked("auditExtended", isChecked("auditExtendedChecks", false));
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

function updateActiveChecksHint() {
  const nodes = document.querySelectorAll(".active-checks-hint");
  if (!nodes.length) return;
  const ctx = buildAuditContext();
  const parts = [];
  if (ctx.chkRep) parts.push("repetition");
  if (ctx.chkProp) parts.push("names");
  if (ctx.chkSpell) parts.push("proofing + style");
  if (ctx.chkAI) parts.push("AI-voice");
  if (ctx.fkLock) parts.push("FK lock");
  const fiction = String(ctx.manuscriptType || "").includes("Fiction");
  if (fiction) {
    const mods = ["mPlot", "mMotivation", "mDialogue", "mContinuity", "mPlausibility", "mPacing", "mSpoiler"].filter((id) =>
      isModuleEnabled(id)
    );
    if (mods.length && mods.length < 7) parts.push(`${mods.length}/7 fiction`);
    else if (mods.length === 7) parts.push("fiction×7");
  }
  const ext = isAuditExtended() ? " · extended" : "";
  const sm = getScopeMode();
  const scope =
    sm === "full"
      ? "full doc"
      : sm === "pages"
        ? "pages"
        : sm === "chapter"
          ? "chapter"
          : sm === "chapter-range"
            ? "ch. range"
            : "selection";
  const sg = getEl("styleGuideRef")?.value || "auto";
  let sgLabel = sg;
  if (sg === "custom" || sg === "custom-plus-auto") {
    const n = ProzaEdit.Settings.getCustomStyleGuide().name;
    sgLabel = sg === "custom-plus-auto" ? `custom+auto${n ? `: ${n}` : ""}` : n ? `custom: ${n}` : "custom";
  }
  const msg = parts.length
    ? `Active: ${parts.join(", ")} · ${scope} · style: ${sgLabel}${ext}`
    : `No checks enabled — turn on toggles below · ${scope} · style: ${sgLabel}${ext}`;
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
      if (el.id === "scope") updateActiveChecksHint();
      if (el.id === "styleGuideRef") toggleCustomStylePanel();
      if (el.id === "showHoverTips") applyHoverTips();
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
    "confirmBeforeApply",
    "fkLock",
    "remindVersionHistory",
    "fictionScopeReminder",
    "showHoverTips",
    "continuityWarnLevel",
    "scopePageFrom",
    "scopePageTo",
    "sectionParagraphCount",
    "reportDensity",
  ].forEach((id) => bind(getEl(id)));
  MODULE_IDS.forEach((id) => bind(getEl(id)));
  document.querySelectorAll('input[data-audit-extended="1"]').forEach((el) => {
    if (el.dataset.peAutosave) return;
    el.dataset.peAutosave = "1";
    el.addEventListener("change", () => {
      syncExtendedAuditToggles();
      schedulePersistSettings();
    });
  });
}

async function prepareScopeForAudit() {
  const scope = getScopeMode();
  if (scope !== "selection") {
    if (scope === "chapter" || scope === "chapter-range") {
      if (!scopeChapterListCache.length) {
        try {
          await refreshChapterScopeLists();
        } catch (_) {
          return false;
        }
      }
    }
    await refreshScopeCharPreview();
    const prev = getEl("scopeCharPreview");
    if (prev?.classList.contains("over-limit")) {
      alert("Scope exceeds character limit. Narrow pages/chapters or use section loop.");
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
  } catch (_) {
    return false;
  }
  if (
    confirm(
      "Nothing (or too little) is highlighted in Word.\n\nSelect the next section automatically and run audit?\n\n(Cancel = stop; you can highlight text yourself.)"
    )
  ) {
    try {
      await selectNextSection();
      await new Promise((r) => setTimeout(r, 200));
      return true;
    } catch (e) {
      showPeStatus(e.message, "warn");
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
      showPeStatus("No custom rules yet — add on Target tab or choose Custom + Auto.", "warn");
      showTab("tab1");
      toggleCustomStylePanel();
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
  return `Type: ${c.manuscriptType}\nAudience: ${c.targetAudience}\nSetting: ${c.settingAnchor}\nCritic: ${c.criticPersona}\nLanguage: ${c.language}`;
}

function applySimpleMode() {
  document.body.classList.toggle("pe-simple-mode", isChecked("simpleMode", false));
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
    mPlot: isModuleEnabled("mPlot"),
    mMotivation: isModuleEnabled("mMotivation"),
    mDialogue: isModuleEnabled("mDialogue"),
    mContinuity: isModuleEnabled("mContinuity"),
    mPlausibility: isModuleEnabled("mPlausibility"),
    mPacing: isModuleEnabled("mPacing"),
    mSpoiler: isModuleEnabled("mSpoiler"),
    reportDensity: getEl("reportDensity")?.value || "balanced",
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

function useSelectionEdits() {
  return !!document.getElementById("replaceInSelectionOnly")?.checked;
}

function showPeStatus(message, kind) {
  const el = getEl("peStatus");
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("ok", "warn");
  if (kind) el.classList.add(kind);
  if (peStatusTimer) clearTimeout(peStatusTimer);
  if (message) {
    peStatusTimer = setTimeout(() => {
      el.textContent = "";
      el.classList.remove("ok", "warn");
    }, 4500);
  }
}

function updateUndoRedoUi() {
  const u = getEl("btnUndo");
  const r = getEl("btnRedo");
  const hist = ProzaEdit.EditHistory;
  if (u) {
    u.disabled = historyBusy || !hist.canUndo();
    const peek = hist.peekUndo();
    u.title = peek ? `Undo: ${peek.label} (Ctrl+Shift+Z)` : "Nothing to undo";
  }
  if (r) r.disabled = historyBusy || !hist.canRedo();
}

async function swapTextInScope(fromText, toText, options) {
  return wordRun("pe-swap", async (ctx) => {
    const items = await ProzaEdit.WordSafeNavigator.searchInScope(ctx, fromText, {
      ...options,
      selectionOnly: useSelectionEdits(),
    });
    if (!items.length) {
      throw new Error("Text not found—document may have changed. Use Go to, then Apply again.");
    }
    const hit = items[0];
    hit.load("text");
    await ctx.sync();
    if (!hit.text) throw new Error("Match lost after sync—try Go to first.");
    hit.insertText(String(toText), Word.InsertLocation.replace);
    await ctx.sync();
  });
}

function applyDocumentEdit(beforeText, afterText, label, options) {
  const before = String(beforeText || "");
  const after = String(afterText || "");
  if (!before || before === after) return Promise.resolve(false);
  if (isChecked("remindVersionHistory", true) && !window._peVersionReminded) {
    window._peVersionReminded = true;
    showPeStatus("Tip: File → Version History before large edits.", "ok");
  }
  const level = parseInt(getEl("continuityWarnLevel")?.value, 10) || 3;
  const index = getManuscriptIndex();
  const warnings = ProzaEdit.ContinuityGuard.assessReplace(before, after, index, level);
  if (warnings.length) {
    const block = ProzaEdit.ContinuityGuard.formatWarningBlock(warnings);
    const proceed = confirm(
      `Continuity check (local, 0 tokens):\n\n${block}\n\nApply this change anyway?\n(Cancel = skip; use Dismiss on card to silence similar warnings.)`
    );
    if (!proceed) return Promise.resolve(false);
    warnings.forEach((w) => ProzaEdit.ContinuityGuard.dismissWarningKey(w.key));
  }
  if (!confirmBeforeApply(`Replace "${before}" with "${after}"?`)) return Promise.resolve(false);
  const searchOpts = options && options.forceDocument ? { forceDocument: true } : {};
  return swapTextInScope(before, after, searchOpts)
    .then(() => {
      ProzaEdit.EditHistory.record(before, after, label);
      updateUndoRedoUi();
      showPeStatus(`Applied: ${label}`, "ok");
      return true;
    })
    .catch((e) => {
      showPeStatus(e.message, "warn");
      alert(e.message);
      return false;
    });
}

async function prozaEditUndo() {
  if (historyBusy || !ProzaEdit.EditHistory.canUndo()) return;
  const entry = ProzaEdit.EditHistory.popUndo();
  if (!entry) return;
  historyBusy = true;
  updateUndoRedoUi();
  try {
    await swapTextInScope(entry.after, entry.before);
    showPeStatus(`Undid: ${entry.label}`, "ok");
  } catch (e) {
    ProzaEdit.EditHistory.revertPopUndo(entry);
    showPeStatus(e.message, "warn");
    alert(e.message);
  } finally {
    historyBusy = false;
    updateUndoRedoUi();
  }
}

async function prozaEditRedo() {
  if (historyBusy || !ProzaEdit.EditHistory.canRedo()) return;
  const entry = ProzaEdit.EditHistory.popRedo();
  if (!entry) return;
  historyBusy = true;
  updateUndoRedoUi();
  try {
    await swapTextInScope(entry.before, entry.after);
    showPeStatus(`Redid: ${entry.label}`, "ok");
  } catch (e) {
    ProzaEdit.EditHistory.revertPopRedo(entry);
    showPeStatus(e.message, "warn");
    alert(e.message);
  } finally {
    historyBusy = false;
    updateUndoRedoUi();
  }
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

async function readScopeText(context) {
  const mode = getScopeMode();
  const opts = getScopeOptions();
  const measured = await ProzaEdit.ScopeReader.measureScope(context, opts);
  const text = measured.text || "";
  if (!text.trim()) {
    if (mode === "selection") throw new Error("Highlight text in Word, or choose page/chapter/full scope.");
    throw new Error("No text for this scope.");
  }
  const cap = getScopeCharLimit(mode);
  if (text.length > MAX_BODY && mode === "full") throw new Error("Document too large—use chapter range or section loop.");
  if (text.length > cap) {
    throw new Error(`Scope ~${text.length.toLocaleString()} chars exceeds limit ${cap.toLocaleString()}. Narrow the range.`);
  }
  return text;
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

function renderDictionaryList() {
  const el = document.getElementById("dictList");
  if (!el) return;
  const words = ProzaEdit.Settings.getDictionary();
  if (!words.length) {
    el.innerHTML = "<span style='color:var(--text-muted);font-size:10px;'>No custom terms yet.</span>";
    return;
  }
  el.innerHTML = words
    .map((w) => `<span class="tag" data-dict="${escapeAttr(w)}">${escapeHtml(w)} ×</span>`)
    .join("");
  el.querySelectorAll(".tag[data-dict]").forEach((tag) => {
    tag.addEventListener("click", () => removeDictionaryWord(tag.dataset.dict));
  });
}

async function resetMutedRules() {
  await ProzaEdit.Settings.resetMutedRules();
  alert("Muted rules cleared. Re-run audit.");
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
  updateActiveChecksHint();
}

function loadCustomStyleUi() {
  const data = ProzaEdit.Settings.getCustomStyleGuide();
  const nameEl = getEl("customStyleName");
  if (nameEl) nameEl.value = data.name || "My house style";
  renderCustomStyleRulesList();
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
    else alert("Copy failed.");
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
    }).catch((e) => (box.innerText = e.message));
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
      btn.textContent = n ? `Critical (${n})` : "Critical";
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
  currentAuditSuggestions = Array.isArray(list) ? list.slice() : [];
  updateAuditFilterChips();
  applyAuditCardFilter();
  const activeTab = TAB_IDS.find((id) => document.getElementById(id)?.classList.contains("active"));
  if (activeTab) updateWorkflowStepper(activeTab);
}

function applyAuditCardFilter() {
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
  box.innerHTML = AUDIT_EMPTY_HTML;
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
    else alert("Copy failed.");
  }
}

function buildAuditReportPlainText() {
  if (!currentAuditSuggestions.length && !lastAuditExcerpt) return "";
  const ctx = buildAuditContext();
  const header = `ProzaEdit audit report · ${new Date().toLocaleString()}\n${"=".repeat(48)}\n\n`;
  const body =
    lastFeedbackLetter ||
    (ProzaEdit.ManuscriptOverview?.buildFeedbackLetter
      ? ProzaEdit.ManuscriptOverview.buildFeedbackLetter(lastAuditExcerpt, ctx, lastAuditMeta, currentAuditSuggestions)
      : "");
  return (header + (body || "")).replace(/\r/g, "").substring(0, 480000);
}

function insertAuditReportInWord() {
  const text = buildAuditReportPlainText();
  if (!text) {
    showPeStatus("Run an audit first.", "warn");
    return;
  }
  if (!confirm("Insert a plain-text audit report at the end of this document?")) return;
  wordRun("insert-report", async (context) => {
    const end = context.document.body.getRange("End");
    end.insertText("\n\n" + text, Word.InsertLocation.before);
    await context.sync();
  })
    .then(() => showPeStatus("Report inserted at document end.", "ok"))
    .catch((e) => alert(e.message));
}

function downloadAuditReportFile(ext) {
  const text = buildAuditReportPlainText();
  if (!text) {
    showPeStatus("Run an audit first.", "warn");
    return;
  }
  try {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ProzaEdit-audit-${new Date().toISOString().slice(0, 10)}.${ext || "txt"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showPeStatus("Report downloaded — open in Word and Save As .docx or PDF if needed.", "ok");
  } catch (e) {
    alert(e.message || "Download failed.");
  }
}

async function exportAuditReportNewWordDoc() {
  const text = buildAuditReportPlainText();
  if (!text) {
    showPeStatus("Run an audit first.", "warn");
    return;
  }
  try {
    await wordRun("export-new-doc", async (context) => {
      if (!context.application?.createDocument) {
        throw new Error("UNSUPPORTED");
      }
      const newDoc = context.application.createDocument();
      newDoc.body.insertText(text, Word.InsertLocation.start);
      await context.sync();
      newDoc.open();
      await context.sync();
    });
    showPeStatus("Report opened in a new Word document. Use File → Save As (.docx).", "ok");
  } catch (e) {
    if (String(e.message).includes("UNSUPPORTED")) {
      downloadAuditReportFile("txt");
      showPeStatus("This Word host cannot create a new doc — downloaded .txt instead.", "warn");
      return;
    }
    alert(e.message);
  }
}

function exportAuditReportPdfGuide() {
  const text = buildAuditReportPlainText();
  if (!text) {
    showPeStatus("Run an audit first.", "warn");
    return;
  }
  exportAuditReportNewWordDoc().then(() => {
    alert(
      "PDF export (Microsoft Word):\n\n" +
        "• Word on the web: File → Export → Download as PDF\n" +
        "• Word desktop: File → Save As → PDF\n\n" +
        "The report should be in the new document that just opened. If not, use Download .txt and open that file in Word first."
    );
  });
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
    else alert("Copy failed. Use Ctrl+C after selecting the summary text.");
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
  html += `<p>🔴 Critical: ${criticalCount} · 🟡 Style: ${prefCount} · 🟢 Traffic: ${traffic.label}</p>`;
  if (compareLine) html += `<p>${escapeHtml(compareLine)}</p>`;
  if (refLine) html += `<p>${escapeHtml(refLine)}</p>`;
  html += `<p>${escapeHtml(buildManuscriptProfile())}</p>`;
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
  cacheAudit(label, html, suggestions, traffic, score);
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

function runAuditInternal(opts) {
  if (auditBusy || deepBusy) return Promise.resolve(false);
  if (getScopeMode() === "full" && !skipFullScanConfirm) {
    const ok = confirm(
      "Full-document scan may be slow on long manuscripts.\n\nOK = run once now\nCancel = use selection or Section + audit instead"
    );
    if (!ok) return Promise.resolve(false);
    try {
      sessionStorage.setItem("PROZAEDIT_FULL_OK", "1");
      skipFullScanConfirm = true;
    } catch (_) {}
  }
  return prepareScopeForAudit().then((ready) => {
    if (!ready) return false;
    return runAuditInternalCore(opts);
  });
}

function runAuditInternalCore(opts) {
  if (auditBusy || deepBusy) return Promise.resolve(false);
  auditBusy = true;
  lastDocStats = null;
  setModuleButtonsDisabled(true);
  const auditBtn = getEl(opts.btnId || "btnRunAudit");
  const auditBtnDefault = opts.btnDone || "Run audit";
  if (auditBtn) auditBtn.textContent = "Running…";
  const extBtn = getEl("btnAuditPrimary");
  if (extBtn) extBtn.textContent = "Running…";
  showPeStatus(opts.status || "Running local audit…");
  persistSettings(false);
  showTab("tab4");
  currentAuditSuggestions = [];
  const cardBox = getEl("cardContainer");
  const sumEl = getEl("summaryReport");
  if (cardBox) cardBox.innerHTML = "";
  if (sumEl) sumEl.innerHTML = opts.status || "Running audit…";

  return wordRun("audit", async (ctx) => {
    if (getScopeMode() === "full") {
      const paras = ctx.document.body.paragraphs;
      paras.load("items");
      await ctx.sync();
      const pn = paras.items.length;
      if (pn <= MAX_PARAS) lastDocStats = { paragraphs: pn, estWords: Math.round(pn * 42) };
      else lastDocStats = { paragraphs: pn, estWords: "(use section loop)" };
    }
    let text = await readScopeText(ctx);
    let truncated = false;
    const cap = getScopeCharLimit(getScopeMode());
    if (text.length > cap) {
      text = text.substring(0, cap);
      truncated = true;
    }
    await new Promise((r) => setTimeout(r, 0));
    const result = ProzaEdit.Audit.run(text, buildAuditContext({ extendedLocal: !!opts.extendedLocal }));
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
    finalizeAudit(result, opts.label || "Full audit (local)");
  })
    .catch((e) => {
      const sum = getEl("summaryReport");
      if (sum) sum.innerHTML = `<span style="color:var(--red)">${escapeHtml(e.message)}</span>`;
      showAuditEmptyIfNeeded();
      return false;
    })
    .finally(() => {
      auditBusy = false;
      setModuleButtonsDisabled(false);
      if (auditBtn) auditBtn.textContent = auditBtnDefault;
      const primary = getEl("btnAuditPrimary");
      if (primary) primary.textContent = "Run audit";
      showPeStatus("Audit finished (0 tokens).", "ok");
    })
    .then((v) => v !== false);
}

function renderAuditCards(list) {
  const box = document.getElementById("cardContainer");
  if (!box) return;
  box.innerHTML = "";
  list = Array.isArray(list) ? list : [];
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
  list.forEach((item, i) => {
    const id = String(item.id || `c${i}`).replace(/[^a-zA-Z0-9_-]/g, "_");
    item.id = id;
    const canApply = item.replacementText && !String(item.replacementText).startsWith("(");
    const showHouse = isStyleGuideFinding(item) && item.targetText && !String(item.targetText).startsWith("(");
    const div = document.createElement("div");
    div.className = `card ${item.type}`;
    div.id = `card_${id}`;
    div.innerHTML = `
      <span class="badge ${item.type === "confirmed" ? "badge-confirmed" : "badge-pref"}">${item.type}</span>
      <strong>${escapeHtml(item.module)}</strong>
      <p class="card-explanation">${escapeHtml(item.explanation)}</p>
      <p class="card-target">"${escapeHtml(item.targetText)}"</p>
      <p class="card-replacement">"${escapeHtml(item.replacementText)}"</p>
      <div class="card-actions">
        <div class="card-actions-primary">
          <button type="button" class="btn-go" data-a="goto" data-pe-tip="btn-card-goto" title="Select first match in Word">Go to</button>
          ${canApply ? '<button type="button" class="btn-apply" data-a="apply" data-pe-tip="btn-card-apply" title="Replace first document match">Apply fix</button>' : ""}
          <button type="button" class="btn-go" data-a="localtip">Local tip</button>
        </div>
        <div class="card-actions-secondary">
          <button type="button" class="btn-go" data-a="dict">Dict</button>
          ${showHouse ? '<button type="button" class="btn-go" data-a="house">House rule</button>' : ""}
          <button type="button" class="btn-go" data-a="mute">Mute</button>
          <button type="button" class="btn-go" data-a="chat" title="Optional Gemini">Gemini</button>
          <button type="button" class="btn-dismiss" data-a="dismiss">Dismiss</button>
        </div>
      </div>`;
    div.querySelector('[data-a="goto"]').onclick = () => goToIssue(item.targetText);
    div.querySelector('[data-a="localtip"]').onclick = () => showLocalTipForIssue(item);
    div.querySelector('[data-a="chat"]').onclick = () => sendIssueToChat(item);
    if (canApply) div.querySelector('[data-a="apply"]').onclick = () => applyFix(id, item.targetText, item.replacementText);
    div.querySelector('[data-a="dict"]').onclick = () => addDictionaryWordFromCard(item.targetText);
    if (showHouse) div.querySelector('[data-a="house"]').onclick = () => addCustomStyleFromCard(item);
    div.querySelector('[data-a="mute"]').onclick = () => muteRule(item);
    div.querySelector('[data-a="dismiss"]').onclick = () => dismissCard(item);
    box.appendChild(div);
  });
  if (ProzaEdit.TooltipRegistry?.refreshTooltips) {
    ProzaEdit.TooltipRegistry.refreshTooltips(isChecked("showHoverTips", true));
  }
}

async function muteRule(item) {
  if (!item.ruleId) return;
  await ProzaEdit.Settings.muteRule(item.ruleId);
  if (item.targetText) await ProzaEdit.Settings.dismissTarget(item.targetText);
  removeAuditCard(item.id);
  showPeStatus("Muted on this PC for future audits.", "ok");
}

async function dismissCard(item) {
  if (item.ruleId) await ProzaEdit.Settings.muteRule(item.ruleId);
  if (item.targetText) await ProzaEdit.Settings.dismissTarget(item.targetText);
  removeAuditCard(item.id);
}

function removeAuditCard(id) {
  currentAuditSuggestions = currentAuditSuggestions.filter((x) => x.id !== id);
  updateAuditFilterChips();
  document.getElementById(`card_${id}`)?.remove();
  applyAuditCardFilter();
}

function clearAuditReport() {
  currentAuditSuggestions = [];
  lastAuditExcerpt = "";
  lastAuditMeta = {};
  lastFeedbackLetter = "";
  auditCardFilter = "all";
  updateAuditFilterChips();
  const box = getEl("cardContainer");
  const sum = getEl("summaryReport");
  if (box) box.innerHTML = "";
  if (sum) sum.innerHTML = "Audit cleared. Run audit again for a fresh pass.";
  getEl("trafficBar")?.classList.add("hidden");
  getEl("miniScores")?.classList.add("hidden");
  ProzaEdit.Settings.setAsync(ProzaEdit.Settings.KEYS.LAST_AUDIT, "");
  showAuditEmptyIfNeeded();
  showPeStatus("Audit report cleared.", "ok");
}

function goToIssue(target) {
  if (!target || String(target).startsWith("(")) {
    alert("Cannot locate this item.");
    return;
  }
  wordRun("goto", async (ctx) => {
    await ProzaEdit.WordSafeNavigator.selectFirstInBody(ctx, target);
  }).catch((e) => alert(e.message));
}

function applyFix(cardId, target, replacement) {
  if (!target || String(replacement || "").startsWith("(")) {
    showPeStatus("This card has no automatic replacement.", "warn");
    return;
  }
  applyDocumentEdit(target, replacement, "Audit fix", { forceDocument: true }).then((ok) => {
    if (!ok) return;
    removeAuditCard(cardId);
    scheduleManuscriptIndexBuild(true);
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
    if (cmp > 0) {
      setStatus(
        `Update available: manifest ${remote} (you have UI ${PROZAEDIT_BUILD_VERSION}). Close this pane and reopen ProzaEdit; re-upload manifest if Word asks.`,
        true
      );
      if (manual && confirm("Reload the task pane now to pull the latest UI from GitHub?")) {
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
    alert("Enter a question for Local Coach.");
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
  if (auditBusy || deepBusy) return;
  try {
    await selectNextChapter();
    await new Promise((r) => setTimeout(r, 150));
    runPrimaryAudit();
  } catch (e) {
    alert(e.message);
  }
}

function cancelBatchAudit() {
  batchCancel = true;
  showPeStatus("Batch cancelled.", "warn");
}

async function runBatchSectionAudit() {
  if (auditBusy || deepBusy) return;
  const n = Math.min(8, Math.max(1, parseInt(getEl("batchSectionCount")?.value, 10) || 3));
  batchCancel = false;
  for (let i = 0; i < n; i++) {
    if (batchCancel) break;
    try {
      await selectNextSection();
      await new Promise((r) => setTimeout(r, 200));
      const ok = await runAuditInternal({
        extendedLocal: isAuditExtended(),
        label: `Batch audit ${i + 1}/${n}`,
        status: `Batch ${i + 1}/${n}…`,
      });
      if (!ok) break;
    } catch (e) {
      alert(e.message);
      break;
    }
  }
  if (!batchCancel) showPeStatus("Batch complete.", "ok");
}

async function scanChapterHeatmap() {
  if (auditBusy || deepBusy || heatmapBusy) return;
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
    alert(e.message);
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
    alert(e.message);
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
      alert("Wrapped to first chapter.");
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
  }).catch((e) => alert(e.message));
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
      alert("Wrapped to document start.");
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
  if (auditBusy || deepBusy) return;
  try {
    await selectNextSection();
    await new Promise((r) => setTimeout(r, 100));
    runPrimaryAudit();
  } catch (e) {
    alert(e.message);
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
  if (auditBusy || deepBusy) return;
  const key = getApiKey();
  if (!key) {
    alert("Add API key in AI Chat tab.");
    showTab("tab5");
    return;
  }
  if (
    !confirm(
      "Deep Audit uses 1 Gemini API call.\n\nTry Extended local audit (0 tokens) or Copy for Copilot first.\n\nContinue with Gemini?"
    )
  )
    return;
  deepBusy = true;
  setModuleButtonsDisabled(true);
  showTab("tab4");
  currentAuditSuggestions = [];
  const sumD = getEl("summaryReport");
  const cardD = getEl("cardContainer");
  if (sumD) sumD.innerHTML = "Deep audit…";
  if (cardD) cardD.innerHTML = "";

  let excerpt = "";
  try {
    excerpt = await wordRun("deep-read", async (ctx) => (await readScopeText(ctx)).substring(0, MAX_DEEP));
  } catch (e) {
    document.getElementById("summaryReport").innerHTML = escapeHtml(e.message);
    deepBusy = false;
    setModuleButtonsDisabled(false);
    return;
  }

  const prompt =
    `${GUARDRAILS}\n${buildManuscriptProfile()}\nReturn ONLY JSON array (max 6):\n[{"module":"","type":"confirmed|preference","explanation":"","targetText":"","replacementText":"","ruleId":""}]\n\nEXCERPT:\n${excerpt}`;

  try {
    const reply = await ProzaEdit.Gemini.generate(key, prompt, { maxOutputTokens: 1200, temperature: 0.3 });
    let ai = [];
    try {
      const start = reply.indexOf("[");
      const end = reply.lastIndexOf("]");
      if (start < 0 || end <= start) throw new Error("Bad AI JSON—use local audit.");
      const t = reply.substring(start, end + 1);
      ai = JSON.parse(t)
        .slice(0, 8)
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
  } catch (e) {
    const msg = e.name === "AbortError" ? "Gemini request timed out." : e.message;
    const sum = getEl("summaryReport");
    if (sum) sum.innerHTML = `<span style="color:var(--red)">${escapeHtml(msg)}</span>`;
  } finally {
    deepBusy = false;
    setModuleButtonsDisabled(false);
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

async function sendChatMessage() {
  if (chatBusy) return;
  const key = getApiKey();
  const prompt = getEl("chatInput")?.value.trim() || "";
  if (!prompt) {
    alert("Enter a message.");
    return;
  }
  if (!key) {
    if (confirm("No Gemini API key. Use free Local Coach instead?")) sendLocalCoachMessage();
    return;
  }
  if (!confirm("Send via Gemini (uses API tokens)?")) return;
  if (ProzaEdit.Gemini.estimateTokens(prompt) > 2000 && !confirm("Large prompt—continue?")) return;

  const log = getEl("chatLog");
  if (!log) return;

  chatBusy = true;
  const sendBtn = document.querySelector("#tab5 .btn-main");
  if (sendBtn) sendBtn.disabled = true;
  log.innerHTML += `<div class="chat-msg chat-user">${escapeHtml(prompt)}</div>`;
  getEl("chatInput").value = "";

  try {
    const ctx = await wordRun("chat-ctx", readChatContext);
    const text = `${GUARDRAILS}\n${buildManuscriptProfile()}\n\nContext:\n${ctx}\n\nQuestion:\n${prompt}`;
    const reply = await ProzaEdit.Gemini.generate(key, text, { maxOutputTokens: 1024, temperature: 0.5 });
    log.innerHTML += `<div class="chat-msg chat-ai">${escapeHtml(reply)}</div>`;
  } catch (e) {
    const msg = e.name === "AbortError" ? "Gemini request timed out." : e.message;
    log.innerHTML += `<div class="chat-msg chat-ai" style="color:var(--red)">${escapeHtml(msg)}</div>`;
  } finally {
    trimChatLog(log);
    log.scrollTop = log.scrollHeight;
    chatBusy = false;
    if (sendBtn) sendBtn.disabled = false;
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
    alert("Local paraphrase failed to load. Reload the task pane.");
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
    if (preview) preview.innerText = e.message;
    lastRewritePreview = "";
    lastRewriteOriginal = "";
  } finally {
    rewriteBusy = false;
  }
}

async function runSmartRewrite() {
  if (rewriteBusy) return;
  const key = getApiKey();
  if (!key) {
    alert("API key required.");
    showTab("tab5");
    return;
  }
  if (!getApiKey()) {
    alert("Add a Gemini API key under Optional Gemini, or use Local paraphrase (free).");
    return;
  }
  if (!confirm("Rewrite via Gemini uses API tokens. Continue?")) return;
  rewriteBusy = true;
  const mode = document.getElementById("rewriteMode").value;
  const preview = document.getElementById("rewritePreview");
  preview.innerText = "Rewriting…";

  try {
    const excerpt = await wordRun("rewrite-read", async (ctx) => {
      const sel = ctx.document.getSelection();
      sel.load("text");
      await ctx.sync();
      const t = (sel.text || "").trim();
      if (!t) throw new Error("Highlight text to rewrite.");
      if (t.length > MAX_CHAT) throw new Error("Selection too long—use a smaller passage.");
      lastRewriteOriginal = t;
      return t;
    });
    document.getElementById("rewriteTokenEstimate").textContent = `Est. tokens: ~${ProzaEdit.Gemini.estimateTokens(excerpt) + 200}`;
    const prompt = ProzaEdit.Gemini.buildRewritePrompt(mode, excerpt, buildManuscriptProfile(), GUARDRAILS);
    lastRewritePreview = await ProzaEdit.Gemini.generate(key, prompt, { maxOutputTokens: 1024, temperature: 0.55 });
    preview.innerText = lastRewritePreview;
  } catch (e) {
    const msg = e.name === "AbortError" ? "Gemini request timed out." : e.message;
    preview.innerText = msg;
    lastRewritePreview = "";
  } finally {
    rewriteBusy = false;
  }
}

function applyRewritePreview() {
  if (!lastRewritePreview) {
    alert("Run rewrite first.");
    return;
  }
  if (!lastRewriteOriginal) {
    alert("Re-run rewrite on your selection, then apply.");
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
