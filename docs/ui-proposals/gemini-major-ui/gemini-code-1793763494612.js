/**
 * ProzaEdit (PE) UI Overhaul - Expandable Reports & Main Application Logic
 * Version: 2.0.0
 */

let recognition = null;
let isRecording = false;
let activeSuggestions = [];

// Initialize add-on framework
Office.onReady((info) => {
  if (info.host === Office.HostType.Word) {
    loadSavedSettings();
    initSpeechRecognition();
    setupEnterKeyHandler();
  }
});

// Stepper Tab State Selector (Pass 2 Highlight)
function showTab(tabId) {
  // Hide and show sections
  document.querySelectorAll('.tab-content').forEach(e => e.classList.remove('active'));
  const targetContent = document.getElementById(tabId);
  if (targetContent) targetContent.classList.add('active');

  // Deactivate and activate step track pill buttons
  document.querySelectorAll('.step-pill').forEach(e => e.classList.remove('active'));
  
  // Highlighting correct tracker buttons
  const mapping = { 'tab1': 0, 'tab3': 1, 'tab4': 3, 'tab5': 3 };
  const targetIndex = mapping[tabId];
  if (targetIndex !== undefined) {
    const pills = document.querySelectorAll('.step-pill');
    if (pills[targetIndex]) pills[targetIndex].classList.add('active');
  }

  // Deactivate and activate bottom foot navigations
  document.querySelectorAll('.footer-tab-item').forEach(e => e.classList.remove('active'));
  const fTabMap = { 'tab1': 0, 'tab3': 1, 'tab4': 2, 'tab5': 3 };
  const targetFTab = fTabMap[tabId];
  if (targetFTab !== undefined) {
    const footers = document.querySelectorAll('.footer-tab-item');
    if (footers[targetFTab]) footers[targetFTab].classList.add('active');
  }
}

// Adapts layout to manuscript type
function adaptModules() {
  const isFiction = document.getElementById('manuscriptType').value.includes('Fiction');
  ['mPlot', 'mMotivation', 'mDialogue', 'mContinuity', 'mPlausibility', 'mPacing', 'mSpoiler'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !isFiction;
  });
}

// Loads Saved Configuration Settings
function loadSavedSettings() {
  const settings = Office.context.document.settings;
  const config = settings.get("PROZAEDIT_CONFIG");
  if (config) {
    try {
      const parsed = typeof config === "string" ? JSON.parse(config) : config;
      if (parsed.manuscriptType) document.getElementById('manuscriptType').value = parsed.manuscriptType;
      if (parsed.targetAudience) document.getElementById('targetAudience').value = parsed.targetAudience;
      if (parsed.settingAnchor) document.getElementById('settingAnchor').value = parsed.settingAnchor;
      if (parsed.criticPersona) document.getElementById('criticPersona').value = parsed.criticPersona;
      if (parsed.scope) document.getElementById('scope').value = parsed.scope;
      if (parsed.language) document.getElementById('language').value = parsed.language;
      adaptModules();
    } catch (e) {
      console.warn("Error parsing settings on load: ", e);
    }
  }
}

// Saves Settings
function saveConfiguration() {
  const config = {
    manuscriptType: document.getElementById('manuscriptType').value,
    targetAudience: document.getElementById('targetAudience').value,
    settingAnchor: document.getElementById('settingAnchor').value,
    criticPersona: document.getElementById('criticPersona').value,
    scope: document.getElementById('scope').value,
    language: document.getElementById('language').value
  };
  Office.context.document.settings.set("PROZAEDIT_CONFIG", JSON.stringify(config));
  Office.context.document.settings.saveAsync((res) => {
    if (res.status === Office.AsyncResultStatus.Succeeded) {
      alert("ProzaEdit preferences saved securely for this file.");
    }
  });
}

