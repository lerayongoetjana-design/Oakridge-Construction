/* Oakridge Construction — interactions
   Fictional portfolio demonstration by Launch Point Digital.
   Nothing on this site collects, transmits or stores personal information. */
(function () {
  "use strict";

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || new URL("assets/js/main.js", document.baseURI).href;
  var body = document.body;
  var html = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) window.gsap.registerPlugin(window.ScrollTrigger);
  function store(fn) { try { return fn(window.sessionStorage); } catch (e) { return null; } }

  /* Premium loader (first page of a session) ----------------------------- */
  var introResolve;
  window.oakIntro = new Promise(function (r) { introResolve = r; });
  (function () {
    var loader = document.querySelector(".loader");
    if (!loader || !html.classList.contains("show-loader")) { introResolve(); return; }
    store(function (s) { s.setItem("oak-visited", "1"); });
    var bar = loader.querySelector(".loader-bar i");
    var pct = loader.querySelector(".loader-pct");
    var t0 = performance.now(), loaded = document.readyState === "complete", shown = 0, done = false;
    window.addEventListener("load", function () { loaded = true; });
    function frame(now) {
      if (done) return;
      var elapsed = now - t0;
      var target = loaded ? 100 : Math.min(90, elapsed / 30);
      shown += (target - shown) * 0.08;
      if (loaded && elapsed > 1400 && shown > 99.2) shown = 100;
      if (elapsed > 4500) shown = 100;
      bar.style.transform = "scaleX(" + shown / 100 + ")";
      pct.textContent = Math.round(shown) + "%";
      if (shown >= 100) { done = true; finish(); return; }
      requestAnimationFrame(frame);
    }
    function finish() {
      html.classList.add("loader-done");
      introResolve();
      setTimeout(function () { loader.remove(); html.classList.remove("show-loader", "loader-done"); }, 1100);
    }
    requestAnimationFrame(frame);
  })();

  /* Page transitions ----------------------------------------------------- */
  if (!reduceMotion) {
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      var url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$|\/$/.test(url.pathname)) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page / hash links
      e.preventDefault();
      store(function (s) { s.setItem("oak-nav", "1"); });
      html.classList.add("is-leaving");
      setTimeout(function () { location.href = url.href; }, 560);
    });
    window.addEventListener("pageshow", function (e) { if (e.persisted) html.classList.remove("is-leaving", "is-entering"); });
  }

  /* Header state + back-to-top ------------------------------------------ */
  var header = document.querySelector(".site-header");
  var toTop = document.querySelector(".to-top");
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 40);
    if (toTop) toTop.classList.toggle("is-visible", y > 700);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* Mobile navigation ---------------------------------------------------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.querySelector(".mobile-menu");
  function setMenu(open) {
    body.classList.toggle("nav-open", open);
    if (toggle) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (menu) {
      menu.setAttribute("aria-hidden", String(!open));
      if (open) {
        menu.removeAttribute("inert");
        var first = menu.querySelector("a");
        if (first) setTimeout(function () { first.focus(); }, 300);
      } else {
        menu.setAttribute("inert", "");
      }
    }
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!body.classList.contains("nav-open"));
    });
  }
  if (menu) {
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && body.classList.contains("nav-open")) {
      setMenu(false);
      if (toggle) toggle.focus();
    }
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1200 && body.classList.contains("nav-open")) setMenu(false);
  });

  /* Reveal on scroll ----------------------------------------------------- */
  var revealEls = document.querySelectorAll(".reveal, .img-reveal, .process-step, [data-count]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        if (el.hasAttribute("data-count")) countUp(el);
        io.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add("is-visible");
      if (el.hasAttribute("data-count")) el.textContent = Number(el.getAttribute("data-count")).toLocaleString("en-ZA");
    });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var duration = 1800;
    var start = null;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(target * eased).toLocaleString("en-ZA");
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* Project filters ------------------------------------------------------ */
  var filterBtns = document.querySelectorAll("[data-filter]");
  var cards = document.querySelectorAll("[data-category]");
  var filterStatus = document.querySelector("[data-filter-status]");
  if (filterBtns.length && cards.length) {
    filterBtns.forEach(function (btn) {
      var f = btn.getAttribute("data-filter");
      var label = btn.textContent.trim();
      var count = f === "all" ? cards.length : document.querySelectorAll('[data-category="' + f + '"]').length;
      var sup = document.createElement("sup");
      sup.textContent = count;
      sup.setAttribute("aria-hidden", "true");
      btn.appendChild(sup);

      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
        var shown = 0;
        cards.forEach(function (card) {
          var match = f === "all" || card.getAttribute("data-category") === f;
          if (match) {
            shown++;
            card.classList.remove("is-hidden");
            card.classList.add("is-visible");
            if (!reduceMotion) {
              card.style.opacity = "0";
              card.style.transform = "translateY(20px)";
              requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                  card.style.opacity = "";
                  card.style.transform = "";
                });
              });
            }
          } else {
            card.classList.add("is-hidden");
          }
        });
        if (filterStatus) {
          filterStatus.textContent = "Showing " + shown + " " + (shown === 1 ? "project" : "projects") +
            (f === "all" ? "" : ": " + label);
        }
      });
    });
  }

  /* Before / after slider ------------------------------------------------ */
  document.querySelectorAll("[data-ba]").forEach(function (ba) {
    var range = ba.querySelector(".ba-range");
    if (!range) return;
    function update() { ba.style.setProperty("--pos", range.value + "%"); }
    range.addEventListener("input", update);
    update();
  });

  /* Cost calculator (illustrative only) ---------------------------------- */
  var calc = document.querySelector("[data-calc]");
  if (calc) {
    // Illustrative rates in rand per square metre: [low, high] by specification.
    var RATES = {
      residential: { label: "Residential Construction", standard: [9500, 12500], premium: [13000, 18500], luxury: [19500, 30000] },
      commercial: { label: "Commercial Construction", standard: [11000, 14500], premium: [15000, 21000], luxury: [22000, 32000] },
      industrial: { label: "Industrial Construction", standard: [5500, 7500], premium: [7500, 10000], luxury: [10000, 13500] },
      renovation: { label: "Renovations & Refurbishments", standard: [4500, 7000], premium: [7000, 11000], luxury: [11000, 18000] },
      development: { label: "Property Development", standard: [10500, 13500], premium: [14000, 19000], luxury: [20000, 28000] }
    };
    var REGION = { gauteng: 1, "western-cape": 1.06, kzn: 0.98, other: 0.95 };
    var FEES = 0.12, EXTERNAL = 0.08, VAT = 0.15;

    var typeEl = calc.querySelector("[name=calc-type]");
    var regionEl = calc.querySelector("[name=calc-region]");
    var areaRange = calc.querySelector("[name=calc-area-range]");
    var areaInput = calc.querySelector("[name=calc-area]");
    var feesEl = calc.querySelector("[name=calc-fees]");
    var extEl = calc.querySelector("[name=calc-external]");
    var vatEl = calc.querySelector("[name=calc-vat]");
    var out = document.querySelector("[data-calc-result]");
    var fmt = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 });
    function money(n) { return fmt.format(Math.round(n / 1000) * 1000); }
    function q(sel) { return out.querySelector(sel); }

    function clampArea(v) {
      var min = +areaInput.min, max = +areaInput.max;
      v = Math.round(+v || min);
      return Math.min(max, Math.max(min, v));
    }
    function setFill() {
      var pct = (areaRange.value - areaRange.min) / (areaRange.max - areaRange.min) * 100;
      areaRange.style.setProperty("--fill", pct + "%");
    }

    function compute() {
      var type = RATES[typeEl.value];
      var spec = (calc.querySelector("[name=calc-spec]:checked") || {}).value || "premium";
      var factor = REGION[regionEl.value] || 1;
      var area = clampArea(areaInput.value);
      var low = type[spec][0] * factor * area;
      var high = type[spec][1] * factor * area;
      var mid = (low + high) / 2;

      var parts = {
        build: mid,
        fees: feesEl.checked ? mid * FEES : 0,
        external: extEl.checked ? mid * EXTERNAL : 0
      };
      parts.vat = vatEl.checked ? (parts.build + parts.fees + parts.external) * VAT : 0;
      var multiplier = (1 + (feesEl.checked ? FEES : 0) + (extEl.checked ? EXTERNAL : 0)) * (vatEl.checked ? 1 + VAT : 1);
      var totalMid = parts.build + parts.fees + parts.external + parts.vat;

      q("[data-out=low]").textContent = money(low * multiplier);
      q("[data-out=high]").textContent = money(high * multiplier);
      q("[data-out=rate]").textContent = fmt.format(Math.round(type[spec][0] * factor / 100) * 100) + " – " +
        fmt.format(Math.round(type[spec][1] * factor / 100) * 100) + " per m² (construction only)";

      ["build", "fees", "external", "vat"].forEach(function (k) {
        var line = q("[data-line=" + k + "]");
        line.classList.toggle("is-off", parts[k] === 0);
        line.querySelector("b").textContent = parts[k] ? money(parts[k]) : "Excluded";
        line.querySelector("i").style.width = (totalMid ? parts[k] / totalMid * 100 : 0) + "%";
      });

      var base = { residential: 5, commercial: 7, industrial: 4, renovation: 2, development: 8 }[typeEl.value];
      var mLow = Math.round(base + Math.sqrt(area) / 7);
      var mHigh = Math.round(mLow * 1.35);
      q("[data-out=programme]").textContent = mLow + "–" + mHigh + " months";
      q("[data-out=area]").textContent = area.toLocaleString("en-ZA") + " m²";
      q("[data-out=quote]").setAttribute("href", "contact.html?service=" + encodeURIComponent(type.label));
    }

    areaRange.addEventListener("input", function () { areaInput.value = areaRange.value; setFill(); compute(); });
    areaInput.addEventListener("input", function () {
      areaRange.value = clampArea(areaInput.value); setFill(); compute();
    });
    areaInput.addEventListener("blur", function () { areaInput.value = clampArea(areaInput.value); });
    calc.addEventListener("change", compute);
    calc.addEventListener("submit", function (e) { e.preventDefault(); });
    setFill();
    compute();
  }

  /* Quotation form (demonstration: nothing is sent or stored) ----------- */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var success = document.querySelector(".form-success");
    var serviceSel = form.querySelector("[name=service]");

    // Pre-select a service passed from the cost calculator (?service=...)
    try {
      var wanted = new URLSearchParams(window.location.search).get("service");
      if (wanted && serviceSel) {
        Array.prototype.forEach.call(serviceSel.options, function (o) {
          if (o.text === wanted) serviceSel.value = o.value || o.text;
        });
      }
    } catch (err) { /* ignore */ }

    var rules = {
      name: function (v) { return v.trim().length >= 2 || "Please enter your full name."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email address."; },
      phone: function (v) { return v.trim() === "" || /^[+\d][\d\s()-]{7,}$/.test(v.trim()) || "Please enter a valid phone number."; },
      service: function (v) { return v !== "" || "Please choose a service."; },
      message: function (v) { return v.trim().length >= 10 || "Please tell us a little more about your project."; }
    };
    function validate(field) {
      var rule = rules[field.name];
      if (!rule) return true;
      var result = rule(field.value);
      var wrap = field.closest(".field");
      var err = wrap && wrap.querySelector(".field-error");
      var ok = result === true;
      if (wrap) wrap.classList.toggle("has-error", !ok);
      if (err) err.textContent = ok ? "" : result;
      field.setAttribute("aria-invalid", String(!ok));
      return ok;
    }
    form.querySelectorAll("input, select, textarea").forEach(function (f) {
      f.addEventListener("blur", function () { validate(f); });
      f.addEventListener("input", function () {
        if (f.closest(".field").classList.contains("has-error")) validate(f);
      });
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var firstBad = null;
      form.querySelectorAll("input, select, textarea").forEach(function (f) {
        if (!validate(f) && !firstBad) firstBad = f;
      });
      if (firstBad) { firstBad.focus(); return; }

      // Demonstration only: clear everything immediately. No data leaves the page.
      form.reset();
      form.hidden = true;
      if (success) {
        var ref = success.querySelector("[data-ref]");
        if (ref) ref.textContent = "Demo reference OAK-" + Math.floor(1000 + Math.random() * 9000);
        success.classList.add("is-visible");
        success.setAttribute("tabindex", "-1");
        success.focus();
      }
    });
    var again = document.querySelector("[data-form-again]");
    if (again) {
      again.addEventListener("click", function () {
        success.classList.remove("is-visible");
        form.hidden = false;
        form.querySelector("input").focus();
      });
    }
  }

  /* WhatsApp enquiry (demonstration: messages are not sent) ------------- */
  var wa = document.querySelector("[data-wa]");
  if (wa) {
    var waToggle = wa.querySelector(".wa-toggle");
    var panel = wa.querySelector(".wa-panel");
    var log = wa.querySelector("[data-wa-log]");
    var waForm = wa.querySelector("[data-wa-form]");
    var waInput = waForm.querySelector("input");
    var waClose = wa.querySelector(".wa-close");

    var REPLIES = {
      quote: "We would be glad to prepare a quotation. In a live deployment, a consultant would ask for your location, project type and approximate size here. For now, try our <a href=\"services.html#calculator\">cost calculator</a> or the <a href=\"contact.html\">quote form</a>.",
      visit: "In a live deployment, this is where a site visit would be arranged with a project consultant. In this demonstration, no booking is made.",
      timeline: "As a general guide, a new home often takes 10 to 18 months and a commercial building 12 to 30 months, depending on scale, design and municipal approvals.",
      offices: "Oakridge is fictional, but its demonstration offices are in Sandton, Cape Town and Umhlanga. See the <a href=\"contact.html\">contact page</a>.",
      fallback: "Thank you for your message. This is a demonstration chat created by Launch Point Digital, so your message has not been sent or stored anywhere."
    };

    function scrollLog() { log.scrollTop = log.scrollHeight; }
    function addOut(text) {
      var m = document.createElement("div");
      m.className = "wa-msg wa-msg--out";
      m.textContent = text; // visitor text is never interpreted as HTML
      log.appendChild(m);
      scrollLog();
    }
    function addIn(html) {
      var t = document.createElement("div");
      t.className = "wa-typing";
      t.setAttribute("aria-label", "Oakridge is typing");
      t.innerHTML = "<i></i><i></i><i></i>";
      log.appendChild(t);
      scrollLog();
      setTimeout(function () {
        t.remove();
        var m = document.createElement("div");
        m.className = "wa-msg wa-msg--in";
        m.innerHTML = html; // fixed copy from REPLIES only
        log.appendChild(m);
        scrollLog();
      }, reduceMotion ? 50 : 900);
    }
    function setWa(open) {
      wa.classList.toggle("is-open", open);
      panel.hidden = !open;
      waToggle.setAttribute("aria-expanded", String(open));
      waToggle.setAttribute("aria-label", open ? "Close WhatsApp enquiry demo" : "Open WhatsApp enquiry demo");
      if (open) waInput.focus();
    }
    waToggle.addEventListener("click", function () { setWa(panel.hidden); });
    waClose.addEventListener("click", function () { setWa(false); waToggle.focus(); });
    wa.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { setWa(false); waToggle.focus(); }
    });
    wa.querySelectorAll("[data-wa-chip]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        addOut(chip.textContent);
        addIn(REPLIES[chip.getAttribute("data-wa-chip")] || REPLIES.fallback);
      });
    });
    waForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = waInput.value.trim();
      if (!text) return;
      addOut(text);
      waInput.value = "";
      addIn(REPLIES.fallback);
    });
  }

  /* 3D engine: lazy-loaded WebGL --------------------------------------- */
  function webglOK() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  var oakEls = document.querySelectorAll("[data-oak3d]");
  var canWebGL = oakEls.length ? webglOK() && "noModule" in HTMLScriptElement.prototype : false;
  if (oakEls.length) {
    if (!canWebGL) {
      oakEls.forEach(function (el) { el.classList.add("is-3d-fallback"); });
    } else {
      var engine = null;
      var loadEngine = function () {
        // Function wrapper keeps older parsers from failing on import().
        if (!engine) engine = new Function("u", "return import(u)")(new URL("oak3d.js", SCRIPT_SRC).href);
        return engine;
      };
      var startOne = function (el) {
        if (el.__oakStarted) return;
        el.__oakStarted = true;
        el.classList.add("is-3d-loading");
        loadEngine().then(function (m) { m.mount(el); }).catch(function (err) {
          el.classList.remove("is-3d-loading");
          el.classList.add("is-3d-fallback");
          if (window.console) console.warn("3D unavailable, showing static image.", err);
        });
      };
      if ("IntersectionObserver" in window) {
        var lazy3d = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { if (en.isIntersecting) { startOne(en.target); lazy3d.unobserve(en.target); } });
        }, { rootMargin: "600px 0px" });
        oakEls.forEach(function (el) { lazy3d.observe(el); });
      } else {
        oakEls.forEach(startOne);
      }
    }
  }

  // Immersive 3D Studio (The Sandton Exchange)
  var xpEl = document.querySelector("[data-xp]");
  if (xpEl) {
    if (!webglOK() || !("noModule" in HTMLScriptElement.prototype)) {
      xpEl.classList.add("is-fallback");
    } else {
      new Function("u", "return import(u)")(new URL("experience.js", SCRIPT_SRC).href)
        .then(function (m) { return m.mount(xpEl); })
        .catch(function (err) {
          xpEl.classList.add("is-fallback");
          if (window.console) console.warn("3D experience unavailable, showing a still image.", err);
        });
    }
  }

  // Homepage hero: the concept photo rendered in 3D (depth-displaced), over the static photo.
  var heroDepth = document.querySelector("[data-depth-hero]");
  if (heroDepth && webglOK() && "noModule" in HTMLScriptElement.prototype) {
    var startDepth = function () {
      new Function("u", "return import(u)")(new URL("hero-depth.js", SCRIPT_SRC).href)
        .then(function (m) { return m.mount(heroDepth); })
        .catch(function (err) { if (window.console) console.warn("3D hero unavailable, keeping the photo.", err); });
    };
    if (document.readyState === "complete") startDepth(); else window.addEventListener("load", startDepth);
  }

  // Static-image fallback still lets visitors switch models.
  document.querySelectorAll("[data-oak3d-section]").forEach(function (sec) {
    var stage = sec.querySelector("[data-oak3d]");
    sec.querySelectorAll("[data-model-tab]").forEach(function (tab) {
      tab.addEventListener("click", function () {
        if (!stage.classList.contains("is-3d-fallback")) return;
        sec.querySelectorAll("[data-model-tab]").forEach(function (t) {
          t.classList.toggle("is-active", t === tab); t.setAttribute("aria-selected", String(t === tab));
        });
        var img = stage.querySelector(".oak3d-fallback");
        if (img && tab.getAttribute("data-fallback")) img.src = tab.getAttribute("data-fallback");
        ["title", "type", "location", "text"].forEach(function (k) {
          var f = sec.querySelector('[data-model-field="' + k + '"]');
          if (f && tab.getAttribute("data-" + k)) f.textContent = tab.getAttribute("data-" + k);
        });
      });
    });
  });

  /* Construction sequence: scroll-scrubbed or manual -------------------- */
  var buildSec = document.querySelector("[data-build-section]");
  if (buildSec) {
    var buildEl = buildSec.querySelector("[data-oak3d]");
    var push = function (p) {
      if (buildEl.__setProgress) buildEl.__setProgress(p); else buildEl.__pendingProgress = p;
    };
    var st = null;
    if (hasGsap && !reduceMotion && canWebGL) {
      st = window.ScrollTrigger.create({
        trigger: buildSec, start: "top top",
        end: function () { return "+=" + Math.round(window.innerHeight * 1.8); },
        pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: function (self) { push(self.progress); }
      });
    } else {
      buildSec.classList.add("is-manual");
    }
    buildSec.querySelectorAll("[data-stage-at]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var at = parseFloat(btn.getAttribute("data-stage-at"));
        if (st) window.scrollTo({ top: st.start + (st.end - st.start) * at, behavior: reduceMotion ? "auto" : "smooth" });
        else push(at);
      });
    });
  }

  /* GSAP: animated typography, parallax, cards ------------------------- */
  function splitWords(el) {
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (tok) {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(tok)); return; }
          var w = document.createElement("span"); w.className = "w";
          var wi = document.createElement("span"); wi.className = "wi"; wi.textContent = tok;
          w.appendChild(wi); frag.appendChild(w);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== "BR") {
        splitWords(node);
      }
    });
    return el.querySelectorAll(".wi");
  }

  if (hasGsap && !reduceMotion) {
    var gsap = window.gsap;

    // Hero headline: word-by-word rise after the loader.
    var heroH1 = document.querySelector(".hero h1");
    if (heroH1) {
      heroH1.removeAttribute("data-hero");
      var hw = splitWords(heroH1);
      gsap.set(hw, { yPercent: 115 });
      window.oakIntro.then(function () {
        gsap.to(hw, { yPercent: 0, duration: 1.4, ease: "expo.out", stagger: 0.07, delay: 0.15 });
      });
    }

    // Section headings
    document.querySelectorAll(".section h2.reveal, .cta h2, .build-copy h2, .studio-panel h1").forEach(function (h) {
      h.classList.remove("reveal");
      var words = splitWords(h);
      gsap.from(words, {
        yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.05,
        scrollTrigger: { trigger: h, start: "top 88%", once: true }
      });
    });

    // Subtle parallax on imagery
    document.querySelectorAll(".split-media .img-reveal img, .service-row-media img, .why-media img").forEach(function (img) {
      img.classList.add("has-parallax");
      gsap.fromTo(img, { yPercent: -6, scale: 1.14 }, {
        yPercent: 6, scale: 1.14, ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
    document.querySelectorAll(".cta-bg, .page-hero .hero-media").forEach(function (el) {
      gsap.fromTo(el, { yPercent: -8 }, {
        yPercent: 8, ease: "none",
        scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    // Animated cards
    var cardEls = document.querySelectorAll(".project-card, .service-card, .project-feature .project, .model-card, .value, .why-item");
    cardEls.forEach(function (c) { c.classList.remove("reveal"); });
    gsap.set(cardEls, { opacity: 0, y: 70, rotateX: 6, transformPerspective: 1000, transformOrigin: "50% 100%" });
    window.ScrollTrigger.batch(cardEls, {
      start: "top 90%", once: true,
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, rotateX: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, clearProps: "transform" });
      }
    });

    // Gentle 3D tilt on project imagery
    if (finePointer) {
      document.querySelectorAll(".project-card-media, .project-feature .project").forEach(function (el) {
        var rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
        var ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
        gsap.set(el, { transformPerspective: 900 });
        el.addEventListener("pointermove", function (e) {
          var r = el.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 6);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 6);
        });
        el.addEventListener("pointerleave", function () { rx(0); ry(0); });
      });
    }

    window.addEventListener("load", function () { window.ScrollTrigger.refresh(); });
  }

  /* Project lightbox ----------------------------------------------------- */
  var lb = document.querySelector("[data-lightbox]");
  if (lb) {
    var lbCards = function () {
      return Array.prototype.filter.call(document.querySelectorAll("[data-category]"), function (c) { return !c.classList.contains("is-hidden"); });
    };
    var lbIndex = 0, lbReturn = null;
    var q = function (s) { return lb.querySelector(s); };
    var fill = function () {
      var list = lbCards(), card = list[lbIndex];
      if (!card) return;
      var im = card.querySelector("img");
      q("[data-lb-img]").src = im.currentSrc.replace(/w=\d+/, "w=1600") || im.src;
      q("[data-lb-img]").alt = im.alt;
      q("[data-lb-title]").textContent = card.querySelector("h3").textContent;
      q("[data-lb-cat]").textContent = card.querySelector(".tag").textContent;
      q("[data-lb-loc]").textContent = card.querySelector(".project-card-meta").textContent;
      q("[data-lb-desc]").textContent = card.querySelector(".project-card-desc").textContent;
      q("[data-lb-count]").textContent = (lbIndex + 1) + " / " + list.length;
      var model = card.getAttribute("data-model"), link = q("[data-lb-3d]");
      link.hidden = !model;
      // The tower has the full 3D Studio; the villa and warehouse live in the home page sequence.
      if (model) link.href = model === "commercial" ? "studio.html" : "index.html#build-title";
    };
    var openLb = function (card, opener) {
      lbIndex = Math.max(0, lbCards().indexOf(card));
      lbReturn = opener;
      fill();
      lb.hidden = false;
      body.classList.add("lb-open");
      q(".lightbox-close").focus();
    };
    var closeLb = function () {
      lb.hidden = true;
      body.classList.remove("lb-open");
      if (lbReturn) lbReturn.focus();
    };
    var step = function (d) { var n = lbCards().length; lbIndex = (lbIndex + d + n) % n; fill(); };
    document.querySelectorAll("[data-lb-open]").forEach(function (b) {
      b.addEventListener("click", function () { openLb(b.closest("[data-category]"), b); });
    });
    lb.querySelectorAll("[data-lb-close]").forEach(function (b) { b.addEventListener("click", closeLb); });
    q("[data-lb-prev]").addEventListener("click", function () { step(-1); });
    q("[data-lb-next]").addEventListener("click", function () { step(1); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeLb();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        var f = lb.querySelectorAll("button:not([hidden]), a[href]:not([hidden])");
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* Footer year ---------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
