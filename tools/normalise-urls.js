// Extensionless URL and root-icon normaliser.
//
// Cloudflare Pages serves /guides/vat-rates from guides/vat-rates.html and
// 302s the .html path, so every internal link, canonical, og:url and JSON-LD
// URL must use the extensionless form. This module is the single source of
// truth for that rewrite and is called from the page generators as well as
// from the command line.
//
//   node tools/normalise-urls.js            rewrite every page in the repo
//   node tools/normalise-urls.js --check    report changes without writing
//
// Rules:
//   - local hrefs ending .html become root-relative and extensionless
//   - index.html maps to / and keeps its fragment, e.g. /#main
//   - absolute https://vatinuk.co.uk/...html URLs lose the suffix
//   - external links, mailto:, tel:, data: and fragment-only links are left alone
//   - every page gets the six root-absolute icon tags

const fs = require("fs");
const path = require("path");

const HOST = "vatinuk.co.uk";
const SITE = `https://${HOST}`;

const ICON_LINKS = [
  `<link rel="icon" href="/favicon.ico" sizes="48x48" />`,
  `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`,
  `<link rel="icon" href="/favicon-192.png" type="image/png" sizes="192x192" />`,
  `<link rel="icon" href="/favicon-512.png" type="image/png" sizes="512x512" />`,
  `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
  `<link rel="manifest" href="/site.webmanifest" />`,
];

function splitSuffix(value) {
  const index = value.search(/[?#]/);
  return index === -1 ? [value, ""] : [value.slice(0, index), value.slice(index)];
}

function stripHtml(pathname) {
  const [file, suffix] = splitSuffix(pathname);
  let clean = file.replace(/\.html$/i, "");
  if (/(^|\/)index$/.test(clean)) clean = clean.replace(/index$/, "");
  return clean + suffix;
}

function resolvePath(rel, href) {
  if (href.startsWith("/")) return path.posix.normalize(href).replace(/^\/+/, "");
  const dir = path.posix.dirname(rel);
  return path.posix.normalize(dir === "." ? href : path.posix.join(dir, href));
}

function fixHref(rel, href) {
  if (!href) return href;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href)) return href;
  if (href.startsWith("#")) return href;
  const [file, suffix] = splitSuffix(href);
  if (!/\.html$/i.test(file)) return href;
  const resolved = resolvePath(rel, file);
  return "/" + stripHtml(resolved).replace(/^\//, "") + suffix;
}

function stripSiteUrls(html) {
  const pattern = new RegExp(`https://${HOST.replace(/\./g, "\\.")}(/[^\\s"'<>()\\\\]*)?`, "g");
  return html.replace(pattern, (whole, pathname) => {
    if (!pathname) return whole;
    if (!/\.html(?:[?#]|$)/i.test(pathname)) return whole;
    return SITE + stripHtml(pathname);
  });
}

function ensureIcons(html) {
  const cluster = ICON_LINKS.map((line) => "    " + line).join("\n");
  const existing =
    /[ \t]*<link rel="icon"[^\n]*\n(?:[ \t]*<link rel="(?:icon|apple-touch-icon|manifest)"[^\n]*\n)*/;
  if (existing.test(html)) return html.replace(existing, cluster + "\n");

  const stylesheet = /([ \t]*)<link rel="stylesheet"[^\n]*\n/;
  if (stylesheet.test(html)) return html.replace(stylesheet, (match) => cluster + "\n" + match);

  return html.replace(/<\/head>/, cluster + "\n  </head>");
}

function normaliseHtml(rel, html) {
  let out = html.replace(/href="([^"]*)"/g, (match, href) => `href="${fixHref(rel, href)}"`);
  out = stripSiteUrls(out);
  return ensureIcons(out);
}

function normaliseFile(abs, root) {
  const html = fs.readFileSync(abs, "utf8");
  const rel = path.relative(root, abs).split(path.sep).join("/");
  const out = normaliseHtml(rel, html);
  if (out === html) return false;
  fs.writeFileSync(abs, out);
  return true;
}

function htmlFiles(root) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if ([".git", "node_modules", "assets", "tools", ".github"].includes(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith(".html")) {
        out.push(path.join(dir, entry.name));
      }
    }
  })(root);
  return out.sort();
}

function main() {
  const root = path.resolve(__dirname, "..");
  const check = process.argv.includes("--check");
  const files = htmlFiles(root);
  let changed = 0;

  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const html = fs.readFileSync(abs, "utf8");
    const out = normaliseHtml(rel, html);
    if (out === html) continue;
    changed += 1;
    if (check) {
      console.log("would change", rel);
    } else {
      fs.writeFileSync(abs, out);
      console.log("normalised", rel);
    }
  }

  console.log(`${files.length} pages scanned, ${changed} ${check ? "need changes" : "updated"}`);
  if (check && changed) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  SITE,
  HOST,
  ICON_LINKS,
  fixHref,
  stripSiteUrls,
  ensureIcons,
  normaliseHtml,
  normaliseFile,
  htmlFiles,
};
