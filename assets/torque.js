/* Browser port of the Shigley frustum torque-spec model used by Felipe's MATLAB tool.
   Simplified demo: fixed M8 10.9 bolt, fixed Al / CFRP / G10 / CFRP stack with ISO washers. */
(function (root) {
  "use strict";

  var PITCH = { 3: 0.5, 4: 0.7, 5: 0.8, 6: 1, 8: 1.25, 10: 1.5, 12: 1.75, 14: 2, 16: 2, 20: 2.5, 24: 3, 30: 3.5, 36: 4 };

  /* Generic frustum model (SI units). Mirrors the reference implementation step by step. */
  function calc(stack, P, SF, bolt, muHead, muNut, washers, alphaDeg, minF2) {
    alphaDeg = alphaDeg == null ? 30 : alphaDeg;
    minF2 = minF2 || 0;
    var d = bolt.d;
    var dh = bolt.dh != null ? bolt.dh : 1.05 * d;
    var dw = bolt.dw != null ? bolt.dw : 1.5 * d;
    var K = bolt.K != null ? bolt.K : 0.2;
    var ta = Math.tan(alphaDeg * Math.PI / 180);

    var wh = washers && washers.head ? washers.head : null;
    var wn = washers && washers.nut ? washers.nut : null;
    var layers = [];
    if (wh) layers.push({ name: "Head washer", t: wh.t, E: wh.E, hole: wh.ID != null ? wh.ID : dh, OD: wh.OD });
    stack.forEach(function (m) { layers.push({ name: m.name, t: m.t, E: m.E, hole: dh, OD: Infinity }); });
    if (wn) layers.push({ name: "Nut washer", t: wn.t, E: wn.E, hole: wn.ID != null ? wn.ID : dh, OD: wn.OD });

    var L = layers.reduce(function (s, l) { return s + l.t; }, 0);
    var zm = L / 2;
    function wexit(w) { return w ? [w.t, Math.min(dw + 2 * w.t * ta, w.OD)] : [0, dw]; }
    var eh = wexit(wh), en = wexit(wn);
    function cone(z, tw, De) { return z < tw - 1e-12 ? dw + 2 * z * ta : De + 2 * (z - tw) * ta; }

    var slices = [], z = 0;
    layers.forEach(function (l) {
      var zs = z, ze = z + l.t; z = ze;
      if (zs < zm && zm < ze) {
        slices.push({ t: zm - zs, D: cone(zs, eh[0], eh[1]), l: l });
        slices.push({ t: ze - zm, D: cone(L - ze, en[0], en[1]), l: l });
      } else if (ze <= zm) {
        slices.push({ t: l.t, D: cone(zs, eh[0], eh[1]), l: l });
      } else {
        slices.push({ t: l.t, D: cone(L - ze, en[0], en[1]), l: l });
      }
    });

    var inv = 0;
    slices.forEach(function (s) {
      var h = s.l.hole, t = s.t, D = s.D;
      var k = Math.PI * s.l.E * h * ta /
        Math.log(((2 * t * ta + D - h) * (D + h)) / ((2 * t * ta + D + h) * (D - h)));
      inv += 1 / k;
    });
    var km = 1 / inv;

    var p = bolt.p != null ? bolt.p : PITCH[Math.round(d * 1e3)] * 1e-3;
    var At = bolt.At || Math.PI / 4 * Math.pow(d - 0.9382 * p, 2);
    var E = bolt.E != null ? bolt.E : 207e9;
    var Lb = bolt.L;
    var LT = Lb <= 0.125 ? 2 * d + 0.006 : (Lb <= 0.2 ? 2 * d + 0.012 : 2 * d + 0.025);
    var ld = Math.min(Math.max(0, Lb - LT), L);
    var lt = L - ld;
    var Ad = Math.PI * d * d / 4;
    var kb = bolt.kb || Ad * At * E / (Ad * lt + At * ld);
    var C = kb / (kb + km);

    var Px = SF * P[0], Py = SF * P[1], Pz = SF * P[2];
    var V = Math.hypot(Px, Py);
    var Pt = Math.max(0, Pz);
    var dPm = (1 - C) * Pt;
    var mu = Math.min(muHead, muNut);
    var Fsep = dPm;
    var Fslip = mu > 0 ? dPm + V / mu : dPm;
    var F2 = Math.max(Fsep, Fslip, minF2);
    return {
      At: At, kb: kb, km: km, C: C, F2: F2, Fsep: Fsep, Fslip: Fslip,
      T: K * F2 * d, Fb: F2 + C * Pt, Fm: F2 - dPm, L: L, V: V, Pz: Pz
    };
  }

  /* The fixed demo joint (values from the tool's example input file). */
  var STACK = [
    { name: "Al 6061-T6", t: 0.005, E: 69.0e9 },
    { name: "CFRP", t: 0.003, E: 70.0e9 },
    { name: "G10", t: 0.003175, E: 18.6e9 },
    { name: "CFRP", t: 0.003, E: 70.0e9 }
  ];
  var WASHER = { t: 1.6e-3, OD: 16.0e-3, ID: 8.4e-3, E: 200.0e9 };
  var BOLT = { d: 0.008, p: 1.25e-3, E: 207.0e9, L: 0.030, H: 6.8e-3, K: 0.20, dh: 0.0084, dw: 0.0120 };
  var PROOF_LOAD = 30.4e3; // N, M8 class 10.9

  /* Demo entry point. Pz and V are unfactored [N]; mu is used at both interfaces. */
  function demo(Pz, V, SF, mu) {
    var r = calc(STACK, [V, 0, Pz], SF, BOLT, mu, mu, { head: WASHER, nut: WASHER }, 30, 0);
    r.governs = r.Fslip > r.Fsep ? "slip" : "separation";
    r.T_lbfft = r.T * 0.737562;
    r.proofFrac = r.Fb / PROOF_LOAD;
    r.status = r.proofFrac > 1 ? "fail" : (r.proofFrac >= 0.8 ? "warn" : "ok");
    return r;
  }

  var api = { calc: calc, demo: demo, PROOF_LOAD: PROOF_LOAD,
    DEFAULTS: { Pz: 1100, V: Math.hypot(650, 420), SF: 2.0, mu: 0.15 } };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TorqueModel = api;

  /* ---------- UI wiring (only when the demo markup is present) ---------- */
  if (typeof document === "undefined") return;
  function init() {
    var form = document.getElementById("torque-demo");
    if (!form) return;
    var ids = ["pz", "v", "sf", "mu"];
    var el = {};
    ids.forEach(function (id) { el[id] = document.getElementById("in-" + id); });
    function fmt(n, dp) { return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
    function set(id, text) { var n = document.getElementById(id); if (n) n.textContent = text; }

    function update() {
      var Pz = parseFloat(el.pz.value), V = parseFloat(el.v.value);
      var SF = parseFloat(el.sf.value), mu = parseFloat(el.mu.value);
      set("o-pz", fmt(Pz, 0) + " N");
      set("o-v", fmt(V, 0) + " N");
      set("o-sf", fmt(SF, 1));
      set("o-mu", fmt(mu, 2));
      var r = demo(Pz, V, SF, mu);
      set("r-torque", fmt(r.T, 1) + " N·m");
      set("r-torque-imp", fmt(r.T_lbfft, 1) + " lbf·ft");
      set("r-f2", fmt(r.F2 / 1000, 2) + " kN");
      set("r-gov", r.governs === "slip" ? "shear slip governs" : "separation governs");
      set("r-sep", fmt(r.Fsep / 1000, 2) + " kN");
      set("r-slip", fmt(r.Fslip / 1000, 2) + " kN");
      set("r-c", fmt(r.C, 3));
      set("r-km", (r.km / 1e6).toFixed(0) + " MN/m");
      set("r-kb", (r.kb / 1e6).toFixed(0) + " MN/m");
      var pct = r.proofFrac * 100;
      set("r-proof", fmt(pct, 1) + "%");
      set("r-fb", fmt(r.Fb / 1000, 2) + " kN of " + fmt(PROOF_LOAD / 1000, 1) + " kN");
      var box = document.getElementById("res-proof");
      box.classList.remove("status-ok", "status-warn", "status-fail");
      box.classList.add("status-" + r.status);
      set("r-status", r.status === "fail" ? "FAIL (above 100%)" : (r.status === "warn" ? "WARNING (≥ 80%)" : "OK"));
      var bar = document.getElementById("r-bar");
      bar.style.width = Math.min(pct, 100) + "%";
      document.getElementById("res-sep").classList.toggle("gov", r.governs === "separation");
      document.getElementById("res-slip").classList.toggle("gov", r.governs === "slip");
      set("tag-sep", r.governs === "separation" ? "governs" : "");
      set("tag-slip", r.governs === "slip" ? "governs" : "");
      document.querySelectorAll(".gov-tag").forEach(function (t) { t.hidden = !t.textContent; });
    }
    ids.forEach(function (id) { el[id].addEventListener("input", update); });
    var reset = document.getElementById("demo-reset");
    if (reset) reset.addEventListener("click", function () {
      el.pz.value = api.DEFAULTS.Pz; el.v.value = api.DEFAULTS.V.toFixed(2);
      el.sf.value = api.DEFAULTS.SF; el.mu.value = api.DEFAULTS.mu;
      update();
    });
    el.v.value = api.DEFAULTS.V.toFixed(2);
    update();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(this);
