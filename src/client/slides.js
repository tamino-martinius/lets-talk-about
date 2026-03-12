/*
  lets-talk-about slide engine
  Modernized from Google HTML5 slides template

  Original authors: Luke Mahé, Marcin Wichary, Dominic Mazzoni, Charles Chen
*/

const SLIDE_CLASSES = ["far-past", "past", "current", "next", "far-next"];
const TOUCH_SENSITIVITY = 15;

let slideEls = [];
let curSlide = 0;

let touchStartX = 0;
let touchStartY = 0;
let touchDX = 0;
let touchDY = 0;

/* Slide movement */

function getSlideEl(no) {
  if (no < 0 || no >= slideEls.length) return null;
  return slideEls[no];
}

function updateSlideClass(slideNo, className) {
  const el = getSlideEl(slideNo);
  if (!el) return;

  if (className) {
    el.classList.add(className);
  }

  for (const cls of SLIDE_CLASSES) {
    if (className !== cls) {
      el.classList.remove(cls);
    }
  }
}

function updateHash() {
  location.replace(`#${curSlide + 1}`);
}

function triggerEnterEvent(no) {
  const el = getSlideEl(no);
  if (!el) return;

  const onEnter = el.getAttribute("onslideenter");
  if (onEnter) new Function(onEnter).call(el);

  el.dispatchEvent(
    new CustomEvent("slideenter", {
      bubbles: true,
      detail: { slideNumber: no + 1 },
    }),
  );
}

function triggerLeaveEvent(no) {
  const el = getSlideEl(no);
  if (!el) return;

  const onLeave = el.getAttribute("onslideleave");
  if (onLeave) new Function(onLeave).call(el);

  el.dispatchEvent(
    new CustomEvent("slideleave", {
      bubbles: true,
      detail: { slideNumber: no + 1 },
    }),
  );
}

/* Iframe management */

function disableFrame(frame) {
  frame.src = "about:blank";
}

function enableFrame(frame) {
  const src = frame._src;
  if (frame.src !== src && src !== "about:blank") {
    frame.src = src;
  }
}

function disableSlideFrames(no) {
  const el = getSlideEl(no);
  if (!el) return;
  for (const frame of el.getElementsByTagName("iframe")) {
    disableFrame(frame);
  }
}

function enableSlideFrames(no) {
  const el = getSlideEl(no);
  if (!el) return;
  for (const frame of el.getElementsByTagName("iframe")) {
    enableFrame(frame);
  }
}

function setupFrames() {
  for (const frame of document.querySelectorAll("iframe")) {
    frame._src = frame.src;
    disableFrame(frame);
  }
  enableSlideFrames(curSlide);
  enableSlideFrames(curSlide + 1);
  enableSlideFrames(curSlide + 2);
}

/* Slide updates */

function updateSlides() {
  for (let i = 0; i < slideEls.length; i++) {
    switch (i) {
      case curSlide - 2:
        updateSlideClass(i, "far-past");
        break;
      case curSlide - 1:
        updateSlideClass(i, "past");
        break;
      case curSlide:
        updateSlideClass(i, "current");
        break;
      case curSlide + 1:
        updateSlideClass(i, "next");
        break;
      case curSlide + 2:
        updateSlideClass(i, "far-next");
        break;
      default:
        updateSlideClass(i);
        break;
    }
  }

  triggerLeaveEvent(curSlide - 1);
  triggerEnterEvent(curSlide);

  setTimeout(() => disableSlideFrames(curSlide - 2), 301);

  enableSlideFrames(curSlide - 1);
  enableSlideFrames(curSlide + 2);

  updateHash();
}

/* Build system (progressive reveal) */

function buildNextItem() {
  const toBuild = slideEls[curSlide].querySelectorAll(".to-build");
  if (!toBuild.length) return false;
  toBuild[0].classList.remove("to-build");
  return true;
}

function makeBuildLists() {
  for (let i = curSlide; i < slideEls.length; i++) {
    const slide = slideEls[i];
    let selector = ".build > *";
    if (slide.classList.contains("build")) {
      selector += ":not(:first-child)";
    }
    for (const item of slide.querySelectorAll(selector)) {
      // Skip layout regions — they should always be visible
      if (item.classList.contains("layout-region")) continue;
      // For lists inside .build slides, mark individual items instead of the whole list
      if (
        slide.classList.contains("build") &&
        (item.tagName === "UL" || item.tagName === "OL")
      ) {
        for (const li of item.children) {
          li.classList.add("to-build");
        }
      } else {
        item.classList.add("to-build");
      }
    }
  }
}

