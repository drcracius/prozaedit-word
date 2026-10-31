/* Audit report plain-text build, .txt download, and createDocument export (with .txt fallback). */
window.ProzaEdit = window.ProzaEdit || {};

ProzaEdit.ReportDocxExport = {
  /**
   * @param {{ suggestions: object[], excerpt: string, feedbackLetter: string, meta: object, buildContext: function }} input
   */
  buildAuditReportPlainText(input) {
    input = input || {};
    const suggestions = input.suggestions || [];
    const excerpt = input.excerpt || "";
    if (!suggestions.length && !excerpt) return "";
    const ctx = typeof input.buildContext === "function" ? input.buildContext() : {};
    const header = `ProzaEdit audit report · ${new Date().toLocaleString()}\n${"=".repeat(48)}\n\n`;
    const body =
      input.feedbackLetter ||
      (ProzaEdit.ManuscriptOverview?.buildFeedbackLetter
        ? ProzaEdit.ManuscriptOverview.buildFeedbackLetter(excerpt, ctx, input.meta, suggestions)
        : "");
    return (header + (body || "")).replace(/\r/g, "").substring(0, 480000);
  },

  downloadAuditReportFile(ext, text, ui) {
    ui = ui || {};
    if (!text) {
      if (ui.showPeStatus) ui.showPeStatus("Run an audit first.", "warn");
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
      if (ui.showPeStatus) {
        ui.showPeStatus("Report downloaded — open in Word and Save As .docx or PDF if needed.", "ok");
      }
    } catch (e) {
      if (ui.alert) ui.alert(e.message || "Download failed.");
    }
  },

  insertAuditReportInWord(text, deps) {
    deps = deps || {};
    if (!text) {
      if (deps.showPeStatus) deps.showPeStatus("Run an audit first.", "warn");
      return Promise.resolve();
    }
    if (typeof deps.confirm === "function" && !deps.confirm("Insert a plain-text audit report at the end of this document?")) {
      return Promise.resolve();
    }
    return deps
      .wordRun("insert-report", async (context) => {
        const end = context.document.body.getRange("End");
        end.insertText("\n\n" + text, Word.InsertLocation.before);
        await context.sync();
      })
      .then(() => {
        if (deps.showPeStatus) deps.showPeStatus("Report inserted at document end.", "ok");
      })
      .catch((e) => {
        if (deps.alert) deps.alert(e.message);
      });
  },

  /**
   * Opens a new Word document via createDocument() with plain-text report body (v1 behavior).
   * Falls back to .txt download when createDocument is unavailable.
   */
  async exportComprehensiveWordReport(text, deps) {
    deps = deps || {};
    if (!text) {
      if (deps.showPeStatus) deps.showPeStatus("Run an audit first.", "warn");
      return;
    }
    try {
      await deps.wordRun("export-new-doc", async (context) => {
        if (!context.application?.createDocument) {
          throw new Error("UNSUPPORTED");
        }
        const newDoc = context.application.createDocument();
        newDoc.body.insertText(text, Word.InsertLocation.start);
        await context.sync();
        newDoc.open();
        await context.sync();
      });
      if (deps.showPeStatus) {
        deps.showPeStatus("Report opened in a new Word document. Use File → Save As (.docx).", "ok");
      }
    } catch (e) {
      if (String(e.message).includes("UNSUPPORTED")) {
        this.downloadAuditReportFile("txt", text, deps);
        if (deps.showPeStatus) {
          deps.showPeStatus("This Word host cannot create a new doc — downloaded .txt instead.", "warn");
        }
        return;
      }
      if (deps.alert) deps.alert(e.message);
    }
  },

  exportAuditReportPdfGuide(text, deps) {
    deps = deps || {};
    if (!text) {
      if (deps.showPeStatus) deps.showPeStatus("Run an audit first.", "warn");
      return Promise.resolve();
    }
    return this.exportComprehensiveWordReport(text, deps).then(() => {
      if (deps.alert) {
        deps.alert(
          "PDF export (Microsoft Word):\n\n" +
            "• Word on the web: File → Export → Download as PDF\n" +
            "• Word desktop: File → Save As → PDF\n\n" +
            "The report should be in the new document that just opened. If not, use Download .txt and open that file in Word first."
        );
      }
    });
  },
};
