# gregory.work

Marketing site for Gregory — the AI on the cell. Ask it in Excel. It
answers from the file and what is signed, and it never writes the model
itself. Three static pages, no build step:

- `index.html` — the home: the hero, then two doors.
- `cfos/index.html` — `/cfos/`, the Excel add-in for fractional CFOs.
- `startups/index.html` — `/startups/`, the web app for startups (early access).

Every page links `/site.css` and `/site.js`, so styles and motion live in one
place. Paths are absolute (`/media/…`); preview with a server at the repo root
(`python3 -m http.server`), not by opening the file.

**The form** at the bottom of every page (`#contact-form`) posts JSON (name,
email, company, role, note, page) to the URL in its `data-endpoint` attribute
when one is set. Without one it opens the visitor's own email app addressed to
`data-to`, so nothing goes to a third party until an endpoint is chosen.

**Shots.** `media/*.png` are the Excel pane (640×1440, the pane harness in
`gregory-app/gregory`); `media/web/*.png` are the web app on the synthetic demo
company (`make demo-web`). Never a real client's file: this is a public page.

Each page is a dark stage: a display headline, a living aurora, and the
pane floating in it. Emerald is still a signature. Aurora is still Gregory.

Motion has three rules. The colour moves only in the hero (a WebGL canvas of
the pane's four aurora tones, with the old CSS glows when WebGL is
unavailable) and on Gregory's own marks (the ✦, the gate's ring). Every loop
pauses when it scrolls off screen. Under reduced motion, and with no script,
each demo rests on its finished state. The toy numbers in the demos are the
pane harness's own: Inputs!B3 4.99, B4 2.1, B5 12.0%, Cash 66,082 and +120
for 1% on price. The "Enforced in code" terminal names real tests in
`gregory-app/gregory`'s `tests/architecture`. Rename one there, and rename it here.

Served by GitHub Pages at https://gregory.work (custom domain via `CNAME`).

**This repo is the source of truth for the pages.** Edit them here and
push to `main` to deploy. There is no second copy to keep in sync: the product
repo (`gregory-app/gregory`) carries a pointer at `site/README.md`
and nothing else. It held a duplicate of the page until 2026-09-04, which
drifted three commits behind this one before it was removed.
