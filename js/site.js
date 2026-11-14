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

  function playVisible() {
    var hash = currentHash();
    var focus = hash ? document.getElementById(hash) : null;
    var stage = focus && focus.classList && focus.classList.contains("job") ? focus.querySelector("[data-stage]") : null;
    if (!stage) {
      var home = document.getElementById("home");
      stage = home ? home.querySelector("[data-stage]") : null;
    }
    if (stage) play(activeBa(stage));
    var currentHref = "#home";
    if (hash === "services" || (focus && focus.classList && focus.classList.contains("job"))) currentHref = "#services";
    else if (hash === "contact") currentHref = "#contact";
    var links = document.querySelectorAll(".site-nav a");
    for (var i = 0; i < links.length; i++) {
      var on = links[i].getAttribute("href") === currentHref;
      if (on) links[i].setAttribute("aria-current", "page");
      else links[i].removeAttribute("aria-current");
    }
  }

  function revealHash() {
    if ((location.hash || "") === "#window-cleaning") {
      history.replaceState(null, "", "#windows");
    }
    playVisible();
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

  var form = document.getElementById("quote");
  if (!form) return;
  var fields = form.querySelectorAll("input, select, textarea");
  var supportsUserInvalid = false;
  try {
    supportsUserInvalid = CSS.supports("selector(:user-invalid)");
  } catch (err2) {
    supportsUserInvalid = false;
  }

  function idsWithout(el, errorId) {
    return (el.getAttribute("aria-describedby") || "").split(/\s+/).filter(function (id) {
      return id && id !== errorId;
    });
  }

  function sync(el, showFallback) {
    if (el.getAttribute("aria-hidden") === "true") return;
    var invalid = supportsUserInvalid ? el.matches(":user-invalid") : (showFallback && !el.checkValidity());
    if (!supportsUserInvalid) el.classList.toggle("user-invalid-fallback", showFallback && !el.checkValidity());
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
    var errorId = el.getAttribute("data-error");
    if (!errorId) return;
    var ids = idsWithout(el, errorId);
    if (invalid) ids.push(errorId);
    if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
    else el.removeAttribute("aria-describedby");
  }

  for (var f = 0; f < fields.length; f++) {
    (function (el) {
      if (el.getAttribute("aria-hidden") === "true") return;
      el.setAttribute("aria-invalid", "false");
      el.addEventListener("blur", function () { sync(el, true); });
      el.addEventListener("input", function () { sync(el, false); });
      el.addEventListener("change", function () { sync(el, true); });
      el.addEventListener("invalid", function () { sync(el, true); });
    })(fields[f]);
  }

  form.addEventListener("submit", function (event) {
    var trap = form.querySelector("[name=company]");
    if (trap && trap.value) {
      event.preventDefault();
      return;
    }
    if (!form.checkValidity()) return;
    event.preventDefault();
    var data = new FormData(form);
    var body = [
      "Quote request for King Blast",
      "Name: " + data.get("name"),
      "Phone: " + data.get("phone"),
      "Service: " + data.get("service"),
      "Suburb: " + data.get("suburb")
    ].join("\n");
    var status = document.getElementById("quote-status");
    if (status) {
      status.hidden = false;
      status.textContent = "Your text app should open with these details. Send the text to Steve on 0410 786 683.";
    }
    window.location.href = "sms:0410786683?&body=" + encodeURIComponent(body);
  });
})();
