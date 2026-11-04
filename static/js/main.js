/**
 * Common utilities for the TOC Halting Problem Simulator.
 *
 * Everything here is progressive enhancement: pages keep working without it.
 * Motion is opt out through the user's reduced motion preference.
 */

function triggerMathJax() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise().catch(function (err) {
      console.warn("MathJax typeset error:", err);
    });
  }
}

function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

/* ------------------------------------------------------------------
 * Lenis smooth scrolling
 * ------------------------------------------------------------------ */

function initLenisSmoothScroll() {
  if (prefersReducedMotion() || typeof window.Lenis !== "function") {
    return null;
  }

  var scrollableSelectors = [
    "#history-log",
    "#utm-cycles-log",
    ".log-box",
    ".table-wrap",
    ".tape-container",
    ".editor-textarea",
    "textarea",
    "pre",
    "#mobile-nav-drawer"
  ].join(", ");

  var scrollables = document.querySelectorAll(scrollableSelectors);
  Array.prototype.forEach.call(scrollables, function (el) {
    if (!el.hasAttribute("data-lenis-prevent")) {
      el.setAttribute("data-lenis-prevent", "");
    }
  });

  var lenis = new window.Lenis({
    autoRaf: true,
    lerp: 0.1,
    duration: 1.15,
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.2
  });
  window.lenis = lenis;

  var anchorLinks = document.querySelectorAll('a[href^="#"]');
  Array.prototype.forEach.call(anchorLinks, function (link) {
    link.addEventListener("click", function (event) {
      if (prefersReducedMotion()) {
        return;
      }

      var href = link.getAttribute("href");
      if (!href || href === "#") {
        return;
      }

      var target = null;
      try {
        target = document.querySelector(href);
      } catch (err) {
        target = null;
      }
      if (!target) {
        return;
      }

      event.preventDefault();
      lenis.scrollTo(target, { offset: -88 });

      if (href === "#main-content" && target.focus) {
        if (!target.hasAttribute("tabindex")) {
          target.setAttribute("tabindex", "-1");
        }
        target.focus({ preventScroll: true });
      }
    });
  });

  return lenis;
}

/* ------------------------------------------------------------------
 * Mobile navigation drawer
 * ------------------------------------------------------------------ */

function initMobileMenu() {
  var button = document.getElementById("mobile-menu-btn");
  var drawer = document.getElementById("mobile-nav-drawer");
  if (!button || !drawer) {
    return;
  }

  var topLine = button.querySelector(".menu-line-top");
  var bottomLine = button.querySelector(".menu-line-bottom");
  var closeTimer = null;

  // Stagger the links 60ms apart, so six links finish inside 300ms.
  var links = drawer.querySelectorAll("a");
  for (var i = 0; i < links.length; i++) {
    links[i].style.transitionDelay = (i * 60) + "ms";
  }

  function setIcon(open) {
    if (topLine) {
      topLine.style.transform = open ? "translateY(4px) rotate(45deg)" : "";
    }
    if (bottomLine) {
      bottomLine.style.transform = open ? "translateY(-4px) rotate(-45deg)" : "";
    }
  }

  function openDrawer() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }
    drawer.hidden = false;
    // Force a reflow so the opening transition runs from the closed state.
    void drawer.offsetWidth;
    drawer.classList.add("is-open");
    button.setAttribute("aria-expanded", "true");
    button.classList.add("is-open");
    document.body.classList.add("nav-open");
    setIcon(true);
    if (window.lenis && window.lenis.stop) {
      window.lenis.stop();
    }
  }

  function closeDrawer(returnFocus) {
    drawer.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
    button.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    setIcon(false);
    if (window.lenis && window.lenis.start) {
      window.lenis.start();
    }

    function hideDrawer() {
      if (!drawer.classList.contains("is-open")) {
        drawer.hidden = true;
      }
    }

    if (prefersReducedMotion()) {
      hideDrawer();
    } else {
      closeTimer = window.setTimeout(hideDrawer, 340);
    }

    if (returnFocus) {
      button.focus();
    }
  }

  function isOpen() {
    return button.getAttribute("aria-expanded") === "true";
  }

  button.addEventListener("click", function (event) {
    event.preventDefault();
    if (isOpen()) {
      closeDrawer(false);
    } else {
      openDrawer();
    }
  });

  drawer.addEventListener("click", function (event) {
    var target = event.target;
    if (target && target.closest && target.closest("a")) {
      closeDrawer(false);
    }
  });

  document.addEventListener("keydown", function (event) {
    if ((event.key === "Escape" || event.key === "Esc") && isOpen()) {
      closeDrawer(true);
    }
  });

  // Leaving the mobile breakpoint should never strand an open panel.
  if (window.matchMedia) {
    var wideQuery = window.matchMedia("(min-width: 961px)");
    var handleWide = function (event) {
      if (event.matches && isOpen()) {
        closeDrawer(false);
      }
    };
    if (wideQuery.addEventListener) {
      wideQuery.addEventListener("change", handleWide);
    } else if (wideQuery.addListener) {
      wideQuery.addListener(handleWide);
    }
  }
}

/* ------------------------------------------------------------------
 * Section scroll reveals
 * ------------------------------------------------------------------ */

