/* global pdfjsLib */
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const state = {
  decks: [],
  filtered: [],
  activeDeck: null,
  pdf: null,
  page: 1,
  rendering: false,
};

const deckList = document.getElementById("deckList");
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const metaLine = document.getElementById("metaLine");
const deckTitle = document.getElementById("deckTitle");
const deckInfo = document.getElementById("deckInfo");
const canvas = document.getElementById("pdfCanvas");
const thumbStrip = document.getElementById("thumbStrip");
const pageLabel = document.getElementById("pageLabel");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const openPdfBtn = document.getElementById("openPdfBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const readerPanel = document.getElementById("readerPanel");

function fileUrl(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function deckText(deck) {
  return `${deck.title} ${deck.category} ${deck.company}`.toLowerCase();
}

function updateFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categorySelect.value;
  state.filtered = state.decks.filter(deck => {
    const matchesCategory = !category || deck.category === category;
    const matchesQuery = !query || deckText(deck).includes(query);
    return matchesCategory && matchesQuery;
  });
  renderDeckList();
}

function renderDeckList() {
  deckList.innerHTML = "";
  state.filtered.forEach(deck => {
    const card = document.createElement("article");
    card.className = `deck-card${state.activeDeck?.id === deck.id ? " active" : ""}`;
    card.innerHTML = `
      <div class="cover"><canvas data-cover="${deck.id}"></canvas></div>
      <div>
        <div class="deck-title">${deck.title}</div>
        <div class="deck-meta">
          <span class="tag">${deck.category}</span>
          ${deck.company ? `<span class="tag">${deck.company}</span>` : ""}
          <br>${deck.pages || "-"} 页 · ${deck.sizeMB} MB · ${deck.modified}
        </div>
      </div>`;
    card.addEventListener("click", () => openDeck(deck));
    deckList.appendChild(card);
    renderCover(deck, card.querySelector("canvas"));
  });
}

async function renderCover(deck, coverCanvas) {
  if (!coverCanvas || coverCanvas.dataset.done) return;
  coverCanvas.dataset.done = "1";
  try {
    const pdf = await pdfjsLib.getDocument(fileUrl(deck.pdf)).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.18 });
    coverCanvas.width = viewport.width;
    coverCanvas.height = viewport.height;
    await page.render({ canvasContext: coverCanvas.getContext("2d"), viewport }).promise;
  } catch {
    coverCanvas.removeAttribute("data-done");
  }
}

async function openDeck(deck) {
  state.activeDeck = deck;
  state.page = 1;
  state.pdf = await pdfjsLib.getDocument(fileUrl(deck.pdf)).promise;
  deckTitle.textContent = deck.title;
  deckInfo.textContent = `${deck.category}${deck.company ? " / " + deck.company : ""} · ${state.pdf.numPages} 页 · ${deck.sizeMB} MB`;
  renderDeckList();
  await renderPage(1);
  renderThumbs();
}

async function renderPage(pageNumber) {
  if (!state.pdf || state.rendering) return;
  state.rendering = true;
  state.page = Math.min(Math.max(pageNumber, 1), state.pdf.numPages);
  const page = await state.pdf.getPage(state.page);
  const container = document.querySelector(".canvas-wrap");
  const baseViewport = page.getViewport({ scale: 1 });
  const maxWidth = Math.max(320, container.clientWidth - 42);
  const maxHeight = Math.max(320, container.clientHeight - 42);
  const scale = Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height, 1.65);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  pageLabel.textContent = `${state.page} / ${state.pdf.numPages}`;
  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= state.pdf.numPages;
  document.querySelectorAll(".thumb").forEach(el => el.classList.toggle("active", Number(el.dataset.page) === state.page));
  state.rendering = false;
}

async function renderThumbs() {
  thumbStrip.innerHTML = "";
  const maxThumbs = Math.min(state.pdf.numPages, 80);
  for (let i = 1; i <= maxThumbs; i += 1) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `thumb${i === state.page ? " active" : ""}`;
    item.dataset.page = String(i);
    const thumbCanvas = document.createElement("canvas");
    item.appendChild(thumbCanvas);
    item.addEventListener("click", () => renderPage(i));
    thumbStrip.appendChild(item);
    renderThumb(i, thumbCanvas);
  }
}

async function renderThumb(pageNumber, thumbCanvas) {
  const page = await state.pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 0.16 });
  thumbCanvas.width = viewport.width;
  thumbCanvas.height = viewport.height;
  await page.render({ canvasContext: thumbCanvas.getContext("2d"), viewport }).promise;
}

prevBtn.addEventListener("click", () => renderPage(state.page - 1));
nextBtn.addEventListener("click", () => renderPage(state.page + 1));
searchInput.addEventListener("input", updateFilters);
categorySelect.addEventListener("change", updateFilters);
openPdfBtn.addEventListener("click", () => {
  if (state.activeDeck) window.open(fileUrl(state.activeDeck.pdf), "_blank", "noopener");
});
fullscreenBtn.addEventListener("click", () => {
  if (readerPanel.requestFullscreen) readerPanel.requestFullscreen();
});
window.addEventListener("resize", () => {
  if (state.pdf) renderPage(state.page);
});

async function init() {
  const res = await fetch("data/presentations.json");
  const data = await res.json();
  state.decks = data.presentations || [];
  state.filtered = state.decks;
  metaLine.textContent = `${data.count} 份 PDF · 最近生成：${data.generatedAt}`;
  const categories = [...new Set(state.decks.map(deck => deck.category))].sort();
  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
  renderDeckList();
  if (state.decks[0]) openDeck(state.decks[0]);
}

init().catch(err => {
  metaLine.textContent = `读取失败：${err.message}`;
});
