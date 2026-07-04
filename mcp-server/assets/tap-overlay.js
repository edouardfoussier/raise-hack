// Injected TOUCH indicator — a translucent fingertip circle that follows the
// Playwright-driven pointer and ripples teal on tap. For mobile-emulated flows
// (more faithful than a desktop arrow cursor).
(function () {
  if (window.__driftTapInstalled) return;
  window.__driftTapInstalled = true;

  function install() {
    if (document.getElementById("__drift-tap")) return;
    var s = document.createElement("style");
    s.textContent =
      "#__drift-tap{position:fixed;top:0;left:0;width:38px;height:38px;margin:-19px 0 0 -19px;z-index:2147483647;pointer-events:none;transition:transform .06s linear}" +
      "#__drift-tap .dot{width:38px;height:38px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.5),rgba(255,255,255,.12) 62%,transparent 70%);border:1.5px solid rgba(255,255,255,.55);box-shadow:0 1px 4px rgba(0,0,0,.3)}" +
      "#__drift-tap.down .dot{background:radial-gradient(circle,rgba(20,184,166,.55),rgba(20,184,166,.15) 62%,transparent 70%);border-color:rgba(20,184,166,.9)}" +
      "#__drift-tap .ring{position:absolute;top:50%;left:50%;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;border:2px solid rgba(20,184,166,.85);opacity:0}" +
      "#__drift-tap.down .ring{animation:driftTap .5s ease-out}" +
      "@keyframes driftTap{0%{opacity:.85;transform:scale(.4)}100%{opacity:0;transform:scale(2.4)}}";
    (document.head || document.documentElement).appendChild(s);

    var b = document.createElement("div");
    b.id = "__drift-tap";
    b.setAttribute("aria-hidden", "true");
    b.innerHTML = '<div class="ring"></div><div class="dot"></div>';
    document.body.appendChild(b);

    document.addEventListener("mousemove", function (e) {
      b.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
    }, true);
    document.addEventListener("mousedown", function () { b.classList.add("down"); }, true);
    document.addEventListener("mouseup", function () { b.classList.remove("down"); }, true);
  }

  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
})();
