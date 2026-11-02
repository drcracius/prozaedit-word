# Owner test checklist: 2.0.0.26 (condensed from PE-84/PE-96 checklists)

Manifest: `manifest.hosted.xml`. Re-upload only if Help -> About shows an older manifest version; otherwise close and reopen the pane (Ctrl+F5 in Word web).

## 10-minute core check (Word web, then desktop)
1. Open a real chapter. Help -> About shows UI build and manifest 2.0.0.26. What's new "Release notes" link opens the PE-81 notes.
2. Pick a genre (e.g. Romance), Run audit. Cards appear; the summary names the genre. Switch genre and re-run: results/limits change (thriller flags long sentences, literary does not).
3. Toggle Simple and Advanced a few times, also mid-run. Pane stays usable, one tab active, no errors. In Simple, low-confidence cards are hidden behind "Show them".
4. **Apply**: pick a card for a word that appears once -> Apply -> text changes in Word, status says Applied. Ctrl+Z in Word undoes it. Double-click Apply quickly: only one edit.
5. Pick a card whose text appears twice (e.g. "very"): Apply must REFUSE with an explanation and change nothing (expected).
6. Edit the paragraph in Word after the audit, then Apply its card: must refuse ("paragraph has changed"). Run the check again.
7. "Double space" card: Apply says use Find & Replace (expected, by design).
8. ProzaEdit Undo/Redo buttons after an Apply: works when the text is unique; may refuse if it now appears twice (known; use Ctrl+Z).
9. Offline test: disconnect network, run audit/Coach/Rewrite: all work. (Update check and Thesaurus will just fail quietly.)
10. Long document (50k+ words): Run audit full scope; Cancel mid-run works; pane responsive.

## AI help (only if you have a key; costs pennies)
- Settings -> AI help: pick Gemini (free AI Studio key), paste key, leave "Remember" OFF. Deep audit -> confirm dialog shows estimate -> result cards. Repeat the same request: meter says "cached, 0 tokens".
- Look for: the key is NOT in the document (File -> Info / settings), the error for a wrong key reads "rejected the API key" with no key text, Cancel stops the call.
- Set the session limit very low (1,000) and confirm the next AI call is refused before sending.
- Try each provider you own a key for (OpenAI, Claude, OpenRouter). If one fails with a CORS/network error in Word web, note which; Claude/Gemini model ids may have drifted: use the custom model field (Advanced).
- "Remember on this device": reload the pane; key persists. Turn it off: key removed. Settings -> clear saved AI replies works.

## Final build 2.0.0.25 — owner checks (PE-95)
Re-upload `manifest.hosted.xml` only if Help -> About still shows 2.0.0.24 (version bump only).
1. TRACK CHANGES (top blocker): in Word turn Track Changes ON (All), run an audit, Apply a card. Expected: the text becomes a tracked replacement (Review tab shows a deletion and an insertion), status says "Applied as a tracked change", Undo button does not offer that edit. Reject the change in Word: original text returns. Report anything else (an error, double text, wrong spot). Repeat with "Only me" and with Track Changes OFF (plain edit, Undo works).
2. Word on the web and an older Word without WordApi 1.4: Apply still works and says plain "Applied".
3. Rebuild the book outline twice on a long book, editing one chapter between: second build is the same as a fresh one (names, time cues); it is not faster to read, only to process.
4. Narrow the pane to about 320 px, light and dark: toolbar status text wraps (is not cut with ...), Settings and confirm dialogs scroll and show both buttons, "Long book?" panel buttons wrap.
5. Keyboard only: open Settings, Tab around (stays inside), Esc closes and returns focus; same for the Apply confirm. With a screen reader, the chapter-by-chapter line is announced as you move through chapters.
6. UK spellings (realise, neighbour, travelled, theatre...) in a US-English document are flagged; in quoted dialogue they are not. Switch language to UK to see the reverse.
7. Error wording: trigger a whole-document timeline on a very long book and an audit on an empty document; messages should read as plain sentences with what to do next.

## Final build 2.0.0.26 — owner checks (PE-96)
Re-upload `manifest.hosted.xml` only if Help -> About still shows 2.0.0.25 (version bump only).
1. TRACK CHANGES (still the top blocker): Track Changes ON, run an audit, Apply a card; confirm a tracked replacement appears and ProzaEdit does not report a verify problem. Repeat on Word on the web and Mac.
2. Type `<img src=x onerror=alert(1)>` into a document paragraph, run an audit and press Go to / Apply on any card: nothing should pop up and any message shows the text literally.
3. Target tab: "Where is your story set?" is empty on a new document. Leave it empty and use an AI action: the reply must not mention Texas.
4. Apply a card for a capitalised word (e.g. "Organize" in a UK document): it should apply; "In order to" at a sentence start becomes "To", not "to".
5. Rewrite modes (Fluency, Formal, Academic, Creative) on a paragraph with "a lot of money": no lowercase sentence starts.
6. Turn off your network and press Check for updates: after about 10 seconds you get a plain failure message, not a spinner.
7. A sentence with "sensitivity analyses" in a US-English document shows no spelling-dialect card.

Earlier per-build checks (2.0.0.20-2.0.0.24) are in the project store copy of the PE-84 checklist; the items above supersede them. Rollback: see tags in HANDOFF-DESKTOP.md.
