/*
  Presenter view for lets-talk-about.
  Shows current slide, next slide preview, notes, timer, and navigation controls.
  Syncs with viewer windows via BroadcastChannel.
*/

import { broadcastState, initSync, requestState } from './sync.js';

const SLIDE_CLASSES = ['far-past', 'past', 'current', 'next', 'far-next'];

let articles = [];
let curSlide = 0;
let currentBuildStep = 0;
let buildItemsPerSlide = [];
let _timerInterval = null;
let startTime = Date.now();
let furthestSlideReached = 0;

/* DOM references */
let currentPane = null;
let nextPane = null;
let notesPanel = null;
let slideCounter = null;
let timerEl = null;
let currentSection = null;
let nextSection = null;
let nextArticles = [];
let currentWrapper = null;
let nextWrapper = null;

/* Slide class management for the current pane */

function applySlideClasses(els, active) {
  for (let i = 0; i < els.length; i++) {
    for (const cls of SLIDE_CLASSES) els[i].classList.remove(cls);
    switch (i - active) {
      case -2:
        els[i].classList.add('far-past');
        break;
      case -1:
        els[i].classList.add('past');
        break;
      case 0:
        els[i].classList.add('current');
        break;
      case 1:
        els[i].classList.add('next');
        break;
      case 2:
        els[i].classList.add('far-next');
        break;
    }
  }
}

/* Process background images */

function processBackgrounds(container) {
  for (const article of container.querySelectorAll('article[data-background]')) {
    const bg = article.getAttribute('data-background');
    article.style.backgroundImage = `url('${bg}')`;
    article.classList.add('image');
    if (article.getAttribute('data-cover') === 'true') {
      article.classList.add('cover');
    }
  }
}

/* Scale a slide wrapper to fit its container pane */

function fitSlideToPane(wrapper, pane) {
  if (!wrapper || !pane) return;
  const pw = pane.clientWidth;
  const ph = pane.clientHeight;
  if (!pw || !ph) return;
  // const scale = Math.min(pw / 1100, ph / 750);
  // wrapper.style.transform = `scale(${scale})`;
}

/* Build system */

function collectBuildItems() {
  buildItemsPerSlide = new Array(articles.length);
  for (let i = 0; i < articles.length; i++) {
    buildItemsPerSlide[i] = [];
    const slide = articles[i];
    let selector = '.build > *';
    if (slide.classList.contains('build')) {
      selector += ':not(:first-child)';
    }
    for (const item of slide.querySelectorAll(selector)) {
      if (item.classList.contains('layout-region')) continue;
      if (item.classList.contains('presenter-notes')) continue;
      if (slide.classList.contains('build') && (item.tagName === 'UL' || item.tagName === 'OL')) {
        for (const li of item.children) {
          li.classList.add('to-build');
          buildItemsPerSlide[i].push(li);
        }
      } else {
        item.classList.add('to-build');
        buildItemsPerSlide[i].push(item);
      }
    }
  }
}

function setBuildStep(slideIndex, step) {
  const items = buildItemsPerSlide[slideIndex];
  if (!items) return;
  for (let i = 0; i < items.length; i++) {
    if (i < step) {
      items[i].classList.remove('to-build');
    } else {
      items[i].classList.add('to-build');
    }
  }
  currentBuildStep = step;
}

function buildNextItem() {
  const items = buildItemsPerSlide[curSlide];
  if (!items || currentBuildStep >= items.length) return false;
  items[currentBuildStep].classList.remove('to-build');
  currentBuildStep++;
  return true;
}

/* Update display */

function updateDisplay() {
  applySlideClasses(articles, curSlide);

  // Update next slide preview
  if (nextArticles.length) {
    const nextIndex = Math.min(curSlide + 1, articles.length - 1);
    applySlideClasses(nextArticles, nextIndex);
  }

  // If returning to a previously visited slide, show all build items
  if (curSlide < furthestSlideReached) {
    const items = buildItemsPerSlide[curSlide];
    if (items) {
      for (const item of items) {
        item.classList.remove('to-build');
      }
      currentBuildStep = items.length;
    }
  }

  // Update notes
  if (notesPanel) {
    const aside = articles[curSlide]?.querySelector('.presenter-notes');
    notesPanel.innerHTML = aside ? aside.innerHTML : '';
  }

  // Update slide counter
  if (slideCounter) {
    slideCounter.textContent = `${curSlide + 1} / ${articles.length}`;
  }

  history.replaceState(null, '', `${location.pathname + location.search}#${curSlide + 1}`);
}

