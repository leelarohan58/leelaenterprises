# TODO — Leela Enterprises Tally Partner Portal Overhaul

## Step 1 — Calculator dynamic pricing matrix
- [x] Update `/public/app.js` calculator to support `silver|gold|server|cloud|biz|otu|capital`.
- [x] Implement explicit base + multiplier + AWS overhead pricing.
- [x] Keep GST fixed at 18%.
- [x] Verify existing submission automation remains untouched.
- [x] Run `npm test` (pass).

## Step 2 — Split Pages: Products & Knowledge Base (no messy single page)
- [ ] Create/expand separate pages for:
  - Products (catalog)
  - Knowledge Base (troubleshooting + error guide)
- [ ] Update navigation dropdown links to point to new pages.
- [ ] Ensure calculator remains on its own section/page and submit wiring is preserved.
- [ ] Keep alignment clean + mobile-first.

## Step 3 — SEO + schema refinements
- [ ] Ensure each page includes correct JSON-LD scoped markup (FAQPage on FAQ section, Product/AggregateOffer on Products page, etc.).

## Step 4 — Final QA
- [ ] Lighthouse/SEO smoke test.
- [ ] Manual check: pricing updates when switching solutions.
- [ ] `npm test` again after page changes.

