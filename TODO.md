# TODO - Leela Enterprises Multi-Page Refactor

## Plan checklist
- [ ] Create 5 semantic pages in `/public`: `index.html`, `products.html`, `tally-on-cloud.html`, `troubleshooting.html`, `pricing.html`
- [ ] Ensure each page has exactly one `<h1>` and includes JSON-LD schema in `<head>`
- [ ] Standardize header/footer nav links across all pages using Tailwind CDN
- [ ] Preserve `leadForm` automation integrity: keep `id="leadForm"`, required input `name` attributes, and real-time output element IDs
- [ ] Refactor calculator UI in `pricing.html` to host the preserved form + existing calculator output boxes
- [ ] Add cross-page routing logic in shared JS: when landing on `pricing.html?solution=...`, auto-select `solutionSelect` and refresh quote
- [x] Update calculator pricing model for new Option 2 rules (cloud/biz/otu/capital) without breaking silver/gold/server
- [x] Update dynamic UI rules: hide locations/users/AWS toggle for `biz`, `otu`, `capital`; relabel sliders accordingly
- [x] Ensure URLs for CTA buttons route correctly to `pricing.html?solution=[product_id]`
- [x] Update/align schema snippets: `LocalBusiness`/`Organization`, `Product`/`AggregateOffer`, `FAQPage`
- [x] Run `node --test` and a quick manual smoke test for pricing routing + form submission

