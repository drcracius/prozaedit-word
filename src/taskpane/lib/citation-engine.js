/* Citation pattern assist v1 — APA / CMOS-ish / Bluebook-lite (Phase 5). Not compliance certification. */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  const APA_PAREN =
    /\(([A-Z][A-Za-z''\-\s]+(?:,\s*(?:[A-Z][A-Za-z''\-\s]+|&\s*[A-Z][A-Za-z''\-\s]+|et\s*al\.?))*),\s*(\d{4}[a-z]?)(?:,\s*p{1,2}\.\s*(\d+(?:–|-\d+)?))?\)/g;

  const APA_PAREN_NO_YEAR = /\(([A-Z][A-Za-z''\-\s]+(?:,\s*(?:and|&)\s*[A-Z][A-Za-z''\-\s]+)?)\)(?!\s*,?\s*\d{4})/g;

  const CMOS_PAREN = /\(([A-Z][A-Za-z''\-]+(?:\s+et\s+al\.)?),?\s+(\d{4})(?:,\s*(?:pp?\.\s*)?(\d+(?:–|-\d+)?))?\)/g;

  const REPORTER =
    /\b(\d{1,4})\s+([A-Z][A-Za-z.\d]{1,12}(?:\s+[A-Z][A-Za-z.]{1,8}){0,2})\s+(\d{1,5})(?:,\s*(\d{1,4}))?\s*(?:\(([^)]{2,40})\s+(\d{4})\)|\((\d{4})\))?/g;

  const ID_IBID = /\b(id\.|ibid\.)\b/gi;

  const REF_HEADING = /^(references|bibliography|works cited|works consulted|sources)\s*$/i;

  function normalizeCtx(ctx) {
    ctx = ctx || {};
    const style = String(ctx.citationStyle || "auto").toUpperCase();
    const manuscriptType = String(ctx.manuscriptType || "");
    let citationStyle = style;
    if (style === "AUTO") {
      if (manuscriptType.includes("Business")) citationStyle = "BLUEBOOK";
      else if (manuscriptType.includes("Technical")) citationStyle = "CHICAGO";
      else citationStyle = "APA";
    }
    return {
      citationStyle,
      manuscriptType,
      citationReconcileBiblio: ctx.citationReconcileBiblio !== false,
      mutedRules: ctx.mutedRules || [],
      reportDensity: ctx.reportDensity || "balanced",
    };
  }

  function isMuted(ruleId, mutedSet) {
    return mutedSet.has(ruleId);
  }

  function pushFinding(findings, item, muted) {
    if (!item.targetText || String(item.targetText).length > 255) return;
    if (!item.ruleId) {
      item.ruleId = `cite:auto:${String(item.module || "cite").slice(0, 20)}:${String(item.targetText).slice(0, 36)}`.toLowerCase();
    }
    if (isMuted(item.ruleId, muted)) return;
    if (root.Settings?.isTargetDismissedGlobally?.(item.targetText)) return;
    findings.push(item);
  }

  function primaryAuthor(rawAuthors) {
    const s = String(rawAuthors || "")
      .replace(/\bet\s*al\.?/gi, "")
      .split(/[,&]/)[0]
      .trim();
    const m = /^([A-Z][A-Za-z''\-]+)/.exec(s);
    return m ? m[1] : s.split(/\s+/)[0] || "";
  }

  function auditApa(text, push, inText) {
    APA_PAREN.lastIndex = 0;
    let match;
    while ((match = APA_PAREN.exec(text)) !== null) {
      const authors = match[1];
      inText.push({
        raw: match[0],
        authors,
        year: match[2],
        page: match[3] || null,
        index: match.index,
        style: "APA",
      });
      if (/\band\b/i.test(authors) && !/\bet\s*al/i.test(authors)) {
        push({
          ruleId: `cite:apa:ampersand:${match.index}`,
          module: "Citation scan (APA-ish)",
          type: "preference",
          explanation:
            "APA-style parentheticals usually use & between author names inside parentheses (pattern assist only — not certification).",
          targetText: match[0].substring(0, 120),
          replacementText: match[0].replace(/\band\b/i, "&"),
        });
      }
      if (/\bet\s+al\b/i.test(authors) && !/\bet\s+al\./i.test(authors)) {
        push({
          ruleId: `cite:apa:etal_period:${match.index}`,
          module: "Citation scan (APA-ish)",
          type: "preference",
          explanation: "Abbreviation is usually “et al.” with a period after al.",
          targetText: match[0].substring(0, 80),
          replacementText: "(Author et al., year)",
        });
      }
    }

    APA_PAREN_NO_YEAR.lastIndex = 0;
    while ((match = APA_PAREN_NO_YEAR.exec(text)) !== null) {
      const snippet = match[0];
      if (/\d{4}/.test(text.substring(match.index, match.index + 40))) continue;
      if (/^(?:e\.g|i\.e|cf|see|cf\.)/i.test(text.substring(Math.max(0, match.index - 6), match.index))) continue;
      push({
        ruleId: `cite:apa:missing_year:${match.index}`,
        module: "Citation scan (APA-ish)",
        type: "preference",
        explanation: "Parenthetical looks like an author list but no publication year detected immediately inside.",
        targetText: snippet.substring(0, 80),
        replacementText: "(Author, YYYY)",
      });
    }

    const narrativeYearGap = /\b([A-Z][A-Za-z''\-]+(?:\s+(?:&|and)\s+[A-Z][A-Za-z''\-]+)?)\s+(?!et\s+al\.)(?:found|reported|argued|showed|noted|claimed|wrote)\b/gi;
    while ((match = narrativeYearGap.exec(text)) !== null) {
      const after = text.substring(match.index, match.index + 120);
      if (/\(\d{4}[a-z]?\)/.test(after) || /\(\d{4}[a-z]?/.test(after)) continue;
      push({
        ruleId: `cite:apa:narrative_year:${match.index}`,
        module: "Citation scan (APA-ish)",
        type: "preference",
        explanation: "Narrative author attribution nearby — confirm a year appears in the same sentence (heuristic).",
        targetText: match[0].substring(0, 80),
        replacementText: "Author (YYYY)",
      });
    }
  }

  function auditChicago(text, push, inText) {
    CMOS_PAREN.lastIndex = 0;
    let match;
    while ((match = CMOS_PAREN.exec(text)) !== null) {
      inText.push({
        raw: match[0],
        authors: match[1],
        year: match[2],
        page: match[3] || null,
        index: match.index,
        style: "CHICAGO",
      });
      const inner = match[0];
      if (/,\s*pp\./i.test(inner)) {
        push({
          ruleId: `cite:cmos:pp_in_paren:${match.index}`,
          module: "Citation scan (CMOS-ish)",
          type: "preference",
          explanation: "Author–date parentheticals often use a comma and page number without “pp.” (CMOS-style heuristic).",
          targetText: inner.substring(0, 100),
          replacementText: inner.replace(/pp\.\s*/i, ""),
        });
      }
    }
  }

  function auditBluebook(text, push, inText) {
    REPORTER.lastIndex = 0;
    let match;
    let lastFullCiteAt = -1;
    while ((match = REPORTER.exec(text)) !== null) {
      const year = match[6] || match[7];
      if (!year) continue;
      inText.push({
        raw: match[0],
        volume: match[1],
        reporter: match[2],
        page: match[3],
        year,
        index: match.index,
        style: "BLUEBOOK",
      });
      lastFullCiteAt = match.index;
    }

    ID_IBID.lastIndex = 0;
    const idTokens = [];
    while ((match = ID_IBID.exec(text)) !== null) {
      idTokens.push({ raw: match[0], index: match.index });
    }

    idTokens.forEach((tok) => {
      const before = text.substring(Math.max(0, tok.index - 80), tok.index);
      if (/^id\./i.test(tok.raw) && /(?:^|[.!?]\s+)id\./i.test(before + tok.raw)) {
        push({
          ruleId: `cite:bb:id_cap:${tok.index}`,
          module: "Citation scan (Bluebook-lite)",
          type: "preference",
          explanation: "“Id.” is often capitalized when it begins a citation sentence (Bluebook-style pattern).",
          targetText: tok.raw,
          replacementText: "Id.",
        });
      }
      if (/^ibid\./i.test(tok.raw) && lastFullCiteAt < 0 && idTokens.length === 1) {
        push({
          ruleId: `cite:bb:ibid_no_prior:${tok.index}`,
          module: "Citation scan (Bluebook-lite)",
          type: "preference",
          explanation: "“Ibid.” usually follows an earlier citation in the same passage — none detected in this scope.",
          targetText: tok.raw,
          replacementText: "(prior full citation)",
        });
      }
    });

    for (let i = 1; i < idTokens.length; i++) {
      const prev = idTokens[i - 1];
      const cur = idTokens[i];
      if (/^id\./i.test(cur.raw) && /^id\./i.test(prev.raw) && cur.index - prev.index < 120) {
        push({
          ruleId: `cite:bb:id_chain:${cur.index}`,
          module: "Citation scan (Bluebook-lite)",
          type: "preference",
          explanation: "Back-to-back “Id.” signals — verify each refers to the immediately preceding authority.",
          targetText: cur.raw,
          replacementText: "Id. at __",
        });
        break;
      }
    }
  }

  function extractBibliographyEntries(paragraphs) {
    const entries = [];
    let inRefs = false;
    let blankRun = 0;
    (paragraphs || []).forEach((p) => {
      const trimmed = String(p.text || "").trim();
      if (!trimmed) {
        if (inRefs) blankRun += 1;
        return;
      }
      if (REF_HEADING.test(trimmed.replace(/\.$/, ""))) {
        inRefs = true;
        blankRun = 0;
        return;
      }
      if (!inRefs) return;
      if (blankRun >= 2) return;
      blankRun = 0;
      if (trimmed.length < 12) return;
      entries.push({ text: trimmed, paraIndex: p.index });
    });
    return entries;
  }

  function reconcileBibliography(inText, bibEntries, push) {
    if (!bibEntries.length || !inText.length) {
      return { attempted: true, matched: 0, skipped: !bibEntries.length ? "no_bibliography_section" : "no_in_text" };
    }
    const bibAuthors = new Set();
    bibEntries.forEach((b) => {
      const t = b.text;
      const apaLead = /^([A-Z][A-Za-z''\-]+)/.exec(t);
      if (apaLead) bibAuthors.add(apaLead[1].toLowerCase());
      const legalParty = /\b([A-Z][A-Za-z''\-]+)\s+v\.\s+/i.exec(t);
      if (legalParty) bibAuthors.add(legalParty[1].toLowerCase());
    });

    const cited = new Map();
    inText.forEach((c) => {
      const key = primaryAuthor(c.authors || c.author || "").toLowerCase();
      if (key && key.length > 1) cited.set(key, c);
    });

    let missingCount = 0;
    cited.forEach((cite, authorKey) => {
      if (bibAuthors.has(authorKey)) return;
      missingCount += 1;
      push({
        ruleId: `cite:bib:missing:${authorKey}`,
        module: "Citation scan (bibliography)",
        type: "preference",
        explanation: `In-text cite for “${authorKey}” has no obvious matching entry in References/Bibliography section (lightweight match).`,
        targetText: (cite.raw || authorKey).substring(0, 100),
        replacementText: "(add bibliography entry)",
        paraIndex: cite.paraIndex,
      });
    });

    return { attempted: true, matched: cited.size - missingCount, bibCount: bibEntries.length };
  }

  function runStylePack(style, text, push, inText) {
    if (style === "BLUEBOOK") {
      auditBluebook(text, push, inText);
      auditApa(text, push, inText);
    } else if (style === "CHICAGO") {
      auditChicago(text, push, inText);
      auditApa(text, push, inText);
    } else {
      auditApa(text, push, inText);
      auditChicago(text, push, inText);
    }
  }

  root.CitationEngine = {
    MAX_FINDING_CARDS: 28,
    /** TODO v1.1: footnote/endnote API scan; richer Bluebook short-form chains. */
    BIBLIOGRAPHY_TODO: "v1.1: hanging-indent parsing, DOI/URL validation, footnote cross-refs.",

    isEligibleManuscript(manuscriptType) {
      const t = String(manuscriptType || "");
      return t.includes("Academic") || t.includes("Business") || t.includes("Technical");
    },

    defaultStyle(manuscriptType) {
      if (String(manuscriptType || "").includes("Business")) return "BLUEBOOK";
      if (String(manuscriptType || "").includes("Technical")) return "CHICAGO";
      return "APA";
    },

    /**
     * @param {Array<{index:number,text:string}>} paragraphs
     * @param {object} ctx — citationStyle, citationReconcileBiblio, manuscriptType, mutedRules, reportDensity
     */
    analyze(paragraphs, ctx) {
      ctx = normalizeCtx(ctx);
      paragraphs = Array.isArray(paragraphs) ? paragraphs : [];
      const muted = new Set(ctx.mutedRules || []);
      const findings = [];
      const push = (item) => pushFinding(findings, item, muted);
      const inText = [];

      const text = paragraphs.map((p) => String(p.text || "")).join("\n\n");
      if (!text.trim()) {
        return { findings: [], inTextCitations: [], stats: { chars: 0 }, bibliography: { skipped: "empty_scope" } };
      }

      runStylePack(ctx.citationStyle, text, push, inText);

      inText.forEach((c) => {
        const para = paragraphs.find((p) => {
          const t = String(p.text || "");
          return t.includes(c.raw.substring(0, Math.min(24, c.raw.length)));
        });
        if (para) c.paraIndex = para.index;
      });

      let bibliography = { skipped: "disabled" };
      if (ctx.citationReconcileBiblio) {
        const bibEntries = extractBibliographyEntries(paragraphs);
        bibliography = reconcileBibliography(inText, bibEntries, push);
        bibliography.entryCount = bibEntries.length;
      }

      const maxCards = Math.min(
        root.ReportDensity?.maxCards?.(ctx.reportDensity) || 60,
        this.MAX_FINDING_CARDS
      );
      const deduped = [];
      const seen = new Set();
      findings.forEach((f, i) => {
        const key = `${f.ruleId}|${String(f.targetText).slice(0, 40)}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push({ ...f, id: f.id || `cite_${i}` });
      });

      return {
        findings: deduped.slice(0, maxCards),
        inTextCitations: inText.slice(0, 200),
        stats: {
          chars: text.length,
          inTextCount: inText.length,
          style: ctx.citationStyle,
        },
        bibliography,
      };
    },

    mergeFindings(existing, citeFindings) {
      const base = Array.isArray(existing) ? existing.slice() : [];
      const seen = new Set(base.map((s) => `${s.ruleId}|${String(s.targetText).slice(0, 40)}`));
      (citeFindings || []).forEach((f, i) => {
        const key = `${f.ruleId}|${String(f.targetText).slice(0, 40)}`;
        if (seen.has(key)) return;
        seen.add(key);
        base.push({ ...f, id: f.id || `cite_m_${i}_${Date.now()}` });
      });
      return base;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
