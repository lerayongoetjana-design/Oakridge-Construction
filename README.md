# Oakridge Construction

**Building Excellence. Creating Lasting Value.**

A premium, multi-page website for **Oakridge Construction**, a *fictional* South African construction company. Designed and developed by **Launch Point Digital** as a portfolio demonstration.

> Oakridge Construction is not a real company. All names, people, projects, addresses and contact details are invented. The site contains no real testimonials, certifications, awards or project statistics.

## Pages

| Page | File | Highlights |
| --- | --- | --- |
| Home | `index.html` | Cinematic 3D hero, scroll-driven 3D construction sequence, introduction, four service categories, featured projects, Why Choose Oakridge, construction methodology, FAQ, call to action |
| About Us | `about.html` | Story, values, mission and vision, timeline, fictional leadership team, standards |
| Services | `services.html` | Six services, illustrative rand cost calculator, sectors, process, FAQ |
| Projects | `projects.html` | Filterable gallery with lightbox and tilt cards, before-and-after slider, featured concept |
| 3D Studio | `studio.html` | Interactive WebGL viewer: three models, orbit/zoom/pan, hotspots, exploded view, construction-stage slider |
| Our Process | `process.html` | Six-stage delivery process, commitments, FAQ |
| Contact | `contact.html` | Demonstration quotation form, offices, map |

### Services

Residential construction, commercial construction, industrial construction, renovations and refurbishments, property development, and construction project management.

## 3D and motion

- **Three.js / WebGL engine** (`assets/js/oak3d.js`) shared by the home hero, the scroll-driven construction sequence and the 3D Studio.
- **Original GLB models** (`assets/models/`) for residential, commercial and industrial buildings, generated in code by `tools/generate-models.mjs` (about 250 KB in total, no textures). Each model is split into foundations, frame, façade, roof and landscaping, which drives construction progress and the exploded view. Rebuild with `cd tools && npm install && node generate-models.mjs`.
- **Fallback stills** (`assets/img/3d/`) rendered from the same models with `tools/capture.html`. They are shown on devices without WebGL, and while models load.
- **GSAP + ScrollTrigger** for word-by-word headline reveals, the pinned construction sequence, subtle parallax and animated project cards. Also a premium first-visit loader and page transitions.
- **Performance:** the 3D engine and Three.js are lazy-loaded only when a 3D section approaches the viewport. Rendering pauses off-screen, pixel ratio and shadow resolution are capped on touch devices, and models are cached between views.
- **Accessibility:** with `prefers-reduced-motion`, the loader, transitions, parallax and camera motion are switched off, and the construction sequence becomes a slider instead of a scroll pin. The 3D Studio supports touch (one finger to rotate, pinch to zoom, two fingers to pan), keyboard orbit and zoom, and labelled controls.

## Interactive features

- Filterable project gallery with lightbox
- Interactive 3D building viewer with hotspots and exploded view
- Scroll-controlled 3D construction progression
- Before-and-after image slider (mouse, touch and keyboard)
- Illustrative construction cost calculator in South African rand
- Mobile navigation menu
- FAQ accordion
- Quotation form with a demonstration confirmation
- Demonstration WhatsApp enquiry chat
- Responsive layouts for desktop, tablet and mobile

## Privacy

Nothing on this site collects, transmits or stores personal information. The quotation form clears itself on submit, the WhatsApp chat runs entirely in the browser, and no cookies, analytics or browser storage are used.

## Design

| Token | Colour |
| --- | --- |
| Charcoal black | `#1C1C1C` |
| Bronze gold | `#B58B52` |
| Warm ivory | `#F5F2EB` |
| White | `#FFFFFF` |

Typography pairs **Cormorant Garamond** (headings) with **Manrope** (body text). Animations respect `prefers-reduced-motion`.

## Technical notes

- Plain HTML, CSS and JavaScript with relative paths and no build step, so it runs on GitHub Pages as is (`.nojekyll` included). Three.js (0.160.0) and GSAP (3.12.5) load from public CDNs at pinned versions.
- Every page carries `noindex, nofollow` robots metadata, plus a title, description and Open Graph tags.
- SVG favicon, skip link, current-page markers, keyboard support and visible focus states.
- Images use responsive `srcset`, lazy loading and async decoding.

## Image credits

Architectural and portrait photography from [Unsplash](https://unsplash.com), used under the [Unsplash License](https://unsplash.com/license). Images are illustrative and do not depict real Oakridge projects or staff.
