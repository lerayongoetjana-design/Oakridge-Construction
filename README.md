# Oakridge Construction

**Building Excellence. Creating Lasting Value.**

A premium, multi-page website for **Oakridge Construction**, a *fictional* South African construction company. Designed and developed by **Launch Point Digital** as a portfolio demonstration.

> Oakridge Construction is not a real company. All names, people, projects, addresses and contact details are invented. The site contains no real testimonials, certifications, awards or project statistics.

## Pages

| Page | File | Highlights |
| --- | --- | --- |
| Home | `index.html` | Hero: the concept photo rendered in 3D (depth-displaced mesh with camera drift, mouse and scroll parallax; flat photo as fallback), scroll-driven 3D construction sequence, introduction, four service categories, featured project gallery, Why Choose Oakridge, construction methodology, FAQ and call to action |
| About Us | `about.html` | Story, values, mission and vision, timeline, fictional leadership team, standards |
| Services | `services.html` | Six services, illustrative rand cost calculator, sectors, process, FAQ |
| Projects | `projects.html` | Filterable gallery with lightbox and tilt cards, before-and-after slider, featured concept |
| 3D Studio | `studio.html` | Immersive experience of The Sandton Exchange: cinematic intro, camera views, day/night, hotspots, exploded floors, 8-stage construction timeline, material configurator |
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

## 3D Studio: The Sandton Exchange

`assets/js/experience.js` is a dedicated real-time engine for the commercial tower.

- **Model:** `assets/models/commercial.glb` (about 520 KB) is an original, detailed office tower. It has a recessed curtain wall with bronze aluminium mullions, stone spandrels, concrete core and columns, side balconies with glass balustrades, and a double-height lobby with revolving door, canopy and reception. Office furniture and ceiling lights are visible through the glass, along with a podium terrace, three rooftop layouts, a louvred plant enclosure with solar panels, architectural LED lighting, a tower crane and site hoarding.
- **Environment:** `assets/models/environment.glb` (about 180 KB) holds roads with markings, sidewalks, parking bays with instanced cars, landscaped gardens with instanced trees and shrubs, streetlights, benches, a basement ramp, neighbouring buildings and a distant skyline.
- **Rendering:**
  - **Materials:** physically based, with glass transmission on capable devices and reflective glass on phones.
  - **Sky and lighting:** CC0 HDRI skies drive the background, reflections and ambient light.
  - **Shadows and effects:** soft shadows, ambient occlusion (desktop), bloom for illuminated elements, and filmic tone mapping.
  - **Textures:** generated in the browser and mapped in world space.
- **Controls:**
  - **Camera:** orbit, zoom, pan and touch; auto-rotate, fullscreen and reset; six cinematic camera views with curved transitions.
  - **Lighting:** four lighting modes (morning, afternoon, sunset, night).
  - **Information:** eight hotspots with fictional specifications.
  - **Exploded view:** floors separate, can be selected (in the list or by clicking the model) and show a simplified floor plan.
  - **Timeline:** an 8-stage construction timeline with slider, play, pause and reset.
  - **Configurator:** glass, cladding, frames, concrete, exterior lighting, landscaping and rooftop layout.
- **Performance:** lazy-loaded, with meshopt-compressed models, instanced vegetation and vehicles, and adaptive resolution. Interior detail is hidden at long range, phones get lighter shadows and no transmission or AO, and a still render is shown without WebGL.
- **Accessibility:** a skippable intro (skipped automatically with reduced motion), keyboard orbit and zoom, labelled controls, and Escape to close panels.

### Rebuilding the models

```
cd tools && npm install
node generate-exchange.mjs          # writes tools/build/*.glb
npx @gltf-transform/cli meshopt build/commercial.glb ../assets/models/commercial.glb
npx @gltf-transform/cli meshopt build/environment.glb ../assets/models/environment.glb
node generate-models.mjs            # residential + industrial models for the home page
```

Fallback stills in `assets/img/3d/` are rendered from the live models (see `tools/capture.html`).

### Realism assets (CC0, Poly Haven)

- **Skies** (`assets/sky/`): four HDRIs photographed in South Africa (Qwantani and Kloofendal). They light the scene and fill the glass reflections for each lighting mode, with 1K `.hdr` files for lighting and 4K/2K JPEGs for the visible sky.
- **Surfaces** (`assets/textures/`): scanned colour, roughness and normal maps for concrete, board-formed concrete, stone, timber, paving, asphalt, grass and bark, mapped in world space.
- **Licence:** all are CC0 from [polyhaven.com](https://polyhaven.com), with no attribution required (credited here as a courtesy).

### Known limits

- **Reflections:** glass reflects the sky but not neighbouring buildings, because real-time screen-space reflections were left out for performance.
- **Stylised objects:** trees use painted leaf cards, and cars and furniture are original but stylised geometry. Photographic detail would need licensed, professionally modelled assets.

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

The homepage hero (`assets/img/hero-office.jpg`) is an architectural visual concept supplied for this project. Its 3D depth comes from a depth map (`assets/img/hero-office-depth.png`) estimated locally with Depth Anything V2 (see `tools/make-depth.mjs`). It follows the same design direction as the 3D model but is not a rendering of its exact geometry.

Architectural and portrait photography from [Unsplash](https://unsplash.com), used under the [Unsplash License](https://unsplash.com/license). Images are illustrative and do not depict real Oakridge projects or staff.