function initRevealSections() {
  var sections = document.querySelectorAll(".reveal-section");
  if (!sections.length) {
    return;
  }

  var observer = null;

  if (!prefersReducedMotion() && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    });
  }

  Array.prototype.forEach.call(sections, function (section) {
    if (observer) {
      section.classList.add("reveal-ready");
      observer.observe(section);
    } else {
      // Reduced motion or no observer support: show the content immediately.
      section.classList.add("is-visible");
    }
  });
}

/* ------------------------------------------------------------------
 * Tagline word by word reveal
 * ------------------------------------------------------------------ */

function wrapTaglineWords(root) {
  var words = [];
  var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement && node.parentElement.closest(".tagline-word")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  var textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  textNodes.forEach(function (node) {
    var fragment = document.createDocumentFragment();
    var parts = node.nodeValue.split(/(\s+)/);

    parts.forEach(function (part) {
      if (!part) {
        return;
      }
      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }
      var span = document.createElement("span");
      span.className = "tagline-word";
      span.textContent = part;
      fragment.appendChild(span);
      words.push(span);
    });

    if (node.parentNode) {
      node.parentNode.replaceChild(fragment, node);
    }
  });

  return words;
}

function revealTaglineWords(words) {
  if (!words.length) {
    return;
  }

  var total = words.length;
  var step = Math.max(18, Math.min(90, 900 / total));
  var start = null;

  function frame(timestamp) {
    if (start === null) {
      start = timestamp;
    }
    var elapsed = timestamp - start;
    var revealed = 0;

    while (revealed < total && elapsed >= revealed * step) {
      words[revealed].classList.add("is-active");
      words[revealed].style.opacity = "1";
      revealed++;
    }

    if (revealed < total) {
      window.requestAnimationFrame(frame);
    }
  }

  window.requestAnimationFrame(frame);
}

function initTaglineReveal() {
  var taglines = document.querySelectorAll("[data-tagline-reveal]");
  if (!taglines.length) {
    return;
  }

  Array.prototype.forEach.call(taglines, function (tagline) {
    var words = wrapTaglineWords(tagline);
    if (!words.length) {
      return;
    }

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      words.forEach(function (word) {
        word.classList.add("is-active");
        word.style.opacity = "1";
      });
      return;
    }

    // Start dimmed so the reveal is visible even before stylesheets settle.
    words.forEach(function (word) {
      word.style.opacity = "0.28";
    });

    var started = false;
    var observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !started) {
          started = true;
          obs.disconnect();
          revealTaglineWords(words);
        }
      });
    }, {
      threshold: 0,
      // Trigger once the tagline crosses roughly three quarters of the viewport.
      rootMargin: "0px 0px -25% 0px"
    });

    observer.observe(tagline);
  });
}

/* ------------------------------------------------------------------
 * Inline notices
 * ------------------------------------------------------------------ */

function ensurePageNotice(targetId) {
  var notice = document.getElementById(targetId);
  if (notice) {
    return notice;
  }

  var main = document.getElementById("main-content") || document.querySelector("main");
  notice = document.createElement("div");
  notice.id = targetId;
  notice.className = "inline-notice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.hidden = true;

  if (main) {
    main.insertBefore(notice, main.firstChild);
  } else {
    document.body.appendChild(notice);
  }

  return notice;
}

function noticeIconFor(type) {
  switch (type) {
    case "success":
      return "ph-check-circle";
    case "warning":
      return "ph-warning";
    case "info":
      return "ph-info";
    default:
      return "ph-x-circle";
  }
}

function dismissNotice(notice) {
  if (!notice) {
    return;
  }
  notice.classList.remove("is-visible");

  function hide() {
    if (!notice.classList.contains("is-visible")) {
      notice.hidden = true;
    }
  }

  if (prefersReducedMotion()) {
    hide();
  } else {
    window.setTimeout(hide, 260);
  }
}

function showInlineNotice(message, type, targetId) {
  var noticeType = type || "error";
  var allowed = ["success", "warning", "info", "error"];
  if (allowed.indexOf(noticeType) === -1) {
    noticeType = "error";
  }

  var notice = ensurePageNotice(targetId || "page-notice");
  var text = message == null ? "" : String(message);

  notice.className = "inline-notice notice-" + noticeType;
  notice.hidden = false;

  var icon = document.createElement("i");
  icon.className = "ph " + noticeIconFor(noticeType) + " notice-icon";
  icon.setAttribute("aria-hidden", "true");

  var body = document.createElement("p");
  body.className = "notice-message body-5";
  body.textContent = text;

  var dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "notice-dismiss";
  dismiss.setAttribute("aria-label", "Dismiss notice");
  dismiss.innerHTML = '<i class="ph ph-x" aria-hidden="true"></i>';
  dismiss.addEventListener("click", function () {
    dismissNotice(notice);
  });

  notice.replaceChildren(icon, body, dismiss);

  window.requestAnimationFrame(function () {
    notice.classList.add("is-visible");

    var rect = notice.getBoundingClientRect();
    var offscreen = rect.top < 0 || rect.bottom > window.innerHeight;
    if (offscreen) {
      if (window.lenis && typeof window.lenis.scrollTo === "function") {
        window.lenis.scrollTo(notice, { offset: -96 });
      } else if (notice.scrollIntoView) {
        notice.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "center"
        });
      }
    }
  });

  return notice;
}

window.showInlineNotice = showInlineNotice;

/* ------------------------------------------------------------------
 * Boot
 * ------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", function () {
  initMobileMenu();
  initLenisSmoothScroll();
  initRevealSections();
  initTaglineReveal();
  triggerMathJax();
});