/* Navigation */

function prevSlide() {
  if (curSlide > 0) {
    curSlide--;
    updateSlides();
  }
}

function nextSlide() {
  if (buildNextItem()) return;
  if (curSlide < slideEls.length - 1) {
    curSlide++;
    updateSlides();
  }
}

/* Touch events */

function cancelTouch() {
  document.body.removeEventListener("touchmove", handleTouchMove, true);
  document.body.removeEventListener("touchend", handleTouchEnd, true);
}

function handleTouchStart(event) {
  if (event.touches.length === 1) {
    touchDX = 0;
    touchDY = 0;
    touchStartX = event.touches[0].pageX;
    touchStartY = event.touches[0].pageY;
    document.body.addEventListener("touchmove", handleTouchMove, true);
    document.body.addEventListener("touchend", handleTouchEnd, true);
  }
}

function handleTouchMove(event) {
  if (event.touches.length > 1) {
    cancelTouch();
  } else {
    touchDX = event.touches[0].pageX - touchStartX;
    touchDY = event.touches[0].pageY - touchStartY;
  }
}

function handleTouchEnd() {
  const dx = Math.abs(touchDX);
  const dy = Math.abs(touchDY);

  if (dx > TOUCH_SENSITIVITY && dy < (dx * 2) / 3) {
    if (touchDX > 0) {
      prevSlide();
    } else {
      nextSlide();
    }
  }
  cancelTouch();
}

/* Keyboard */

function handleKeyDown(event) {
  switch (event.key) {
    case "ArrowRight":
    case "Enter":
    case " ":
    case "PageDown":
    case "ArrowDown":
      nextSlide();
      event.preventDefault();
      break;

    case "ArrowLeft":
    case "Backspace":
    case "PageUp":
    case "ArrowUp":
      prevSlide();
      event.preventDefault();
      break;
  }
}

/* Interaction setup */

function setupInteraction() {
  // Click areas
  const prevArea = document.createElement("div");
  prevArea.className = "slide-area";
  prevArea.id = "prev-slide-area";
  prevArea.addEventListener("click", (e) => {
    e.stopPropagation();
    prevSlide();
  });
  document.querySelector("section.slides").appendChild(prevArea);

  const nextArea = document.createElement("div");
  nextArea.className = "slide-area";
  nextArea.id = "next-slide-area";
  nextArea.addEventListener("click", (e) => {
    e.stopPropagation();
    nextSlide();
  });
  document.querySelector("section.slides").appendChild(nextArea);

  // Touch
  document.body.addEventListener("touchstart", handleTouchStart, false);

  // Keyboard
  document.addEventListener("keydown", handleKeyDown, false);
}

/* Background images from data attributes */

function processBackgrounds() {
  for (const article of document.querySelectorAll("article[data-background]")) {
    const bg = article.getAttribute("data-background");
    article.style.backgroundImage = `url('${bg}')`;
    article.classList.add("image");
    if (article.getAttribute("data-cover") === "true") {
      article.classList.add("cover");
    }
  }
}

/* Video auto-play/pause via IntersectionObserver */

function setupVideos() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (
          entry.isIntersecting &&
          entry.target.parentElement.classList.contains("current")
        ) {
          entry.target.play();
        } else {
          entry.target.pause();
        }
      }
    },
    { threshold: [0, 1.0] },
  );

  for (const video of document.querySelectorAll("video")) {
    observer.observe(video);
  }
}

/* Mermaid diagrams */

async function renderMermaid() {
  const els = document.querySelectorAll("pre.mermaid");
  if (!els.length) return;
  const themeColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-theme")
    .trim();
  const sectionForegroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--color-section-foreground")
    .trim();
  const { default: mermaid } = await import("mermaid");
  mermaid.initialize({
    startOnLoad: false,
    theme: "neutral",
  });
  await mermaid.run({ nodes: els });
}

/* Hash */

function getCurSlideFromHash() {
  const slideNo = parseInt(location.hash.substr(1));
  curSlide = slideNo ? slideNo - 1 : 0;
}

/* Initialization */

export function init() {
  getCurSlideFromHash();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleDomLoaded);
  } else {
    handleDomLoaded();
  }
}

function handleDomLoaded() {
  slideEls = document.querySelectorAll("section.slides > article");

  processBackgrounds();
  setupFrames();
  setupInteraction();

  updateSlides();
  makeBuildLists();
  setupVideos();
  renderMermaid();

  document.body.classList.add("loaded");
}
