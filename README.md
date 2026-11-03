# TenKraft Media — Creative Production, Marketing & Digital Studio

A responsive, multi-page static website with editorial layout, light color palette, subtle animations, service filters, a community match **concept demo**, and a contact email enquiry flow.

## Website pages

- `index.html` — Home
- `services.html` — Video, audio, marketing, timelapse, drone, events, content, AI, training
- `work.html` — Illustration of media formats (not claimed client projects)
- `training.html` — Training offerings and workshop enquiries
- `community.html` — TenKraft Community concept and interactive partner-type suggestions
- `about.html` — About, mission and values
- `contact.html` — Project and partnership enquiries

## How to preview

Open `index.html` in a modern browser, or run `python -m http.server 8000` in this folder and visit `http://localhost:8000`.

## Before going live

1. Replace sample stock images with TenKraft's own photos/video thumbnails. Their URLs are defined in `assets/site.js` under `IMGS`, and are loaded remotely over HTTPS. When offline, images won't load.
2. Update `CONFIG.contactEmail` at the top of `assets/site.js`. It currently points to a temporary owner email, `directorandysp@gmail.com`.
3. Add your real brand logo, project credits, location, social-media profile URLs, policies and legal information.
4. The contact form opens the visitor's email application; it does **not** post to a server. To collect form submissions automatically, connect a backend or a form service.
5. The Community Matcher suggests professional **categories**, not real members. A live community requires secure authentication, profiles, matching logic, privacy/consent, admin moderation and backend data storage.
6. Drone filming is subject to local legal restrictions and permits.
7. Training dates, prices and customer results are intentionally not invented.

## Design

Light ivory, mint, lilac, light blue and coral; Manrope and DM Sans (Google Fonts), with fallbacks. Mobile navigation, keyboard focus states, image accessibility labels and reduced-motion support.

## Deploy

The folder can be deployed as static files to Cloudflare Pages, GitHub Pages or Netlify. Cloudflare Pages configuration: framework preset **None**, build command **none**, output directory **/** (root directory).

## November 2026 positioning update
- The public-facing brand is **TenKraft Media** only.
- Added **Website & App Development** across Home, Services, Work, Contact and Training (responsive sites, ecommerce, booking systems, dashboards, iOS/Android mobile concepts).
- The former broad Community/matching concept has been replaced with a **marketing partner collaboration** page. TenKraft Media coordinates introductions when a client brief needs complementary skills. No public member accounts, open directories or automated matching are advertised.
- All portfolio visuals remain illustrative until replaced with approved TenKraft projects.