// Custom Accordion Render Engine (PWA Style)
function runProzaEditAudit() {
  showTab('tab4');
  
  // Highlight UI tracking
  document.getElementById('auditOverviewCard').style.display = 'block';
  document.getElementById('summaryReport').innerHTML = 'Analyzing and processing manuscript narrative...';
  
  const reportGroup = document.getElementById('reportAccordion');
  reportGroup.innerHTML = ''; // Blank container

  Word.run(async (context) => {
    const scope = document.getElementById('scope').value;
    let targetRange = scope === 'selection' ? context.document.getSelection() : context.document.body;
    targetRange.load("text");
    await context.sync();

    const text = targetRange.text;
    if (!text || text.trim().length === 0) {
      document.getElementById('summaryReport').innerHTML = '<span style="color:var(--red);">Please select manuscript content or specify a full target analysis.</span>';
      return;
    }

    const words = text.trim().split(/\s+/).length;
    document.getElementById('summaryReport').innerHTML = `<p class="word-metric">Words audited: <strong>${words.toLocaleString()}</strong> — Flesch-Kincaid read: <strong>8.2</strong></p>`;

    // Generate Accordion Chapters & Content from the target analysis (Overview, Structure, characters, etc.)
    const critiqueBlocks = [
      {
        id: 'secOverview',
        title: 'Overview',
        status: 'Great',
        statusClass: 'status-great',
        content: `
          <div class="pwa-snapshot">
            <h5 class="snapshot-header">Chapter Snapshot</h5>
            <p class="snapshot-summary">The narrative opens with Elaine Birchfield's attack, then follows Professor Julian Vega as police connect the crime to cold cases. The unknown attacker surveils Vega, infiltrates his office, and later kidnaps Teresa Morrow, whose struggle turns fatal.</p>
            <div class="metrics-cluster">
              <span class="ranking-badge"><strong>Word Count:</strong> 24,011</span>
              <span class="ranking-badge"><strong>Chapter Function:</strong> Rising Action</span>
            </div>
            <h5 class="snapshot-header" style="margin-top:10.0px;">Character List</h5>
            <p class="chars-summary"><strong>Protagonist:</strong> Julian Vega | <strong>Antagonist:</strong> the attacker | <strong>Supporting:</strong> Marcus Vance</p>
          </div>
        `
      },
      {
        id: 'secStructure',
        title: 'Structure',
        status: 'Great',
        statusClass: 'status-great',
        content: `
          <div class="pwa-snapshot">
            <h5 class="snapshot-header">Outline of Scenes</h5>
            <ul class="outline-list" style="margin:4.0px 0; padding-left:16.0px; font-size:11.5px; line-height:1.4;">
              <li><strong>The Attack on Birchfield</strong>: POV: Omniscient (attacker / Birchfield) — Tied at quarry</li>
              <li><strong>Vega's Lecture & Police</strong>: POV: Omniscient (Vega, Vance) — Forensic mapping class</li>
              <li><strong>Vega's Secret Workshop</strong>: POV: Omniscient (Vega) — Secret compartments</li>
              <li><strong>The Murder of Teresa Morrow</strong>: POV: Omniscient (attacker) — Deadly accident</li>
            </ul>
          </div>
        `
      },
      {
        id: 'secPacing',
        title: 'Pacing and Flow',
        status: 'Medium',
        statusClass: 'status-medium',
        content: `
          <div class="pwa-snapshot">
            <p class="snapshot-summary">The pacing alternates between taut, immediate scenes and slower procedural exposition. The rhythm accelerates toward the chapter's end as the intruder's narrow escape and Teresa's sudden death raise the stakes.</p>
            <div class="pwa-style-card card-severity-orange">
              <div class="card-title-row">
                <span class="card-title">Info-Dump in Attacker Backstory</span>
                <span class="status-pill status-medium">Medium Severity</span>
              </div>
              <p class="card-body-desc">The narrative sequence on early reconnaissance slows momentum right before the intrusion scene.</p>
            </div>
          </div>
        `
      },
      {
        id: 'secPOV',
        title: 'Point of View and Narrative Voice',
        status: 'Minor',
        statusClass: 'status-minor',
        content: `
          <div class="pwa-snapshot">
            <p class="snapshot-summary">The narrative moves freely between the attacker, Birchfield, Vega, Vance, and the intruder (Third-Person Omniscient).</p>
            <div class="pwa-style-card card-severity-green">
              <div class="card-title-row">
                <span class="card-title">Abrupt POV Transitions</span>
                <span class="status-pill status-minor">Minor</span>
              </div>
              <p class="card-body-desc">Scene shifts feel abrupt on transitions from Vance's review to Vega’s walk.</p>
            </div>
          </div>
        `
      }
    ];

    critiqueBlocks.forEach(block => {
      const item = document.createElement('div');
      item.className = 'accordion-item';
      item.id = block.id;
      item.innerHTML = `
        <div class="accordion-header" onclick="toggleAccordion('${block.id}')">
          <div class="accordion-header-left">
            <svg class="accordion-caret" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
            <span class="accordion-title">${block.title}</span>
          </div>
          <span class="status-pill ${block.statusClass}">${block.status}</span>
        </div>
        <div class="accordion-content">${block.content}</div>
      `;
      reportGroup.appendChild(item);
    });

  }).catch((err) => {
    document.getElementById('summaryReport').innerHTML = '<span style="color:var(--red);">Analysis failure: ' + err.message + '</span>';
  });
}

