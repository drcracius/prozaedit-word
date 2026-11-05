/**
 * Style-guide rule packs — original ProzaEdit heuristics keyed to licensed/public sources.
 * See docs/STYLE-GUIDE-SOURCES.md (Plain Language CC0, Strunk 1920 PD, GOV.UK OGL, MS/Google CC BY 4.0).
 * No guide text is copied into this file.
 * Weasel tally below uses a subset of the MIT word list from Brian Ford's weasel-words
 * (Copyright (c) 2014-2019 Brian Ford). See docs/THIRD-PARTY-ATTRIBUTION.md.
 */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.StyleGuideRules = {
  MODULE: "Style guide",

  resolveAutoGuides(ctx) {
    const type = String(ctx.manuscriptType || "");
    const lang = ctx.language || "en-US";
    const guides = [];
    if (lang === "en-GB") guides.push("govuk");
    else guides.push("plain", "strunk");
    if (type.includes("Technical")) guides.push("microsoft");
    else if (type.includes("Journalism")) guides.push("google");
    else if (type.includes("Business") || type.includes("Academic")) guides.push("plain");
    return [...new Set(guides)];
  },

  resolveGuides(ctx) {
    const ref = ctx.styleGuideRef || "auto";
    if (ref === "plain-us") return ["plain"];
    if (ref === "strunk") return ["strunk"];
    if (ref === "govuk") return ["govuk"];
    if (ref === "microsoft") return ["microsoft", "plain"];
    if (ref === "google-dev") return ["google", "plain"];
    if (ref === "redhat") return ["redhat", "plain"];
    if (ref === "custom") return ["custom"];
    if (ref === "custom-plus-auto") return ["custom", ...this.resolveAutoGuides(ctx)];
    if (ref === "auto") return this.resolveAutoGuides(ctx);
    return ["plain"];
  },

  sourceNote(guideId) {
    const notes = {
      plain: "Plain Language word list (plainlanguage.gov, CC0)",
      gpo: "GPO Style Manual 2016 (U.S. public domain)",
      writegood: "weasel-words (Brian Ford, MIT)",
      mailchimp: "Mailchimp Content Style Guide (CC BY-NC 4.0; not for commercial use)",
      strunk: "Strunk 1920 (public domain)",
      govuk: "GOV.UK style (OGL v2.0)",
      microsoft: "Microsoft Writing Style Guide (CC BY 4.0)",
      google: "Google developer style (CC BY 4.0)",
      redhat: "Red Hat Technical Writing Guide (CC BY-SA 4.0)",
    };
    return notes[guideId] || "Style guide";
  },

  _phraseFlags(text, lower, push, budget, guideId, phrases, ctx) {
    let n = 0;
    // Plain-language/Strunk wording advice targets exposition; in fiction the same phrase is usually voice.
    const fictionDemote = !!(ctx && ProzaEdit.Genres && ProzaEdit.Genres.isFiction(ctx.manuscriptType)) && (guideId === "plain" || guideId === "strunk");
    for (let i = 0; i < phrases.length && budget.remaining > 0; i++) {
      const [phrase, replacement, hint] = phrases[i];
      const hit = ProzaEdit.Audit?._find ? ProzaEdit.Audit._find(text, lower, phrase) : (lower.includes(phrase) ? phrase : null);
      if (!hit) continue;
      n++;
      budget.remaining--;
      push({
        ruleId: `sg:${guideId}:${phrase.replace(/\s/g, "_").slice(0, 24)}`,
        module: this.MODULE,
        type: "preference",
        explanation: `${hint || "Tighten wording"} (${this.sourceNote(guideId)}).`,
        targetText: hit,
        ...(fictionDemote ? { confidence: "low" } : {}),
        replacementText: replacement || "(shorten)",
      });
    }
    return n;
  },

  plainLanguage(text, lower, push, budget, ctx) {
    this._phraseFlags(text, lower, push, budget, "plain", [
      ["in order to", "to", "Plain language: prefer shorter phrasing"],
      ["due to the fact that", "because", "Plain language: direct cause"],
      ["at this point in time", "now", "Plain language: cut padding"],
      ["in the event that", "if", "Plain language: simpler conditional"],
      ["for the purpose of", "to", "Plain language: omit filler"],
      ["with regard to", "about", "Plain language: simpler preposition"],
      ["in regard to", "about", "Plain language: simpler preposition"],
      ["prior to", "before", "Plain language: common word"],
      ["subsequent to", "after", "Plain language: common word"],
      ["utilize", "use", "Plain language: simpler verb"],
      ["utilization", "use", "Plain language: simpler noun"],
      ["a number of", "some", "Plain language: say how many, or use some"],
      ["as a means of", "to", "Plain language: shorter purpose phrase"],
      ["at the present time", "now", "Plain language: cut padding"],
      ["by means of", "by", "Plain language: shorter phrase"],
      ["in a timely manner", "on time", "Plain language: shorter phrase"],
      ["in an effort to", "to", "Plain language: shorter purpose phrase"],
      ["in the amount of", "for", "Plain language: shorter phrase"],
      ["in the near future", "soon", "Plain language: shorter time phrase"],
      ["in the process of", "(omit)", "Plain language: often extra"],
      ["in lieu of", "instead of", "Plain language: common words"],
      ["inasmuch as", "since", "Plain language: common word"],
      ["has a requirement for", "needs", "Plain language: shorter verb"],
      ["in order that", "so", "Plain language: shorter purpose phrase"],
      ["it is essential", "must", "Plain language: direct obligation"],
      ["with respect to", "about", "Plain language: simpler preposition"],
      ["in accordance with", "under", "Plain language: shorter phrase"],
      ["in spite of the fact that", "although", "Plain language: shorter contrast"],
      ["a large number of", "many", "Plain language: shorter quantity"],
      ["the majority of", "most", "Plain language: shorter quantity"],
      ["it is important to note that", "(omit)", "Plain language: often extra"],
      ["during the course of", "during", "Plain language: shorter phrase"],
      ["make a decision", "decide", "Plain language: use the verb, not a hidden verb"],
      ["make a determination", "determine", "Plain language: use the verb, not a hidden verb"],
      ["conduct an investigation", "investigate", "Plain language: use the verb, not a hidden verb"],
      ["give consideration to", "consider", "Plain language: use the verb, not a hidden verb"],
      ["take into consideration", "consider", "Plain language: use the verb, not a hidden verb"],
      ["have a discussion", "discuss", "Plain language: use the verb, not a hidden verb"],
      ["make an attempt", "try", "Plain language: use the verb, not a hidden verb"],
    ], ctx);
    if (budget.remaining <= 0) return;
    const passiveRe = /\b(am|is|are|was|were|be|been|being)\s+[\w']+ed\b/gi;
    let passive = 0;
    let m;
    while ((m = passiveRe.exec(text)) !== null && passive < 12) passive++;
    const fiction = ProzaEdit.Genres ? ProzaEdit.Genres.isFiction(ctx?.manuscriptType) : false;
    if (!fiction && passive >= 8 && text.length > 400) {
      budget.remaining--;
      push({
        ruleId: "sg:plain:passive_cluster",
        module: this.MODULE,
        type: "preference",
        explanation: `Many passive-style constructions (~${passive}) — plain language favors active voice where possible (${this.sourceNote("plain")}).`,
        targetText: text.trim().substring(0, 80),
        replacementText: "(active voice)",
      });
    }
  },

  /** GPO Style Manual 2016 is a U.S. government work. One verified word form, not the manual. */
  gpo2016(text, push, budget) {
    if (budget.remaining <= 0) return;
    const m = /\be-mail\b/i.exec(text);
    if (!m) return;
    budget.remaining--;
    const raw = m[0];
    push({
      ruleId: "sg:gpo:email",
      module: this.MODULE,
      type: "preference",
      explanation: `GPO style lists this as one word, "email" (${this.sourceNote("gpo")}).`,
      targetText: raw,
      replacementText: raw[0] === raw[0].toUpperCase() ? "Email" : "email",
    });
  },

  /**
   * One card when several hedge words from the MIT weasel list pile up.
   * Fiction is skipped: those words are often voice. Not every weasel in the upstream list
   * (many, few, huge) — those flag ordinary sentences.
   */
  weaselCluster(text, push, budget, ctx) {
    if (budget.remaining <= 0) return;
    if (ProzaEdit.Genres && ProzaEdit.Genres.isFiction(ctx?.manuscriptType)) return;
    const hedges = ["very", "quite", "extremely", "obviously", "clearly", "completely", "exceedingly", "fairly", "largely", "mostly", "relatively", "remarkably", "significantly", "substantially", "surprisingly", "interestingly"];
    const re = new RegExp(`\\b(${hedges.join("|")})\\b`, "gi");
    const hits = [];
    let m;
    while ((m = re.exec(text)) !== null && hits.length < 12) hits.push(m[0]);
    if (hits.length < 4) return;
    budget.remaining--;
    const shown = [...new Set(hits.map((h) => h.toLowerCase()))].slice(0, 4).join(", ");
    push({
      ruleId: "sg:writegood:weasel",
      module: this.MODULE,
      type: "preference",
      confidence: "low",
      explanation: `Hedge words pile up here (${hits.length}: ${shown}). Cut a few if they do not earn their place (${this.sourceNote("writegood")}).`,
      targetText: hits[0],
      replacementText: "(review hedges)",
    });
  },

  /**
   * Adapted from the Mailchimp Content Style Guide word list.
   * CC BY-NC 4.0: noncommercial use only. Remove this pack before any sale.
   * Changed from the guide: short original notes, not the guide's sentences.
   */
  mailchimpNoncommercial(text, lower, push, budget, ctx) {
    if (!String(ctx?.manuscriptType || "").includes("Business")) return;
    const rows = [
      ["incentivize", "encourage"],
      ["learnings", "lessons"],
      ["thought leader", "(name the person)"],
      ["best-in-breed", "(omit)"],
      ["crushing it", "(plain words)"],
      ["killing it", "(plain words)"],
    ];
    for (let i = 0; i < rows.length && budget.remaining > 0; i++) {
      const hit = ProzaEdit.Audit?._find ? ProzaEdit.Audit._find(text, lower, rows[i][0]) : null;
      if (!hit) continue;
      budget.remaining--;
      const id = rows[i][0].replace(/[^a-z0-9]+/gi, "_").slice(0, 24);
      push({
        ruleId: `sg:mc:${id}`,
        module: this.MODULE,
        type: "preference",
        confidence: "low",
        explanation: `Mailchimp’s word list treats “${hit}” as fluff (${this.sourceNote("mailchimp")}).`,
        targetText: hit,
        replacementText: rows[i][1],
      });
    }
  },

  strunk1920(text, lower, push, budget, ctx) {
    this._phraseFlags(text, lower, push, budget, "strunk", [
      ["the fact that", "that", "Strunk: omit needless words"],
      ["reason is because", "reason is that", "Strunk: avoid redundant because"],
      ["the question as to whether", "whether", "Strunk: simplify"],
      ["he is a man who", "he", "Strunk: cut padding (adjust gender as needed)"],
      ["she is a woman who", "she", "Strunk: cut padding"],
      ["there is no doubt but that", "no doubt", "Strunk: tighten"],
    ], ctx);
  },

  govuk(text, lower, push, ctx, budget) {
    const gb = ctx.language === "en-GB" || ctx.styleGuideRef === "govuk";
    if (!gb) return;
    if (/\be-mail\b/i.test(text)) {
      budget.remaining--;
      push({
        ruleId: "sg:govuk:email",
        module: this.MODULE,
        type: "preference",
        explanation: `GOV.UK style: prefer "email" without hyphen (${this.sourceNote("govuk")}).`,
        targetText: "e-mail",
        replacementText: "email",
      });
    }
    const ukPairs = [
      ["gray", "grey", "US 'gray' in en-GB document"],
      ["defense", "defence", "UK spelling"],
    ];
    ukPairs.forEach(([us, uk, hint]) => {
      if (budget.remaining <= 0) return;
      if (new RegExp(`\\b${us}\\b`).test(text)) {
        budget.remaining--;
        push({
          ruleId: `sg:govuk:${us}`,
          module: this.MODULE,
          type: "preference",
          explanation: `${hint} (${this.sourceNote("govuk")}).`,
          targetText: us,
          replacementText: uk,
        });
      }
    });
    if (budget.remaining > 0 && lower.includes("cooperate") && lower.includes("co-operate")) {
      budget.remaining--;
      push({
        ruleId: "sg:govuk:cooperate",
        module: this.MODULE,
        type: "preference",
        explanation: `Mixed "cooperate" / "co-operate" — GOV.UK often hyphenates co- verbs (${this.sourceNote("govuk")}).`,
        targetText: "cooperate",
        replacementText: "co-operate",
      });
    }
    if (budget.remaining > 0 && /\bwhile\b/i.test(text) && /\bwhilst\b/i.test(text)) {
      budget.remaining--;
      push({
        ruleId: "sg:govuk:while",
        module: this.MODULE,
        type: "preference",
        explanation: `Mixed "while" and "whilst" — pick one register (${this.sourceNote("govuk")}).`,
        targetText: "whilst",
        replacementText: "while",
      });
    }
  },

  microsoft(text, lower, push, budget) {
    this._phraseFlags(text, lower, push, budget, "microsoft", [
      ["click on", "click", "Microsoft style: concise UI wording"],
      ["please note that", "note:", "Microsoft style: direct docs tone"],
      ["allows you to", "lets you", "Microsoft style: simpler phrasing"],
      ["in the dialog box", "in the dialog", "Microsoft style: shorter term"],
    ]);
    if (budget.remaining > 0 && /\bdropdown menu\b/i.test(text)) {
      budget.remaining--;
      push({
        ruleId: "sg:ms:dropdown",
        module: this.MODULE,
        type: "preference",
        explanation: `Microsoft style: often "menu" or "list" unless "dropdown" is needed (${this.sourceNote("microsoft")}).`,
        targetText: "dropdown menu",
        replacementText: "menu",
      });
    }
  },

  redhat(text, lower, push, budget) {
    this._phraseFlags(text, lower, push, budget, "redhat", [
      ["please refer to", "see", "Red Hat style: concise cross-refs"],
      ["in this section we will", "this section", "Red Hat style: direct docs voice"],
      ["is able to", "can", "Red Hat style: simpler modal"],
      ["it is recommended to", "recommended:", "Red Hat style: imperative docs"],
    ]);
  },

  googleDev(text, lower, push, ctx, budget) {
    this._phraseFlags(text, lower, push, budget, "google", [
      ["click here", "descriptive link text", "Google style: accessible link text"],
      ["please see", "see", "Google style: omit please in instructions"],
      ["simply", "", "Google style: cut filler"],
      ["easy to", "", "Google style: show, don't tell — describe steps"],
    ]);
    const tech = String(ctx.manuscriptType || "").includes("Technical") || String(ctx.manuscriptType || "").includes("Journalism");
    if (budget.remaining > 0 && tech && /\bwe'll\b/i.test(text)) {
      budget.remaining--;
      push({
        ruleId: "sg:google:we",
        module: this.MODULE,
        type: "preference",
        explanation: `Google style: prefer second person "you" in developer docs (${this.sourceNote("google")}).`,
        targetText: "we'll",
        replacementText: "you'll",
      });
    }
  },

  customPack(text, lower, push, ctx, budget) {
    const pack = ctx.customStyleGuide || { name: "Custom", rules: [] };
    const mod = pack.name ? `Style guide (${pack.name})` : "Style guide (custom)";
    const rules = pack.rules || [];
    if (!rules.length) {
      if (ctx.styleGuideRef === "custom") {
        push({
          ruleId: "sg:custom:empty",
          module: mod,
          type: "preference",
          explanation: "No custom rules yet — add them on Start → Custom house style.",
          targetText: "(custom style)",
          replacementText: "(add rules on Start)",
        });
        budget.remaining--;
      }
      return;
    }
    const matchFn = ProzaEdit.CustomStyleGuide?.phraseInText;
    for (let i = 0; i < rules.length && budget.remaining > 0; i++) {
      const r = rules[i];
      const phrase = String(r.find || "");
      if (!phrase) continue;
      const hit = matchFn ? matchFn(text, lower, phrase, true) : lower.includes(phrase.toLowerCase());
      if (!hit) continue;
      budget.remaining--;
      const rep = r.replace || "";
      const canApply = rep && !rep.startsWith("(");
      push({
        ruleId: `sg:custom:${r.id || phrase.slice(0, 40)}`,
        module: mod,
        type: canApply ? "confirmed" : "preference",
        explanation: r.hint || `House style: prefer “${rep || "(review)"}” over “${r.find}”.`,
        targetText: r.find,
        replacementText: rep || "(review)",
      });
    }
  },

  apply(text, lower, push, ctx) {
    if (ctx.chkSpell === false) return;
    const guides = this.resolveGuides(ctx);
    const ref = ctx.styleGuideRef || "auto";
    let cap = 10;
    if (ref === "custom") cap = 20;
    else if (ref === "custom-plus-auto") cap = 24;
    const budget = { remaining: cap };
    guides.forEach((g) => {
      if (budget.remaining <= 0) return;
      if (g === "custom") this.customPack(text, lower, push, ctx, budget);
      else if (g === "plain") {
        this.plainLanguage(text, lower, push, budget, ctx);
        this.gpo2016(text, push, budget);
        this.weaselCluster(text, push, budget, ctx);
        this.mailchimpNoncommercial(text, lower, push, budget, ctx);
      }
      else if (g === "strunk") this.strunk1920(text, lower, push, budget, ctx);
      else if (g === "govuk") this.govuk(text, lower, push, ctx, budget);
      else if (g === "microsoft") this.microsoft(text, lower, push, budget);
      else if (g === "google") this.googleDev(text, lower, push, ctx, budget);
      else if (g === "redhat") this.redhat(text, lower, push, budget);
    });
  },
};