/* Navigation */

function prevSlide() {
  if (curSlide > 0) {
    curSlide--;
    currentBuildStep = 0;
    updateDisplay();
    broadcastState(curSlide, currentBuildStep);
  }
}

function nextSlide() {
  if (buildNextItem()) {
    broadcastState(curSlide, currentBuildStep);
    return;
  }
  if (curSlide < articles.length - 1) {
    curSlide++;
    currentBuildStep = 0;
    // Track the furthest slide we've reached
    if (curSlide > furthestSlideReached) {
      furthestSlideReached = curSlide;
    }
    updateDisplay();
    broadcastState(curSlide, currentBuildStep);
  }
}

/* Sync handler */

function handleSync(slide, buildStep) {
  curSlide = Math.max(0, Math.min(slide, articles.length - 1));
  updateDisplay();
  setBuildStep(curSlide, buildStep);
}

function handleSyncRequestState() {
  broadcastState(curSlide, currentBuildStep);
}

/* Timer */

function formatTime(ms) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function updateTimer() {
  if (timerEl) {
    timerEl.textContent = formatTime(Date.now() - startTime);
  }
}

/* Open viewer window */

function openViewer() {
  const base = location.pathname.replace(/\/?$/, '/');
  const url = `${base.replace(/\/$/, '')}?mode=viewer#${curSlide + 1}`;
  const win = window.open(url, '_blank');
  if (!win) {
    alert('Popup blocked. Please allow popups for this site.');
  }
}

/* Keyboard */

function handleKeyDown(event) {
  switch (event.key) {
    case 'ArrowRight':
    case 'Enter':
    case ' ':
    case 'PageDown':
    case 'ArrowDown':
      nextSlide();
      event.preventDefault();
      break;
    case 'ArrowLeft':
    case 'Backspace':
    case 'PageUp':
    case 'ArrowUp':
      prevSlide();
      event.preventDefault();
      break;
  }
}

/* Mermaid rendering */

let mermaidModule = null;
const renderedMermaidElements = new WeakSet();

async function setupMermaidLazyLoading(container) {
  const els = container.querySelectorAll('pre.mermaid');
  if (!els.length) return;

  // Import mermaid module once if not already loaded
  if (!mermaidModule) {
    const { default: mermaid } = await import('mermaid');
    mermaidModule = mermaid;
    mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
  }

  // Create IntersectionObserver to render diagrams when they become visible
  const observer = new IntersectionObserver(
    async (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && !renderedMermaidElements.has(entry.target)) {
          // Mark as rendered before rendering to avoid duplicate renders
          renderedMermaidElements.add(entry.target);

          try {
            await mermaidModule.run({ nodes: [entry.target] });
          } catch (error) {
            console.error('Failed to render mermaid diagram:', error);
          }

          // Stop observing this element after successful render
          observer.unobserve(entry.target);
        }
      }
    },
    {
      threshold: 0.1,
      // Expand root margin to pre-render adjacent slides
      rootMargin: '100% 0px 100% 0px',
    },
  );

  // Observe all mermaid elements
  for (const el of els) {
    observer.observe(el);
  }
}

/* Initialization */

export function initPresenter() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}

