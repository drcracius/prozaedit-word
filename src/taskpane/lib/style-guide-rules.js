/**
 * Style-guide rule packs — original ProzaEdit heuristics keyed to licensed/public sources.
 * See STYLE-GUIDE-SOURCES.md (Plain Language CC0, Strunk 1920 PD, GOV.UK OGL, MS/Google CC BY 4.0).
 * No guide text is copied into this file.
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
      plain: "Plain Language (plainlanguage.gov, CC0)",
      strunk: "Strunk 1920 (public domain)",
      govuk: "GOV.UK style (OGL v2.0)",
      microsoft: "Microsoft Writing Style Guide (CC BY 4.0)",
      google: "Google developer style (CC BY 4.0)",
      redhat: "Red Hat Technical Writing Guide (CC BY-SA 4.0)",
    };
    return notes[guideId] || "Style guide";
  },

  _phraseFlags(text, lower, push, budget, guideId, phrases) {
    let n = 0;
    for (let i = 0; i < phrases.length && budget.remaining > 0; i++) {
      const [phrase, replacement, hint] = phrases[i];
      if (!lower.includes(phrase)) continue;
      n++;
      budget.remaining--;
      push({
        ruleId: `sg:${guideId}:${phrase.replace(/\s/g, "_").slice(0, 24)}`,
        module: this.MODULE,
        type: "preference",
        explanation: `${hint || "Tighten wording"} (${this.sourceNote(guideId)}).`,
        targetText: phrase,
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
    ]);
    if (budget.remaining <= 0) return;
    const passiveRe = /\b(am|is|are|was|were|be|been|being)\s+[\w']+ed\b/gi;
    let passive = 0;
    let m;
    while ((m = passiveRe.exec(text)) !== null && passive < 12) passive++;
    const fiction = String(ctx?.manuscriptType || "").includes("Fiction");
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

  strunk1920(text, lower, push, budget) {
    this._phraseFlags(text, lower, push, budget, "strunk", [
      ["the fact that", "that", "Strunk: omit needless words"],
      ["reason is because", "reason is that", "Strunk: avoid redundant because"],
      ["the question as to whether", "whether", "Strunk: simplify"],
      ["he is a man who", "he", "Strunk: cut padding (adjust gender as needed)"],
      ["she is a woman who", "she", "Strunk: cut padding"],
      ["there is no doubt but that", "no doubt", "Strunk: tighten"],
    ]);
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
      if (new RegExp(`\\b${us}\\b`, "i").test(text)) {
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
          explanation: "No custom rules yet — add them on Target → Custom house style.",
          targetText: "(custom style)",
          replacementText: "(add rules on Target tab)",
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
      else if (g === "plain") this.plainLanguage(text, lower, push, budget, ctx);
      else if (g === "strunk") this.strunk1920(text, lower, push, budget);
      else if (g === "govuk") this.govuk(text, lower, push, ctx, budget);
      else if (g === "microsoft") this.microsoft(text, lower, push, budget);
      else if (g === "google") this.googleDev(text, lower, push, ctx, budget);
      else if (g === "redhat") this.redhat(text, lower, push, budget);
    });
  },
};
