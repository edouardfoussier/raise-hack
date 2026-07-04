// Injected cursor overlay — a DOM element that follows Playwright-driven mouse
// events, so recordVideo captures a VISIBLE cursor (Playwright renders none by
// default). Adapted from aslushnikov's installMouseHelper; uses clientX/clientY
// so it doesn't drift on scroll.
(function () {
  if (window.__driftCursorInstalled) return;
  window.__driftCursorInstalled = true;

  function install() {
    if (document.getElementById("__drift-cursor")) return;
    var style = document.createElement("style");
    style.textContent =
      "#__drift-cursor{position:fixed;top:0;left:0;width:24px;height:24px;z-index:2147483647;" +
      "pointer-events:none;margin:-3px 0 0 -3px;transition:transform .06s linear;will-change:transform}" +
      "#__drift-cursor svg{display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}" +
      "#__drift-cursor .ring{position:absolute;top:50%;left:50%;width:36px;height:36px;margin:-18px 0 0 -18px;" +
      "border-radius:50%;border:2px solid rgba(79,70,229,.7);opacity:0;transform:scale(.4)}" +
      "#__drift-cursor.down .ring{animation:driftpulse .45s ease-out}" +
      "@keyframes driftpulse{0%{opacity:.85;transform:scale(.4)}100%{opacity:0;transform:scale(1.15)}}";
    (document.head || document.documentElement).appendChild(style);

    var box = document.createElement("div");
    box.id = "__drift-cursor";
    box.setAttribute("aria-hidden", "true");
    box.innerHTML =
      '<div class="ring"></div>' +
      '<svg width="24" height="24" viewBox="0 0 24 24">' +
      '<path d="M3 2 L3 19 L7.5 14.5 L10.6 21.5 L13.6 20.2 L10.5 13.4 L17 13.4 Z" ' +
      'fill="#ffffff" stroke="#111111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    document.body.appendChild(box);

    document.addEventListener(
      "mousemove",
      function (e) {
        box.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
      },
      true,
    );
    document.addEventListener("mousedown", function () { box.classList.add("down"); }, true);
    document.addEventListener("mouseup", function () { box.classList.remove("down"); }, true);
  }

  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
})();
