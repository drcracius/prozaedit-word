import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

test("UiPrefs.normalizeShaperFields clamps and defaults", () => {
  const { UiPrefs } = loadLib("src/taskpane/lib/ui-prefs-helpers.js");
  const defaults = UiPrefs.normalizeShaperFields({});
  assert.equal(defaults.shaperComplexity, 3);
  assert.equal(defaults.shaperIntensity, 4);
  assert.equal(defaults.shaperDensity, 2);
  const clamped = UiPrefs.normalizeShaperFields({ shaperComplexity: 9, shaperIntensity: 0, shaperDensity: "2" });
  assert.equal(clamped.shaperComplexity, 5);
  assert.equal(clamped.shaperIntensity, 1);
  assert.equal(clamped.shaperDensity, 2);
});

test("UiPrefs.getShaperDefaultsPatch matches UI_CONFIG_DEFAULTS", () => {
  const { UiPrefs } = loadLib("src/taskpane/lib/ui-prefs-helpers.js");
  const patch = UiPrefs.getShaperDefaultsPatch();
  assert.equal(patch.shaperComplexity, UiPrefs.UI_CONFIG_DEFAULTS.shaperComplexity);
  assert.equal(patch.shaperIntensity, UiPrefs.UI_CONFIG_DEFAULTS.shaperIntensity);
  assert.equal(patch.shaperDensity, UiPrefs.UI_CONFIG_DEFAULTS.shaperDensity);
});

test("shaper CONFIG round-trip shape", () => {
  const { UiPrefs } = loadLib("src/taskpane/lib/ui-prefs-helpers.js");
  const saved = {
    manuscriptType: "Fiction (Thriller/Mystery/Crime)",
    shaperComplexity: 2,
    shaperIntensity: 5,
    shaperDensity: 1,
  };
  const norm = UiPrefs.normalizeShaperFields(saved);
  const merged = { ...saved, ...norm };
  assert.equal(JSON.parse(JSON.stringify(merged)).shaperComplexity, 2);
  assert.equal(JSON.parse(JSON.stringify(merged)).shaperIntensity, 5);
  assert.equal(JSON.parse(JSON.stringify(merged)).shaperDensity, 1);
});
