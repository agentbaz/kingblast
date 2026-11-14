(function () {
  var reduce = false;
  try {
    reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (err) {
    reduce = false;
  }

  function setPos(ba, pct) {
    pct = Math.max(4, Math.min(96, pct));
    ba.style.setProperty("--pos", pct + "%");
    var range = ba.querySelector(".ba-range");
    if (range) range.value = String(Math.round(pct));
  }

  function play(ba) {
    if (!ba) return;
    ba._token = (ba._token || 0) + 1;
    var token = ba._token;
    if (reduce) {
      setPos(ba, 50);
      return;
    }
    var start = performance.now();
    function frame(now) {
      if (ba._token !== token || ba.dataset.drag === "1") return;
      var t = Math.min(1, (now - start) / 2600);
      var eased = 1 - Math.pow(1 - t, 3);
      setPos(ba, 92 + (14 - 92) * eased);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function activeBa(stage) {
    var slide = stage.querySelector(".slide.is-on .ba");
    return slide || stage.querySelector(".ba");
  }

  function showSlide(stage, index) {
    var slides = stage.querySelectorAll(".slide, .photo");
    if (!slides.length) return;
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;
    for (var i = 0; i < slides.length; i++) slides[i].classList.toggle("is-on", i === index);
    stage.dataset.index = String(index);
    var count = stage.querySelector("[data-count]");
    if (count) count.textContent = (index + 1) + " / " + slides.length;
    play(activeBa(stage));
  }

  var stages = document.querySelectorAll("[data-stage]");
  for (var s = 0; s < stages.length; s++) {
    (function (stage) {
      showSlide(stage, 0);
      var buttons = stage.querySelectorAll("[data-dir]");
      for (var b = 0; b < buttons.length; b++) {
        buttons[b].addEventListener("click", function (event) {
          var dir = Number(event.currentTarget.getAttribute("data-dir"));
          showSlide(stage, Number(stage.dataset.index || 0) + dir);
        });
      }
    })(stages[s]);
  }

  var compares = document.querySelectorAll(".ba");
  for (var c = 0; c < compares.length; c++) {
    (function (ba) {
      var range = ba.querySelector(".ba-range");
      function fromEvent(event) {
        var rect = ba.getBoundingClientRect();
        if (!rect.width) return;
        setPos(ba, ((event.clientX - rect.left) / rect.width) * 100);
      }
      ba.addEventListener("pointerdown", function (event) {
        if (event.target.closest(".stage-nav")) return;
        ba.dataset.drag = "1";
        ba._token = (ba._token || 0) + 1;
        if (ba.setPointerCapture) ba.setPointerCapture(event.pointerId);
        fromEvent(event);
      });
      ba.addEventListener("pointermove", function (event) {
        if (ba.dataset.drag === "1") fromEvent(event);
      });
      function endDrag() {
        delete ba.dataset.drag;
      }
      ba.addEventListener("pointerup", endDrag);
      ba.addEventListener("pointercancel", endDrag);
      if (range) {
        range.addEventListener("input", function () {
          ba.dataset.drag = "1";
          ba._token = (ba._token || 0) + 1;
          setPos(ba, Number(range.value));
        });
        range.addEventListener("change", endDrag);
      }
    })(compares[c]);
  }

  function currentHash() {
    var hash = (location.hash || "").replace("#", "");
    if (hash === "window-cleaning") return "windows";
    return hash;
  }

  function visiblePanel() {
    var hash = currentHash();
    if (hash === "services" || (document.getElementById(hash) && document.getElementById(hash).classList.contains("service"))) {
      return document.getElementById("services");
    }
    var panel = hash ? document.getElementById(hash) : null;
    if (!panel || !panel.classList.contains("panel")) panel = document.getElementById("home");
    return panel;
  }

  function playVisible() {
    var panel = visiblePanel();
    var hash = currentHash();
    var focus = hash ? document.getElementById(hash) : null;
    var stage = focus && focus.classList && focus.classList.contains("service") ? focus.querySelector("[data-stage]") : null;
    if (!stage) stage = panel.querySelector("[data-stage]");
    if (stage) play(activeBa(stage));
    var links = document.querySelectorAll(".site-nav a");
    for (var i = 0; i < links.length; i++) {
      var on = links[i].getAttribute("href") === "#" + panel.id;
      if (on) links[i].setAttribute("aria-current", "page");
      else links[i].removeAttribute("aria-current");
    }
  }

  function revealHash() {
    playVisible();
    var hash = currentHash();
    var target = hash ? document.getElementById(hash) : null;
    var narrow = window.matchMedia("(max-width: 959px)").matches;
    if (target && target.classList.contains("service")) {
      target.scrollIntoView({ block: "start" });
      return;
    }
    var services = document.getElementById("services");
    if (hash === "services" && services) {
      if (narrow) window.scrollTo(0, 0);
      else services.scrollTop = 0;
      return;
    }
    if (narrow) window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", revealHash);
  revealHash();

  var header = document.querySelector(".site-header");
  var inner = header && header.querySelector(".header-bar");
  var menu = document.getElementById("site-menu");
  if (header && inner && menu) {
    var lastWidth = 0;
    var measuring = false;
    function syncNav() {
      if (measuring) return;
      var width = inner.clientWidth;
      var collapsed = !header.classList.contains("is-wide");
      if (collapsed && width > 0 && width <= lastWidth) {
        lastWidth = width;
        return;
      }
      lastWidth = width;
      measuring = true;
      var wasOpen = false;
      try {
        wasOpen = menu.matches(":popover-open");
      } catch (err3) {
        wasOpen = false;
      }
      header.classList.add("is-measuring", "is-wide");
      var gap = parseFloat(window.getComputedStyle(inner).columnGap) || 0;
      var needed = 0;
      var visible = 0;
      var kids = inner.children;
      for (var k = 0; k < kids.length; k++) {
        if (window.getComputedStyle(kids[k]).display === "none") continue;
        needed += kids[k].getBoundingClientRect().width;
        visible++;
      }
      needed += gap * Math.max(0, visible - 1);
      var fits = needed <= inner.clientWidth + 1;
      header.classList.toggle("is-wide", fits);
      if (fits) {
        menu.removeAttribute("popover");
      } else if (Object.prototype.hasOwnProperty.call(HTMLElement.prototype, "popover")) {
        menu.setAttribute("popover", "auto");
        if (wasOpen && menu.showPopover) {
          try {
            menu.showPopover();
          } catch (err4) {
            wasOpen = false;
          }
        }
      }
      requestAnimationFrame(function () {
        header.classList.remove("is-measuring");
        measuring = false;
      });
    }
    menu.addEventListener("click", function (event) {
      if (!event.target.closest("a") || !menu.hidePopover) return;
      try {
        if (menu.matches(":popover-open")) menu.hidePopover();
      } catch (err5) {
        return;
      }
    });
    if (window.ResizeObserver) {
      var navObserver = new ResizeObserver(syncNav);
      navObserver.observe(header);
      navObserver.observe(menu);
    } else {
      window.addEventListener("resize", syncNav);
    }
    syncNav();
  }

  var form = document.getElementById("enquiry");
  if (!form) return;
  var fields = form.querySelectorAll("input, textarea");
  var supportsUserInvalid = false;
  try {
    supportsUserInvalid = CSS.supports("selector(:user-invalid)");
  } catch (err2) {
    supportsUserInvalid = false;
  }

  function sync(el, showFallback) {
    var invalid = supportsUserInvalid ? el.matches(":user-invalid") : !el.checkValidity();
    if (!supportsUserInvalid) el.classList.toggle("user-invalid-fallback", showFallback && invalid);
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  for (var f = 0; f < fields.length; f++) {
    (function (el) {
      el.setAttribute("aria-invalid", "false");
      el.addEventListener("blur", function () { sync(el, true); });
      el.addEventListener("input", function () {
        if (el.checkValidity()) sync(el, false);
      });
      el.addEventListener("invalid", function () { sync(el, true); });
    })(fields[f]);
  }

  form.addEventListener("submit", function (event) {
    if (!form.checkValidity()) return;
    event.preventDefault();
    var data = new FormData(form);
    var body = [
      "First name: " + data.get("given-name"),
      "Last name: " + data.get("family-name"),
      "Email: " + data.get("email"),
      "",
      data.get("comment")
    ].join("\n");
    window.location.href = "mailto:Kingblast@outlook.com?subject=" +
      encodeURIComponent("King Blast cleaning enquiry") +
      "&body=" + encodeURIComponent(body);
  });
})();