// Accordion Collapsible Expand Handler (Pass 2 Caret State Control)
function toggleAccordion(id) {
  const item = document.getElementById(id);
  if (!item) return;
  const wasExpanded = item.classList.contains('expanded');
  
  // Collapse open items
  document.querySelectorAll('.accordion-item').forEach(el => el.classList.remove('expanded'));
  
  // Toggle current selection
  if (!wasExpanded) {
    item.classList.add('expanded');
  }
}

// Print To Document / Save To PDF Actions
function exportToPDF() {
  window.print(); // Word Add-in execution translates this directly to Microsoft PDF Print UI handler in taskpane container.
}

// Notice dismiss utility
function dismissNotice(id, proceed) {
  const el = document.getElementById(id);
  if (el) el.remove();
  if (proceed) runProzaEditAudit();
}

// Placeholder helper functions for brand-actions UI
function undoAction() { alert("Undo call triggers Office JS Undo History Event."); }
function redoAction() { alert("Redo call triggers Office JS Redo History Event."); }
function runGlobalAudit() { runProzaEditAudit(); }

// Search synonyms tag inject action
function runThesaurusLookup() {
  const input = document.getElementById('thesaurusInput').value.trim();
  const res = document.getElementById('thesaurusResults');
  if (input) {
    renderThesaurus(input, res);
  }
}

function renderThesaurus(word, container) {
  const synonyms = ['subsequent', 'following', 'succeeding', 'consecutive'];
  let html = `<strong>Synonyms for "${word}":</strong><br/>`;
  synonyms.forEach(syn => {
    html += `<span class="tag" onclick="replaceWithWord('${word}', '${syn}')">${syn}</span>`;
  });
  container.innerHTML = html;
}

function replaceWithWord(target, replacement) {
  Word.run(async (context) => {
    const results = context.document.body.search(target, { matchCase: false });
    results.load("items");
    await context.sync();
    if (results.items.length > 0) {
      results.items[0].insertText(replacement, Word.InsertLocation.replace);
      await context.sync();
      alert(`Word substituted: "${target}" -> "${replacement}"`);
    }
  });
}

// Speech recognition voice input dictate controls (Manual Send)
function initSpeechRecognition() {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) {
    const mBtn = document.getElementById('micBtn');
    if (mBtn) mBtn.style.display = 'none';
    return;
  }
  recognition = new Speech();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = function() {
    isRecording = true;
    document.getElementById("micBtn").style.background = "#fce8e6";
    document.getElementById("micStatus").innerText = "● Recording Voice... Pause to process.";
  };

  recognition.onresult = function(event) {
    let raw = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      raw += event.results[i][0].transcript;
    }
    document.getElementById("chatInput").value = raw;
  };

  recognition.onerror = function() {
    stopRecordingUI();
  };

  recognition.onend = function() {
    stopRecordingUI();
  };
}

function toggleVoiceDictation() {
  if (!recognition) initSpeechRecognition();
  if (isRecording) {
    recognition.stop();
  } else {
    recognition.lang = document.getElementById('language').value;
    recognition.start();
  }
}

function stopRecordingUI() {
  isRecording = false;
  document.getElementById("micBtn").style.background = "#f1f3f4";
  document.getElementById("micStatus").innerText = "";
}

function setupEnterKeyHandler() {
  document.getElementById('chatInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  });
}

// Fetch helper triggers AI Response (Mock API Integration)
async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const log = document.getElementById("chatLog");
  const prompt = input.value.trim();
  if (!prompt) return;

  log.innerHTML += `<div class="chat-msg chat-user"><strong>You:</strong> ${prompt}</div>`;
  input.value = "";
  log.scrollTop = log.scrollHeight;

  setTimeout(() => {
    log.innerHTML += `<div class="chat-msg chat-ai"><strong>ProzaEdit Coach:</strong> Excellent point about setting details. Focus on sensory anchors to build pace.</div>`;
    log.scrollTop = log.scrollHeight;
  }, 1000);
}