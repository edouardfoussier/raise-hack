// Scenario — synchronized caption banner.
// A fixed top banner that narrates each step of the flow (like subtitles).
// Driven from the recorder via page.evaluate(t => window.__cap(t)).
// Injected before the page loads (addInitScript), re-created on every navigation.
(function () {
  var BAR_ID = "__scn_cap";
  function build() {
    if (!document.body || document.getElementById(BAR_ID)) return document.getElementById(BAR_ID);
    var bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.style.cssText = [
      "position:fixed", "top:0", "left:0", "right:0", "z-index:2147483646",
      "display:flex", "align-items:center", "gap:10px", "justify-content:center",
      "padding:12px 18px", "pointer-events:none",
      "font-family:-apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif",
      "font-size:15px", "font-weight:600", "letter-spacing:.2px",
      "color:#fff7ed", "text-align:center", "line-height:1.3",
      "background:linear-gradient(180deg,rgba(6,11,15,0.97),rgba(6,11,15,0.80))",
      "-webkit-backdrop-filter:blur(6px)", "backdrop-filter:blur(6px)",
      "border-bottom:2px solid #ff5a1f", "box-shadow:0 6px 26px rgba(0,0,0,0.45)",
      "transform:translateY(-120%)", "opacity:0",
      "transition:transform .45s cubic-bezier(.2,.8,.2,1),opacity .3s ease",
    ].join(";");
    var dot = document.createElement("span");
    dot.style.cssText =
      "flex:0 0 auto;width:8px;height:8px;border-radius:50%;background:#ff5a1f;box-shadow:0 0 10px #ff5a1f";
    var txt = document.createElement("span");
    txt.id = BAR_ID + "_txt";
    bar.appendChild(dot);
    bar.appendChild(txt);
    document.body.appendChild(bar);
    return bar;
  }
  function mount() { build(); }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.__cap = function (t) {
    var bar = build();
    if (!bar) return;
    var txt = document.getElementById(BAR_ID + "_txt");
    if (!t) {
      bar.style.transform = "translateY(-120%)";
      bar.style.opacity = "0";
      return;
    }
    if (txt) txt.textContent = t;
    bar.style.transform = "translateY(0)";
    bar.style.opacity = "1";
  };
})();
