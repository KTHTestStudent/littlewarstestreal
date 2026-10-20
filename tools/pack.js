// ===== pack.js - Knotwork 3.8-alpha packer (MIT licence) =====
// Turns a DEV game (game.html + <script src> files inside INK blocks) into ONE
// html file for release, and a released file back into the dev files.
//   Browser: double-click tools/pack.html (it loads this file).
//   Node:    node tools/pack.js pack   game.html  [out.html]
//            node tools/pack.js unpack released.html [out-folder]
//            node tools/pack.js check  any.html
// The game marks the blocks like this (dev mode):
//   <!-- INK:RUNTIME --><script src="ink/ink.js"></script><!-- /INK:RUNTIME -->
// Any block name in capitals works (RUNTIME, STORY, KIT, CONFIG ...). Packing
// puts each file's text inside its block; nothing outside the blocks changes.
(function (root) {
  const KIT = "Knotwork 3.8-alpha";
  const INKJS_MIT = [
    "inkjs - MIT License",
    "Copyright (c) 2017 inkle Ltd.",
    "Copyright (c) 2017 inkjs contributors (see AUTHORS)",
    "",
    "Permission is hereby granted, free of charge, to any person obtaining a copy",
    "of this software and associated documentation files (the \"Software\"), to deal",
    "in the Software without restriction, including without limitation the rights",
    "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
    "copies of the Software, and to permit persons to whom the Software is",
    "furnished to do so, subject to the following conditions:",
    "",
    "The above copyright notice and this permission notice shall be included in all",
    "copies or substantial portions of the Software.",
    "",
    "THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
    "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
    "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
    "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
    "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
    "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
    "SOFTWARE."
  ];
  const KIT_MIT = [
    KIT + " (dialogue.js, pack.js, knotcheck.js) - MIT License",
    "Copyright (c) 2026 Kenton Howard",
    "Permission is granted under the MIT License - the same terms as the",
    "inkjs notice in the INK:RUNTIME block above, with this copyright line."
  ];
  const OPEN = /<!--\s*INK:([A-Z][A-Z0-9_]*)\s*-->/g;
  const DEV = /^\s*<script\s+src\s*=\s*"([^"]+)"\s*>\s*<\/script>\s*$/i;
  const HEAD = /^\s*<script>\n\/\*! ink-pack (\{[^\n]*\})\n[\s\S]*?\*\/\n/;

  // Every INK block in the html: {name, start, end, innerStart, innerEnd, inner}.
  function blocks(html) {
    const out = [];
    OPEN.lastIndex = 0;
    let m;
    while ((m = OPEN.exec(html))) {
      const name = m[1];
      const close = new RegExp("<!--\\s*/INK:" + name + "\\s*-->", "g");
      close.lastIndex = m.index + m[0].length;
      const c = close.exec(html);
      if (!c) {
        out.push({ name: name, error: "INK:" + name + " has no closing <!-- /INK:" + name + " -->" });
        continue;
      }
      const innerStart = m.index + m[0].length;
      out.push({ name: name, start: m.index, end: c.index + c[0].length, innerStart: innerStart, innerEnd: c.index, inner: html.slice(innerStart, c.index) });
      OPEN.lastIndex = c.index + c[0].length;
    }
    return out;
  }

  function kind(b) {
    if (DEV.test(b.inner)) return "dev";
    if (HEAD.test(b.inner)) return "packed";
    return "other";
  }

  function needsEsc(t) {
    return /<\/script/i.test(t) || t.indexOf("<!--") >= 0;
  }

  function esc(t) {
    return t.replace(/<\/(script)/gi, "<\\/$1").split("<!--").join("<\\!--");
  }

  function unesc(t) {
    return t.replace(/<\\\/(script)/gi, "</$1").split("<\\!--").join("<!--");
  }

  function dirOf(p) {
    const i = p.lastIndexOf("/");
    return i >= 0 ? p.slice(0, i + 1) : "";
  }

  // getFile(path) returns the file's text, or null if it isn't there.
  // Paths are as written in the src="..." (relative to the game's html).
  function pack(html, getFile, opts) {
    opts = opts || {};
    const report = [];
    const errors = [];
    const bs = blocks(html);
    if (!bs.length) errors.push("no <!-- INK:... --> blocks in this html - nothing to pack.");
    let outHtml = "";
    let at = 0;
    let total = 0;
    for (const b of bs) {
      if (b.error) {
        errors.push(b.error);
        continue;
      }
      const k = kind(b);
      if (k === "packed") {
        errors.push("INK:" + b.name + " is already packed - this looks like a released file (unpack it first).");
        continue;
      }
      if (k !== "dev") {
        errors.push("INK:" + b.name + " must hold exactly one <script src=\"...\"></script> line in dev mode.");
        continue;
      }
      const src = DEV.exec(b.inner)[1];
      const over = opts.override && opts.override[b.name];
      let text = over !== undefined && over !== null ? over : getFile(src);
      if (text === null || text === undefined) {
        errors.push("INK:" + b.name + ": the file " + src + " is missing.");
        continue;
      }
      text = String(text);
      const bom = text.charAt(0) === "﻿" ? 1 : 0;
      if (bom) text = text.slice(1);
      let e = 0;
      if (needsEsc(text)) {
        if (/<\\\/script/i.test(text) || text.indexOf("<\\!--") >= 0) {
          errors.push(src + " contains both \"</script\" and \"<\\/script\" - it can't be packed safely.");
          continue;
        }
        e = 1;
      }
      const nl = text.slice(-1) === "\n" ? 0 : 1;
      const meta = JSON.stringify({ block: b.name, src: src, dev: b.inner, esc: e, nl: nl, bom: bom, kit: KIT }).replace(/</g, "\\u003c");
      let lic = ["INK:" + b.name + " - packed from " + src + " by " + KIT + " (tools/pack.html). To edit it, unpack the file", "first; the dev files are the originals."];
      if (b.name === "RUNTIME") lic = lic.concat([""], INKJS_MIT);
      if (b.name === "KIT") lic = lic.concat([""], KIT_MIT);
      const head = "/*! ink-pack " + meta + "\n" + lic.map(function (l) { return "   " + l; }).join("\n").replace(/\*\//g, "* /") + "\n*/\n";
      const body = e ? esc(text) : text;
      outHtml += html.slice(at, b.innerStart) + "<script>\n" + head + body + (nl ? "\n" : "") + "</script>";
      at = b.innerEnd;
      total += text.length;
      report.push("INK:" + b.name + "  <- " + src + "  (" + Math.round(text.length / 1024) + " KB" + (e ? ", escaped" : "") + (over ? ", newer file you added" : "") + ")");
    }
    outHtml += html.slice(at);
    const left = leftovers(outHtml);
    for (const l of left) report.push("WARNING: still loads a separate file outside the INK blocks: " + l);
    return { html: errors.length ? null : outHtml, report: report, errors: errors, bytes: outHtml.length, packedBytes: total };
  }

  // Other files the page still needs (so it is not single-file yet).
  function leftovers(html) {
    const out = [];
    const rx = /<(script|img|link|audio|source|iframe)\b[^>]*\b(src|href)\s*=\s*"([^"]+)"/gi;
    let m;
    while ((m = rx.exec(html))) {
      if (/^(data:|#)/i.test(m[3])) continue;
      out.push("<" + m[1].toLowerCase() + " " + m[2] + "=\"" + m[3] + "\">");
    }
    return out;
  }

  // A released (packed) html back to dev mode: {html, files: {path: text}}.
  function unpack(html) {
    const errors = [];
    const files = {};
    const report = [];
    const bs = blocks(html);
    let outHtml = "";
    let at = 0;
    for (const b of bs) {
      if (b.error) {
        errors.push(b.error);
        continue;
      }
      const k = kind(b);
      if (k === "dev") {
        report.push("INK:" + b.name + " is already in dev mode (" + DEV.exec(b.inner)[1] + ") - left as it is.");
        continue;
      }
      if (k !== "packed") {
        errors.push("INK:" + b.name + " was changed by hand (no ink-pack header) - can't unpack it safely.");
        continue;
      }
      const hm = HEAD.exec(b.inner);
      let meta;
      try {
        meta = JSON.parse(hm[1]);
      } catch (e) {
        errors.push("INK:" + b.name + ": broken ink-pack header.");
        continue;
      }
      let body = b.inner.slice(hm[0].length);
      const endAt = body.search(/\n?<\/script>\s*$/i);
      if (endAt < 0) {
        errors.push("INK:" + b.name + ": no </script> at the end of the block.");
        continue;
      }
      body = body.slice(0, endAt) + (meta.nl ? "" : "\n");
      if (meta.esc) body = unesc(body);
      if (meta.bom) body = "\uFEFF" + body;
      files[meta.src] = body;
      outHtml += html.slice(at, b.innerStart) + (typeof meta.dev === "string" ? meta.dev : "<script src=\"" + meta.src + "\"></script>");
      at = b.innerEnd;
      report.push("INK:" + b.name + "  -> " + meta.src + "  (" + Math.round(body.length / 1024) + " KB)");
    }
    outHtml += html.slice(at);
    return { html: errors.length ? null : outHtml, files: files, report: report, errors: errors };
  }

  // What mode a file is in: "dev", "packed", "mixed" or "none".
  function mode(html) {
    const ks = blocks(html).map(function (b) { return b.error ? "bad" : kind(b); });
    if (!ks.length) return "none";
    if (ks.every(function (k) { return k === "dev"; })) return "dev";
    if (ks.every(function (k) { return k === "packed"; })) return "packed";
    return "mixed";
  }

  // ---- a tiny zip writer (stored, no compression) for downloads ----
  let CRC = null;
  function crc32(bytes) {
    if (!CRC) {
      CRC = [];
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        CRC[n] = c >>> 0;
      }
    }
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function utf8(s) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s);
    return Uint8Array.from(Buffer.from(s, "utf8"));
  }

  // entries: [{path, text}] -> Uint8Array of a .zip file
  function zip(entries) {
    const parts = [];
    const central = [];
    let offset = 0;
    const u16 = function (a, v) { a.push(v & 255, (v >>> 8) & 255); };
    const u32 = function (a, v) { a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); };
    for (const e of entries) {
      const name = utf8(e.path);
      const data = typeof e.text === "string" ? utf8(e.text) : e.text;
      const crc = crc32(data);
      const h = [];
      u32(h, 0x04034b50); u16(h, 20); u16(h, 0x0800); u16(h, 0); u16(h, 0); u16(h, 0x21);
      u32(h, crc); u32(h, data.length); u32(h, data.length); u16(h, name.length); u16(h, 0);
      parts.push(Uint8Array.from(h), name, data);
      const c = [];
      u32(c, 0x02014b50); u16(c, 20); u16(c, 20); u16(c, 0x0800); u16(c, 0); u16(c, 0); u16(c, 0x21);
      u32(c, crc); u32(c, data.length); u32(c, data.length); u16(c, name.length); u16(c, 0); u16(c, 0);
      u16(c, 0); u16(c, 0); u32(c, 0); u32(c, offset);
      central.push(Uint8Array.from(c), name);
      offset += h.length + name.length + data.length;
    }
    let csize = 0;
    for (const c of central) csize += c.length;
    const end = [];
    u32(end, 0x06054b50); u16(end, 0); u16(end, 0); u16(end, entries.length); u16(end, entries.length);
    u32(end, csize); u32(end, offset); u16(end, 0);
    const all = parts.concat(central, [Uint8Array.from(end)]);
    let len = 0;
    for (const a of all) len += a.length;
    const out = new Uint8Array(len);
    let p = 0;
    for (const a of all) {
      out.set(a, p);
      p += a.length;
    }
    return out;
  }

  root.inkPack = { pack: pack, unpack: unpack, blocks: blocks, mode: mode, zip: zip, crc32: crc32, leftovers: leftovers, KIT: KIT };

  // ---- node command line ----
  if (typeof module !== "undefined" && module.exports && typeof require !== "undefined" && require.main === module) {
    const fs = require("fs");
    const path = require("path");
    const [cmd, file, out] = process.argv.slice(2);
    if (!cmd || !file) {
      console.log("node tools/pack.js pack game.html [out.html] | unpack released.html [folder] | check file.html");
      process.exit(2);
    }
    const html = fs.readFileSync(file, "utf8");
    const base = path.dirname(path.resolve(file));
    if (cmd === "check") {
      console.log(path.basename(file) + ": " + mode(html) + " mode, blocks: " + blocks(html).map(function (b) { return b.name + (b.error ? " (BROKEN)" : " (" + kind(b) + ")"); }).join(", "));
    } else if (cmd === "pack") {
      const r = pack(html, function (src) {
        const p = path.join(base, src);
        return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
      });
      for (const l of r.report) console.log(l);
      for (const e of r.errors) console.log("ERROR: " + e);
      if (!r.html) process.exit(1);
      const dest = out || path.join(base, path.basename(file, ".html") + "-release.html");
      fs.writeFileSync(dest, r.html);
      console.log("packed -> " + dest + " (" + Math.round(r.bytes / 1024) + " KB, one file)");
    } else if (cmd === "unpack") {
      const r = unpack(html);
      for (const l of r.report) console.log(l);
      for (const e of r.errors) console.log("ERROR: " + e);
      if (!r.html) process.exit(1);
      const dir = out || path.join(base, "unpacked");
      fs.mkdirSync(dir, { recursive: true });
      const name = path.basename(file).replace(/-release\.html$/, ".html");
      fs.writeFileSync(path.join(dir, name), r.html);
      for (const f in r.files) {
        fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
        fs.writeFileSync(path.join(dir, f), r.files[f]);
      }
      console.log("unpacked -> " + dir + " (" + name + " + " + Object.keys(r.files).join(", ") + ")");
    } else {
      console.log("unknown command " + cmd);
      process.exit(2);
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
