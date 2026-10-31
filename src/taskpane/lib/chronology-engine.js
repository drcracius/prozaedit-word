/* Narrative chronology v1 — paragraph walk, temporal anchors, audit-shaped findings (Phase 4). */
(function (global) {
  const root = (global.ProzaEdit = global.ProzaEdit || {});

  const TEMPORAL_REGEX = [
    {
      type: "RELATIVE_FORWARD",
      re: /\b(?:the\s+next|the\s+following)\s+(?:day|morning|afternoon|evening|night|week|month|year)\b/gi,
    },
    {
      type: "RELATIVE_BACK",
      re: /\b(?:hours?|days?|weeks?|months?|years?)\s+(?:later|after|earlier|before|ago)\b/gi,
    },
    {
      type: "FLASHBACK",
      re: /\b(?:two|three|four|five|six|seven|several|few)\s+(?:hours|days|weeks|months|years)\s+(?:earlier|prior|before|ago)\b/gi,
    },
    {
      type: "CLOCK_ANCHOR",
      re: /\b(?:at\s+dawn|at\s+dusk|at\s+midnight|high\s+noon|by\s+sunrise|at\s+sunset)\b/gi,
    },
    {
      type: "DAY_ANCHOR",
      re: /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:morning|afternoon|evening|night)\b/gi,
    },
    {
      type: "CALENDAR",
      re: /\b(?:in\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/gi,
    },
    {
      type: "YEAR",
      re: /\b(?:in\s+)?(?:18|19|20)\d{2}\b/g,
    },
  ];

  const TEMPORAL_PHRASES = [
    "meanwhile",
    "at the same time",
    "simultaneously",
    "flashback",
    "years earlier",
    "years later",
    "the next morning",
    "that evening",
    "by then",
    "moments later",
  ];

  const SPOILER_TELEGRAPH = (root.LexicalBanks && root.LexicalBanks.SPOILER_PHRASES) || [
    "little did he know",
    "little did she know",
    "unbeknownst",
    "would soon learn",
    "would later discover",
    "unknown to him",
    "unknown to her",
    "what they didn't know",
  ];

  const FUTURE_REVEAL =
    /\b(would (?:never|not|die|learn|discover|find out|realize|betray|marry|leave|return|kill|save))|(?:will (?:soon|never|always|die|learn|discover|betray))\b/gi;

  function normalizeCtx(ctx) {
    ctx = ctx || {};
    const depth = String(ctx.chronoDepth || "meso").toLowerCase();
    const chronoDepth = depth === "macro" || depth === "micro" ? depth : "meso";
    return {
      chronoDepth,
      chronoSpoilerGuard: !!ctx.chronoSpoilerGuard,
      fiction: String(ctx.manuscriptType || "").includes("Fiction"),
      mutedRules: ctx.mutedRules || [],
      reportDensity: ctx.reportDensity || "balanced",
    };
  }

  function isMuted(ruleId, mutedSet) {
    return mutedSet.has(ruleId);
  }

  function pushFinding(findings, item, muted) {
    if (!item.targetText || item.targetText.length > 255) return;
    if (!item.ruleId) {
      item.ruleId = `chrono:auto:${String(item.module || "chrono").slice(0, 24)}:${String(item.targetText).slice(0, 40)}`.toLowerCase();
    }
    if (isMuted(item.ruleId, muted)) return;
    if (root.Settings?.isTargetDismissedGlobally?.(item.targetText)) return;
    findings.push(item);
  }

  function extractAnchors(text, paraIndex, granularity) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return [];
    const events = [];
    const lower = trimmed.toLowerCase();

    if (granularity !== "micro" && granularity !== "meso") return events;

    TEMPORAL_REGEX.forEach(({ type, re }) => {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(trimmed)) !== null) {
        events.push({
          paraIndex,
          type,
          label: match[0],
          excerpt: trimmed.substring(Math.max(0, match.index - 20), Math.min(trimmed.length, match.index + match[0].length + 40)).trim(),
        });
      }
    });

    TEMPORAL_PHRASES.forEach((phrase) => {
      if (!lower.includes(phrase)) return;
      const idx = lower.indexOf(phrase);
      events.push({
        paraIndex,
        type: "PHRASE",
        label: phrase,
        excerpt: trimmed.substring(Math.max(0, idx - 15), Math.min(trimmed.length, idx + phrase.length + 35)).trim(),
      });
    });

    return events;
  }

  function analyzeOrder(events, push) {
    let lastForward = -1;
    let flashAfterForward = 0;
    events.forEach((ev, seq) => {
      if (ev.type === "RELATIVE_FORWARD" || ev.type === "RELATIVE_BACK") lastForward = seq;
      if (ev.type === "FLASHBACK" && lastForward >= 0 && seq - lastForward <= 8) {
        flashAfterForward += 1;
      }
    });
    if (flashAfterForward >= 2) {
      push({
        ruleId: "chrono:order:flashback_cluster",
        module: "Timeline scan",
        type: "preference",
        explanation: "Several flashback-style anchors follow recent forward time jumps — verify reader orientation.",
        targetText: events.find((e) => e.type === "FLASHBACK")?.label || "earlier",
        replacementText: "(scene time stamp)",
        paraIndex: events.find((e) => e.type === "FLASHBACK")?.paraIndex,
      });
    }
  }

  function analyzeYears(events, push) {
    const years = events.filter((e) => e.type === "YEAR").map((e) => ({ y: parseInt(String(e.label).replace(/\D/g, ""), 10), ev: e }));
    if (years.length < 2) return;
    years.sort((a, b) => a.y - b.y);
    for (let i = 1; i < years.length; i++) {
      const gap = years[i].y - years[i - 1].y;
      if (gap > 150 && years[i].ev.paraIndex - years[i - 1].ev.paraIndex < 12) {
        push({
          ruleId: `chrono:year:gap:${years[i].y}`,
          module: "Timeline scan",
          type: "preference",
          explanation: `Large year jump (${years[i - 1].y} → ${years[i].y}) within a short span — confirm intentional ellipsis.`,
          targetText: String(years[i].ev.label),
          replacementText: "(bridge transition)",
          paraIndex: years[i].ev.paraIndex,
        });
        break;
      }
    }
  }

  function analyzeSpoilerGuard(paragraphs, ctx, push) {
    if (!ctx.chronoSpoilerGuard || !ctx.fiction) return;
    const total = paragraphs.length || 1;
    const earlyCutoff = Math.floor(total * 0.55);
    paragraphs.forEach((p, idx) => {
      if (idx > earlyCutoff) return;
      const text = String(p.text || "");
      const lower = text.toLowerCase();
      SPOILER_TELEGRAPH.forEach((phrase) => {
        if (!lower.includes(phrase)) return;
        push({
          ruleId: `chrono:spoiler:${phrase.slice(0, 24)}`,
          module: "Spoiler guard (scan)",
          type: "preference",
          explanation: "Narrator telegraphs a future outcome early in scoped text (heuristic — dialogue may be intentional).",
          targetText: phrase,
          replacementText: "(delay reveal)",
          paraIndex: p.index != null ? p.index : idx,
        });
      });
      FUTURE_REVEAL.lastIndex = 0;
      let m;
      let n = 0;
      while ((m = FUTURE_REVEAL.exec(text)) !== null && n < 2) {
        n += 1;
        push({
          ruleId: `chrono:future:${m[0].slice(0, 20).toLowerCase()}`,
          module: "Spoiler guard (scan)",
          type: "preference",
          explanation: "Future-tense outcome in early scoped paragraphs — check reveal timing.",
          targetText: m[0].substring(0, 80),
          replacementText: "(present-tense mystery)",
          paraIndex: p.index != null ? p.index : idx,
        });
      }
    });
  }

  root.ChronologyEngine = {
    MAX_EVENTS: 240,
    MAX_FINDING_CARDS: 24,

    /**
     * @param {Array<{index:number,text:string,headingLevel?:number}>} paragraphs
     * @param {object} ctx — chronoDepth, chronoSpoilerGuard, manuscriptType, mutedRules, reportDensity
     * @returns {{ timeline: object[], findings: object[], truncated: boolean }}
     */
    analyze(paragraphs, ctx) {
      ctx = normalizeCtx(ctx);
      paragraphs = Array.isArray(paragraphs) ? paragraphs : [];
      const muted = new Set(ctx.mutedRules || []);
      const findings = [];
      const push = (item) => pushFinding(findings, item, muted);

      const timeline = [];
      let currentChapter = "Opening";
      let scene = 1;
      const granularity = ctx.chronoDepth;

      paragraphs.forEach((p, walkIdx) => {
        const paraIndex = p.index != null ? p.index : walkIdx;
        const trimmed = String(p.text || "").trim();
        if (!trimmed) return;

        const hl = p.headingLevel || 0;
        if (hl > 0) {
          currentChapter = trimmed.substring(0, 100);
          scene = 1;
          if (granularity === "macro" || granularity === "meso") {
            timeline.push({
              paraIndex,
              type: "CHAPTER",
              label: currentChapter,
              excerpt: trimmed.substring(0, 100),
            });
          }
          return;
        }

        if (/^(\*\s*\*\s*\*|---|#{3,})$/.test(trimmed)) {
          scene += 1;
          if (granularity === "meso" || granularity === "micro") {
            timeline.push({
              paraIndex,
              type: "SCENE",
              label: `${currentChapter} — scene ${scene}`,
              excerpt: "Scene break",
            });
          }
          return;
        }

        if (granularity === "micro" || granularity === "meso") {
          const anchors = extractAnchors(trimmed, paraIndex, granularity);
          anchors.forEach((a) => timeline.push(a));
        }
      });

      let truncated = false;
      if (timeline.length > this.MAX_EVENTS) {
        truncated = true;
        timeline.length = this.MAX_EVENTS;
      }

      analyzeOrder(timeline, push);
      analyzeYears(timeline, push);
      analyzeSpoilerGuard(paragraphs, ctx, push);

      const maxCards = Math.min(
        root.ReportDensity?.maxCards?.(ctx.reportDensity) || 60,
        this.MAX_FINDING_CARDS
      );
      const deduped = [];
      const seen = new Set();
      findings.forEach((f) => {
        const key = `${f.ruleId}|${String(f.targetText).slice(0, 40)}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push({ ...f, id: f.id || `chrono_${deduped.length}` });
      });

      return {
        timeline,
        findings: deduped.slice(0, maxCards),
        truncated,
      };
    },

    /** Merge chronology findings into an audit suggestion list (additive). */
    mergeFindings(existing, chronoFindings) {
      const base = Array.isArray(existing) ? existing.slice() : [];
      const seen = new Set(base.map((s) => `${s.ruleId}|${String(s.targetText).slice(0, 40)}`));
      (chronoFindings || []).forEach((f, i) => {
        const key = `${f.ruleId}|${String(f.targetText).slice(0, 40)}`;
        if (seen.has(key)) return;
        seen.add(key);
        base.push({ ...f, id: f.id || `chrono_m_${i}_${Date.now()}` });
      });
      return base;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
