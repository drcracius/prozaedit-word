import test from "node:test";
import assert from "node:assert/strict";
import { loadLib } from "./load-lib.mjs";

function mockOfficeSettings() {
  const bag = {};
  const Office = {
    AsyncResultStatus: { Succeeded: "succeeded" },
    context: {
      document: {
        settings: {
          get(key) {
            return bag[key];
          },
          set(key, value) {
            bag[key] = value;
          },
          saveAsync(cb) {
            cb({ status: Office.AsyncResultStatus.Succeeded });
          },
        },
      },
    },
  };
  return { Office, bag };
}

test("Settings persists dictionary and mute rules in Office document settings", async () => {
  const { Office, bag } = mockOfficeSettings();
  const ls = {};
  const Settings = loadLib("src/taskpane/lib/settings-store.js", {
    Office,
    localStorage: {
      getItem: (k) => ls[k],
      setItem: (k, v) => {
        ls[k] = v;
      },
      removeItem: (k) => {
        delete ls[k];
      },
    },
  }).Settings;

  await Settings.addDictionaryWord("McGuffin");
  assert.ok(bag[Settings.KEYS.DICTIONARY], "dictionary should be written to document settings");
  assert.match(String(bag[Settings.KEYS.DICTIONARY]), /McGuffin/i);
  assert.equal(Settings.getDictionary().length, 1);

  await Settings.muteRule("rule-spell-teh", { global: false });
  assert.ok(bag[Settings.KEYS.MUTED], "mute list should be written to document settings");
  assert.match(String(bag[Settings.KEYS.MUTED]), /rule-spell-teh/);
  assert.ok(Settings.getMutedRules().includes("rule-spell-teh"));
});
