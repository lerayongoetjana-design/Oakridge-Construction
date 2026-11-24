/* Oakridge Construction — interactions
   Fictional portfolio demonstration by Launch Point Digital.
   Nothing on this site collects, transmits or stores personal information. */
(function () {
  "use strict";

  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* Footer year ---------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
