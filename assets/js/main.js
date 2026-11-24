/* Oakridge Construction — interactions */
(function () {
  "use strict";

  var root = document.documentElement;
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
    if (menu) menu.setAttribute("aria-hidden", String(!open));
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
    if (e.key === "Escape" && body.classList.contains("nav-open")) setMenu(false);
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

  /* Animated counters ---------------------------------------------------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var duration = 2000;
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

  /* Testimonials --------------------------------------------------------- */
  var slider = document.querySelector("[data-testimonials]");
  if (slider) {
    var slides = slider.querySelectorAll(".testimonial");
    var current = slider.parentElement.querySelector("[data-t-current]");
    var index = 0;
    var timer;
    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) {
        s.classList.toggle("is-active", n === index);
        s.setAttribute("aria-hidden", String(n !== index));
      });
      if (current) current.textContent = String(index + 1).padStart(2, "0");
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { show(index + 1); }, 7000);
    }
    var prev = slider.parentElement.querySelector("[data-t-prev]");
    var next = slider.parentElement.querySelector("[data-t-next]");
    if (prev) prev.addEventListener("click", function () { show(index - 1); restart(); });
    if (next) next.addEventListener("click", function () { show(index + 1); restart(); });
    show(0);
    restart();
  }

  /* Project filters ------------------------------------------------------ */
  var filterBtns = document.querySelectorAll("[data-filter]");
  var cards = document.querySelectorAll("[data-category]");
  if (filterBtns.length && cards.length) {
    filterBtns.forEach(function (btn) {
      var f = btn.getAttribute("data-filter");
      var count = f === "all" ? cards.length : document.querySelectorAll('[data-category="' + f + '"]').length;
      var sup = document.createElement("sup");
      sup.textContent = count;
      btn.appendChild(sup);

      btn.addEventListener("click", function () {
        filterBtns.forEach(function (b) {
          b.classList.toggle("is-active", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
        cards.forEach(function (card) {
          var match = f === "all" || card.getAttribute("data-category") === f;
          if (match) {
            card.classList.remove("is-hidden");
            card.style.opacity = "0";
            card.style.transform = "translateY(20px)";
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                card.style.opacity = "";
                card.style.transform = "";
              });
            });
          } else {
            card.classList.add("is-hidden");
          }
        });
      });
    });
  }

  /* Contact form --------------------------------------------------------- */
  var form = document.querySelector("[data-contact-form]");
  if (form) {
    var success = document.querySelector(".form-success");
    var rules = {
      name: function (v) { return v.trim().length >= 2 || "Please enter your full name."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email address."; },
      phone: function (v) { return v.trim() === "" || /^[+\d][\d\s()-]{7,}$/.test(v.trim()) || "Please enter a valid phone number."; },
      service: function (v) { return v !== "" || "Please choose a project type."; },
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
      var fields = form.querySelectorAll("input, select, textarea");
      var firstBad = null;
      fields.forEach(function (f) { if (!validate(f) && !firstBad) firstBad = f; });
      if (firstBad) { firstBad.focus(); return; }
      form.style.display = "none";
      if (success) {
        success.classList.add("is-visible");
        success.setAttribute("tabindex", "-1");
        success.focus();
      }
    });
  }

  /* Footer year ---------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  root.classList.add("js-ready");
})();
