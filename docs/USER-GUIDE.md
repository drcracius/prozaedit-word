# How to use ProzaEdit

This guide matches build **2.0.0.68**. If Help → About shows an older number, the live copy has not been updated yet.

## 1. Install

1. Remove any old ProzaEdit: Word on the web → Insert → Add-ins → My Add-ins → **⋯** → Remove.
2. Download the raw file (not the GitHub web page): https://github.com/drcracius/prozaedit-word/raw/main/manifest.hosted.xml
3. Upload that file: Insert → Add-ins → Upload My Add-in.
4. Open it from **Home → ProzaEdit**.

On the desktop app, use `Download-Manifest-From-GitHub.bat`, then `Fix-ProzaEdit-SharedFolder.bat` or `Sideload-ProzaEdit-Desktop.bat`. See `docs/DESKTOP-INSTALL.md`.

## 2. Start

The steps at the top are **Start**, **Set checks**, **Run**, and **Fix**. **Set checks** opens the Run tab. **Run** starts the check.

**Scope** is the part Run reads. A new document starts on **Selection**. A saved choice is kept.

- **Selection** — text you highlighted. If nothing is highlighted, you see 0 words.
- **Pages** — on a recent desktop Word, the count is Word's own layout (page 1, page 2, and so on). A custom number in the footer is ignored. On Word for the web, a page is about **250 words**, and the boxes say **estimate**. The count runs when you choose Pages. Press **Cancel** if it takes too long. You can still type a range if the count does not finish.
- **Chapters** — set **From chapter** and **To chapter**, like pages. Titles must use Word’s **Heading 1**, **Heading 2**, or **Heading 3** style. A Heading 2 or Heading 3 is its own chapter. If none are found, the pane says so and offers **Use pages**. It does not switch by itself.
- **Full** — the whole document, up to about **75,000 words**. If the book is longer, the pane says the check **stopped**. It does not pretend to have read the rest.

**Refresh count** shows words. **Run** is the button at the top.

**Target Reader (Age & Education Level)** changes the reading-level check. Teenager and High School use the same grade band.

**Style & Guide Rules** picks local wording checks. Auto follows your language and manuscript type. Each guide is a short set of habits, not the whole published manual.

## 3. Run

Run checks the scope on Start. It does not underline while you type.

Genre and language on Start decide most local checks. **Simple** hides the individual check list and uses the usual checks. If the type is fiction, story checks (plot, dialogue, viewpoint, pacing) still run. Extra scans (timeline, citations) sit under **More checks**, or turn Simple off in Settings to pick each one. Fiction checks turn off when the type is not fiction. Story checks skip quoted speech so a character’s line is not treated as the narrator. Dialogue checks still read the spoken lines (long speeches, heavy tags). Citation and timeline tools look at the same scope and only run when you click them.

**Audit next chapter** walks one heading chapter at a time and keeps one combined summary. Use it when Full says it stopped.

## 4. Fix

Cards are the notes from the last Run. Filter chips on Fix: **All**, then **Correctness** (proof), **Clarity** (wording), **Consistency** (spelling/names), and **Craft** (fiction craft). Critical / Style / Style guide still work. **Go to** jumps to a note. **Apply** changes the document after you confirm. **Last edit** on the toolbar jumps to the last change ProzaEdit made. Those are different buttons.

**Run** stays at the top. This tab does not start a second run.

## 5. Rewrite

**Replace list** is one change per line: `find => replace`. It changes the scope chosen on Start. A blank replacement deletes the found text. It asks before it writes. Word's Track Changes setting is left as it is. Use Word's Undo to step back.

**Local paraphrase** tightens the highlighted text on this computer.

## 6. Coach and optional AI

**Local Coach** stays on your device. It does not need a key.

**Optional AI help** uses your own API key only when you click **Send via AI**. It sends the text you chose, and your book outline if you built one. Nothing is applied automatically. A ChatGPT Plus, Claude Pro, Gemini, or Copilot subscription is not an API key.

**Deep check** on Run asks before it sends a short excerpt. A voice sample and a project rule, if you typed them, go with that call only. Local Run does not send them. The project rule is one or two sentences of your own, such as a fact the check should watch for.

## 7. Settings that change a check

- **Simple / Advanced** hides extra tabs and the individual Run check list. It does not change which usual checks run.
- **Report depth** changes how many cards you see.
- **Language** switches US and UK spelling.
- **Your dictionary** stops name notes you do not want.
- **House rules** are the custom style guide.

## 8. When something looks wrong

- **No chapters found** — the titles are not Heading 1, 2, or 3. Use pages, or apply those styles and reload the chapter list.
- **Count stays blank** — click **Refresh count**. If another check is running, wait.
- **Stopped after about N words** — Full reached its limit. Use chapters, pages, or Audit next chapter for the rest.
- **Upload says the file is not valid** — use the raw GitHub file from section 1, and remove the old add-in first.

## 9. What this add-in does not read

Headers, footers, and many text boxes are outside the main story. Notes there may not appear. On Word for the web, pages are estimates. On a recent desktop Word, Pages follows Word's layout order, not a custom number in the footer.

## Keeping this guide up to date

When a release changes scope, counts, or these labels, update this file in the same change as `docs/RELEASE-NOTES-PE-81.md`. The handoff lists this file in section 6.
