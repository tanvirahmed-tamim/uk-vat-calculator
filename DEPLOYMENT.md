# Deployment — Cloudflare Pages

The site is static. There is no build command, no framework and no server-side code.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Git provider | GitHub |
| Repository | `tanvirahmed-tamim/uk-vat-calculator` |
| Production branch | `main` |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `/` |
| Root directory | `/` |
| Environment variables | none |

Every push to `main` publishes the repository root. Pull requests get preview URLs.

## Files Cloudflare reads automatically

- `_redirects` — two rules: `/guides/vat-rates-explained.html` 301s to
  `/guides/vat-rates.html`, and `/guides/vat-for-overseas-clients.html` 301s to
  `/guides/vat-for-professional-services.html`.
- `_headers` — security headers and a short cache lifetime for HTML. Keep the CSP in step with
  the assets; if a new third-party script is ever added, the CSP must be updated deliberately.
- `404.html` — served automatically for unknown paths. It carries `noindex,follow`.

## Before the first production publish

1. Choose the domain.
2. Replace the `https://example.com` placeholder in every canonical, Open Graph, Twitter,
   JSON-LD, `robots.txt` and `sitemap.xml` reference. Use a find-and-replace over the built HTML,
   then regenerate the sitemap so the loc values match. Do not publish with the placeholder.
3. Add the custom domain in Cloudflare Pages, then point DNS at the Pages project.
4. Confirm `https://<domain>/` serves the homepage over HTTPS with no redirect loop.
5. Check `/guides/vat-rates-explained.html` returns a 301 to `/guides/vat-rates.html`.
6. Confirm `/sitemap.xml` contains 60 URLs and every `<loc>` uses the live domain.

## Post-launch checks

- Google Search Console: add the domain property, submit `/sitemap.xml`, check the homepage and
  three guide pages for coverage errors.
- Bing Webmaster Tools: import from Search Console or add the sitemap manually.
- Rich results: test the homepage, one guide and one calculator with the Schema Markup Validator.
- Page experience: test the homepage and the bulk calculator on a throttled mobile connection.
- Accessibility: keyboard through the calculator, the guides filter and the FAQ accordion; check
  focus visibility and 200% zoom.
- Security headers: confirm `_headers` is applied (for example with `curl -I`).
- Confirm no cookies are set and no third-party requests appear in the network panel.

## When advertising or analytics is added

This is a release, not a toggle:

1. Add the consent banner/CMP before any ad or analytics script loads.
2. Update the CSP in `_headers` for the new origins.
3. Rewrite `privacy-policy.html` and `cookies-policy.html`; remove the "no cookies" claim and the
   "last verified" date until the new state is true.
4. Update the independence and funding section of `editorial-policy.html`.
5. Label affiliate links and keep them out of the editorial body where they would change the
   answer.
6. Re-test consent rejection: no non-essential cookies or requests before consent.

## Rollback

Cloudflare Pages keeps every deployment. Use **Deployments → (previous) → Rollback** to restore
the last good build. Because the repository is the source of truth, also revert the commit that
introduced the problem so the next deploy does not reintroduce it.
