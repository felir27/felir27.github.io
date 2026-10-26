/* Felipe Rodriguez - portfolio behaviors (shared by every page) */
(function () {
  "use strict";

  var body = document.body;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Lucide icons ---------- */
  function drawIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", drawIcons);
  } else {
    drawIcons();
  }

  /* ---------- theme toggle (body.light, persisted) ---------- */
  var toggle = document.getElementById("theme-toggle");
  function setPressed() {
    if (toggle) toggle.setAttribute("aria-pressed", body.classList.contains("light") ? "true" : "false");
  }
  setPressed();
  if (toggle) {
    toggle.addEventListener("click", function () {
      body.classList.toggle("light");
      setPressed();
      try {
        localStorage.setItem("theme", body.classList.contains("light") ? "light" : "dark");
      } catch (e) { /* storage unavailable: theme just won't persist */ }
    });
  }

  /* ---------- smooth scroll from [data-target] buttons ---------- */
  function scrollToId(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    if (history.replaceState) history.replaceState(null, "", "#" + id);
  }
  document.querySelectorAll("[data-target]").forEach(function (btn) {
    btn.addEventListener("click", function () { scrollToId(btn.getAttribute("data-target")); });
  });

  /* ---------- typing animation on the hero h1 ---------- */
  var typed = document.getElementById("typed");
  if (typed) {
    var full = typed.getAttribute("data-text") || typed.textContent;
    var h1 = typed.closest("h1");
    if (reduceMotion) {
      typed.textContent = full;
      if (h1) h1.classList.add("done");
    } else {
      typed.textContent = "";
      var i = 0;
      var step = function () {
        i += 1;
        typed.textContent = full.slice(0, i);
        if (i < full.length) {
          setTimeout(step, 95);
        } else if (h1) {
          h1.classList.add("done");
        }
      };
      setTimeout(step, 350);
    }
  }

  /* ---------- bolted joint drawing animation ---------- */
  var joint = document.querySelector(".joint-figure svg");
  if (joint && !reduceMotion) joint.classList.add("anim");

  /* ---------- fade-ins ---------- */
  var fades = document.querySelectorAll(".fade-in");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    fades.forEach(function (el) { io.observe(el); });
  } else {
    fades.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ---------- scroll cue + back to top ---------- */
  var cue = document.querySelector(".scroll-cue");
  var topBtn = document.getElementById("back-to-top");
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    if (cue) cue.classList.toggle("show", y < 80);
    if (topBtn) topBtn.classList.toggle("show", y > 500);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (topBtn) {
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- clickable cards (click + Enter) ---------- */
  document.querySelectorAll("[data-href]").forEach(function (card) {
    var go = function () { window.location.href = card.getAttribute("data-href"); };
    card.addEventListener("click", function (e) {
      if (e.target.closest("a, button")) return; // real links handle themselves
      go();
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target === card) go();
    });
  });

  /* ---------- highlight the nav item for the section in view ---------- */
  var navBtns = document.querySelectorAll("#floating-nav [data-target]");
  if (navBtns.length && "IntersectionObserver" in window) {
    var map = {};
    navBtns.forEach(function (b) { map[b.getAttribute("data-target")] = b; });
    var navIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var b = map[entry.target.id];
        if (b) b.classList.toggle("is-active", entry.isIntersecting);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navIo.observe(s);
    });
  }
})();
