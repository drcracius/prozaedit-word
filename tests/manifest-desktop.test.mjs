import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

/**
 * Word Desktop validates manifests strictly (Word on the web is lenient). A resource id over 32 characters
 * (ST_ResourceId / ImageReferenceId max length) makes the desktop Shared Folder silently skip the add-in.
 * These checks keep both manifests loadable on desktop.
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_RESID = 32;

function parse(file) {
  const xml = fs.readFileSync(path.join(root, file), "utf8");
  const { DOMParser } = new JSDOM("").window;
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  assert.equal(doc.getElementsByTagName("parsererror").length, 0, `${file} must be well-formed XML`);
  return { xml, doc };
}

function resourceIds(xml) {
  const kinds = { Image: [], Url: [], String: [] };
  for (const m of xml.matchAll(/<bt:(Image|Url|String)\s+id="([^"]+)"/g)) kinds[m[1]].push(m[2]);
  return kinds;
}

for (const file of ["manifest.hosted.xml", "manifest.xml"]) {
  test(`${file}: resource ids are <= ${MAX_RESID} chars, unique, and every resid is defined`, () => {
    const { xml } = parse(file);
    const defined = resourceIds(xml);
    const all = [...defined.Image, ...defined.Url, ...defined.String];
    assert.ok(all.length > 0, "resources parsed");
    for (const id of all) assert.ok(id.length <= MAX_RESID, `resource id too long (${id.length}): ${id}`);
    assert.equal(new Set(all).size, all.length, "resource ids must be unique");
    const referenced = [...xml.matchAll(/\bresid="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(referenced.length > 0, "resids parsed");
    for (const id of referenced) {
      assert.ok(id.length <= MAX_RESID, `resid too long (${id.length}): ${id}`);
      assert.ok(all.includes(id), `resid "${id}" has no matching resource`);
    }
  });

  test(`${file}: short/long string and URL limits`, () => {
    const { xml } = parse(file);
    const shortBlock = xml.match(/<bt:ShortStrings>([\s\S]*?)<\/bt:ShortStrings>/)[1];
    const longBlock = xml.match(/<bt:LongStrings>([\s\S]*?)<\/bt:LongStrings>/)[1];
    for (const m of shortBlock.matchAll(/DefaultValue="([^"]*)"/g)) assert.ok(m[1].length <= 125, `short string > 125: ${m[1]}`);
    for (const m of longBlock.matchAll(/DefaultValue="([^"]*)"/g)) assert.ok(m[1].length <= 250, `long string > 250: ${m[1]}`);
    for (const m of xml.matchAll(/<bt:Url\s+id="[^"]+"\s+DefaultValue="([^"]*)"/g)) assert.ok(m[1].length <= 2048, "url too long");
  });
}

test("both manifests share one add-in id, one version, and the same resource ids", () => {
  const hosted = parse("manifest.hosted.xml").xml;
  const local = parse("manifest.xml").xml;
  const pick = (x, tag) => x.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))[1];
  assert.equal(pick(hosted, "Id"), pick(local, "Id"));
  assert.equal(pick(hosted, "Version"), pick(local, "Version"));
  const ids = (x) => Object.values(resourceIds(x)).flat().sort();
  assert.deepEqual(ids(hosted), ids(local));
});

test("hosted manifest uses https only and the GitHub Pages task pane", () => {
  const { xml } = parse("manifest.hosted.xml");
  assert.doesNotMatch(xml, /localhost/i);
  for (const m of xml.matchAll(/(?:DefaultValue|Value)="(https?:[^"]+)"/g)) assert.match(m[1], /^https:\/\//, m[1]);
  assert.match(xml, /<SourceLocation DefaultValue="https:\/\/drcracius\.github\.io\/prozaedit-word\/src\/taskpane\/taskpane\.html"\/>/);
});

test("hosted AppDomain entries are site roots (Word web upload rejects a path)", () => {
  const { xml } = parse("manifest.hosted.xml");
  for (const m of xml.matchAll(/<AppDomain>([^<]+)<\/AppDomain>/g)) {
    const url = m[1].trim().replace(/\/$/, "");
    assert.match(url, /^https:\/\/[^/]+$/i, `AppDomain must not include a path: ${m[1]}`);
  }
});

test("hosted manifest uses the site address Word accepts and the pictures from the working file", () => {
  const { xml } = parse("manifest.hosted.xml");
  assert.match(xml, /<AppDomain>https:\/\/drcracius\.github\.io<\/AppDomain>/);
  assert.doesNotMatch(xml, /<AppDomain>https:\/\/drcracius\.github\.io\/prozaedit-word<\/AppDomain>/);
  assert.match(xml, /id="ProzaEdit\.Icon16"[^>]*icon-32\.png"/);
  assert.match(xml, /id="ProzaEdit\.Icon32"[^>]*icon-32\.png"/);
  assert.match(xml, /id="ProzaEdit\.Icon80"[^>]*icon-64\.png"/);
  assert.match(xml, /<IconUrl DefaultValue="[^"]*icon-32\.png"\/>/);
  assert.match(xml, /<HighResolutionIconUrl DefaultValue="[^"]*icon-64\.png"\/>/);
});

test("desktop install script registers a UNC share (never file://) and offers the Developer sideload", () => {
  const ps = fs.readFileSync(path.join(root, "scripts/install/Install-ProzaEdit-GitHub.ps1"), "utf8");
  assert.doesNotMatch(ps, /AbsoluteUri/, "Word's Shared Folder needs a UNC path, not a file:// URI");
  assert.match(ps, /\$uncUrl/, "builds a UNC catalog url");
  assert.match(ps, /New-SmbShare/, "creates the network share Word requires");
  assert.match(ps, /Wef\\Developer/i, "has the no-admin Developer registry sideload");
  assert.match(ps, /Test-ManifestForDesktop/, "validates the manifest before registering");
  assert.match(ps, /AppDomain must be the site root only/, "rejects AppDomain paths Word web upload blocks");
});