function setup() {
  const slidesSection = document.querySelector('section.slides');
  if (!slidesSection) return;

  // Override viewport for presenter mode (slides use width=1100,height=750)
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute('content', 'width=device-width, initial-scale=1');
  }

  // Get slide number from hash
  const slideNo = parseInt(location.hash.substr(1), 10);
  curSlide = slideNo ? slideNo - 1 : 0;

  // Initialize furthest slide to current slide (in case we start from a hash)
  furthestSlideReached = curSlide;

  // Collect articles from original DOM
  articles = Array.from(slidesSection.querySelectorAll('article'));
  if (!articles.length) return;

  // Process backgrounds on original articles
  processBackgrounds(slidesSection);

  // Clone articles for next-slide preview
  const nextSectionEl = slidesSection.cloneNode(true);
  nextArticles = Array.from(nextSectionEl.querySelectorAll('article'));

  // Build the presenter layout
  document.body.innerHTML = '';
  document.body.classList.add('presenter-mode');

  const layout = document.createElement('div');
  layout.className = 'presenter-layout';

  // Slide panes row
  const slidesRow = document.createElement('div');
  slidesRow.className = 'presenter-slides';

  // Current slide pane
  currentPane = document.createElement('div');
  currentPane.className = 'presenter-pane';
  const currentLabel = document.createElement('div');
  currentLabel.className = 'presenter-pane-label';
  currentLabel.textContent = 'Current';
  const currentInner = document.createElement('div');
  currentInner.className = 'presenter-pane-inner';
  currentWrapper = document.createElement('div');
  currentWrapper.className = 'presenter-slide-wrapper';
  currentSection = slidesSection;
  currentSection.className = 'slides layout-regular template-default';
  currentWrapper.appendChild(currentSection);
  currentInner.appendChild(currentWrapper);
  currentPane.appendChild(currentLabel);
  currentPane.appendChild(currentInner);

  // Next slide pane
  nextPane = document.createElement('div');
  nextPane.className = 'presenter-pane presenter-next';
  const nextLabel = document.createElement('div');
  nextLabel.className = 'presenter-pane-label';
  nextLabel.textContent = 'Next';
  const nextInner = document.createElement('div');
  nextInner.className = 'presenter-pane-inner';
  nextWrapper = document.createElement('div');
  nextWrapper.className = 'presenter-slide-wrapper';
  nextSection = nextSectionEl;
  nextSection.className = 'slides layout-regular template-default';
  nextWrapper.appendChild(nextSection);
  nextInner.appendChild(nextWrapper);
  nextPane.appendChild(nextLabel);
  nextPane.appendChild(nextInner);

  slidesRow.appendChild(currentPane);
  slidesRow.appendChild(nextPane);

  // Notes panel
  notesPanel = document.createElement('div');
  notesPanel.className = 'presenter-notes-panel';

  // Controls bar
  const controls = document.createElement('div');
  controls.className = 'presenter-controls';

  const prevBtn = document.createElement('button');
  prevBtn.textContent = '\u25C0 Prev';
  prevBtn.addEventListener('click', prevSlide);

  slideCounter = document.createElement('span');
  slideCounter.className = 'presenter-slide-counter';

  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next \u25B6';
  nextBtn.addEventListener('click', nextSlide);

  timerEl = document.createElement('span');
  timerEl.className = 'presenter-timer';
  timerEl.textContent = '00:00:00';

  const viewerBtn = document.createElement('button');
  viewerBtn.className = 'presenter-add-viewer';
  viewerBtn.textContent = '+ Viewer';
  viewerBtn.addEventListener('click', openViewer);

  controls.appendChild(prevBtn);
  controls.appendChild(slideCounter);
  controls.appendChild(nextBtn);
  controls.appendChild(timerEl);
  controls.appendChild(viewerBtn);

  layout.appendChild(slidesRow);
  layout.appendChild(notesPanel);
  layout.appendChild(controls);

  document.body.appendChild(layout);

  // Build system
  collectBuildItems();

  // Initial display
  updateDisplay();

  // Scale slides to fit panes
  const ro = new ResizeObserver(() => {
    fitSlideToPane(currentWrapper, currentPane);
    fitSlideToPane(nextWrapper, nextPane);
  });
  ro.observe(currentPane);
  ro.observe(nextPane);
  fitSlideToPane(currentWrapper, currentPane);
  fitSlideToPane(nextWrapper, nextPane);

  // Timer
  startTime = Date.now();
  _timerInterval = setInterval(updateTimer, 1000);

  // Keyboard
  document.addEventListener('keydown', handleKeyDown);

  // Sync
  initSync(handleSync);
  window.addEventListener('sync-request-state', handleSyncRequestState);
  requestState();

  // Mermaid
  setupMermaidLazyLoading(currentSection);
  setupMermaidLazyLoading(nextSection);

  document.body.classList.add('loaded');
}
