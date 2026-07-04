// Injected synthetic iOS keyboard — slides up when a text field is focused,
// down when it blurs. Purely cosmetic (Playwright types via key events); this
// just makes mobile-flow videos look like a real phone.
(function () {
  if (window.__driftKbInstalled) return;
  window.__driftKbInstalled = true;
  var ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  function install() {
    if (document.getElementById("__drift-kb")) return;
    var s = document.createElement("style");
    s.textContent =
      "#__drift-kb{position:fixed;left:0;right:0;bottom:0;z-index:2147483646;background:#d1d5db;padding:6px 3px 10px;transform:translateY(115%);transition:transform .28s cubic-bezier(.2,0,0,1);font-family:-apple-system,system-ui,sans-serif;pointer-events:none;box-shadow:0 -2px 14px rgba(0,0,0,.18)}" +
      "#__drift-kb.up{transform:translateY(0)}" +
      "#__drift-kb .row{display:flex;justify-content:center;gap:5px;margin:4px 3px}" +
      "#__drift-kb .k{flex:1;max-width:34px;height:40px;background:#fff;border-radius:6px;box-shadow:0 1px 0 rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:17px;color:#111}" +
      "#__drift-kb .k.w{max-width:52px;font-size:12px}" +
      "#__drift-kb .k.g{background:#9aa2ad;color:#111}" +
      "#__drift-kb .k.sp{flex:5;max-width:none;font-size:13px;color:#555}";
    (document.head || document.documentElement).appendChild(s);

    var kb = document.createElement("div");
    kb.id = "__drift-kb";
    kb.setAttribute("aria-hidden", "true");
    var html = "";
    ROWS.forEach(function (row, i) {
      html += '<div class="row">';
      if (i === 2) html += '<div class="k g">&#8679;</div>';
      for (var j = 0; j < row.length; j++) html += '<div class="k">' + row[j] + "</div>";
      if (i === 2) html += '<div class="k g">&#9003;</div>';
      html += "</div>";
    });
    html +=
      '<div class="row"><div class="k g w">123</div><div class="k g">&#127760;</div><div class="k sp">space</div><div class="k g w">return</div></div>';
    kb.innerHTML = html;
    document.body.appendChild(kb);

    function isField(el) {
      if (!el) return false;
      if (el.isContentEditable) return true;
      if (el.tagName === "TEXTAREA") return true;
      if (el.tagName === "INPUT") {
        var t = (el.getAttribute("type") || "text").toLowerCase();
        return ["text", "email", "search", "tel", "url", "password", "number", ""].indexOf(t) !== -1;
      }
      return false;
    }
    document.addEventListener("focusin", function (e) { if (isField(e.target)) kb.classList.add("up"); }, true);
    document.addEventListener("focusout", function () {
      setTimeout(function () { if (!isField(document.activeElement)) kb.classList.remove("up"); }, 60);
    }, true);
  }

  if (document.body) install();
  else document.addEventListener("DOMContentLoaded", install);
})();
