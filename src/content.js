(function runGitHubAccountGuard() {
  "use strict";

  const logic = globalThis.GitHubAccountGuardLogic;
  const STORAGE_KEY = "expectedUsername";
  const HOST_ID = "github-account-guard-root";
  const PAGE_STYLE_ID = "github-account-guard-page-style";
  const HEIGHT_PROPERTY = "--github-account-guard-height";
  const META_SELECTOR = 'meta[name="user-login"]';
  const NAVIGATION_EVENTS = ["turbo:load", "turbo:render", "pjax:end", "pageshow", "popstate"];

  let expectedUsernames = [];
  let currentStateKey = "";
  let evaluationTimer = null;
  let headObserver = null;
  let documentObserver = null;
  let guardResizeObserver = null;

  function scheduleEvaluation() {
    if (evaluationTimer !== null) {
      clearTimeout(evaluationTimer);
    }

    evaluationTimer = setTimeout(() => {
      evaluationTimer = null;
      evaluate();
    }, 75);
  }

  function evaluate() {
    const account = logic.detectAccountFromMetadata(document.querySelector(META_SELECTOR));
    const state = logic.decideGuardState(expectedUsernames, account);
    render(state);
  }

  function stateKey(state) {
    return [
      state.kind,
      (state.expectedUsernames || []).join(","),
      state.actualUsername || "",
      state.reason || ""
    ].join("|");
  }

  function removeGuard() {
    guardResizeObserver?.disconnect();
    guardResizeObserver = null;
    document.getElementById(HOST_ID)?.remove();
    document.getElementById(PAGE_STYLE_ID)?.remove();
    document.documentElement?.style.removeProperty(HEIGHT_PROPERTY);
    currentStateKey = "";
  }

  function ensurePageStyle() {
    if (document.getElementById(PAGE_STYLE_ID) || !document.head) {
      return;
    }

    const style = document.createElement("style");
    style.id = PAGE_STYLE_ID;
    style.textContent = `
      .AppHeader {
        top: var(${HEIGHT_PROPERTY}, 0px) !important;
      }
    `;
    document.head.append(style);
  }

  function trackGuardHeight(bar) {
    const updateHeight = () => {
      const height = Math.ceil(bar.getBoundingClientRect().height);
      document.documentElement.style.setProperty(HEIGHT_PROPERTY, `${height}px`);
    };

    guardResizeObserver?.disconnect();
    guardResizeObserver = new ResizeObserver(updateHeight);
    guardResizeObserver.observe(bar);
    updateHeight();
  }

  function render(state) {
    if (state.kind === "match" || state.kind === "logged-out") {
      removeGuard();
      return;
    }

    ensurePageStyle();
    const nextStateKey = stateKey(state);
    const existingHost = document.getElementById(HOST_ID);
    if (existingHost && currentStateKey === nextStateKey) {
      return;
    }

    guardResizeObserver?.disconnect();
    guardResizeObserver = null;
    existingHost?.remove();
    if (!document.body) {
      return;
    }

    const host = document.createElement("div");
    host.id = HOST_ID;
    host.setAttribute("data-github-account-guard", state.kind);
    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        color-scheme: light;
        display: block;
        position: sticky;
        top: 0;
        width: 100%;
        z-index: 2147483647;
      }

      .guard-bar {
        align-items: center;
        box-sizing: border-box;
        display: flex;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 15px;
        font-weight: 600;
        gap: 12px;
        justify-content: center;
        line-height: 1.4;
        min-height: 48px;
        padding: 10px 16px;
        width: 100%;
      }

      .guard-bar--mismatch {
        background: #b42318;
        border-bottom: 3px solid #7a271a;
        color: #fff;
      }

      .guard-bar--setup {
        background: #9a6700;
        border-bottom: 3px solid #684500;
        color: #fff;
      }

      .guard-bar--caution {
        background: #fff8c5;
        border-bottom: 3px solid #d4a72c;
        color: #3b2300;
      }

      .guard-message {
        margin: 0;
        text-align: center;
      }

      .guard-button {
        background: #fff;
        border: 2px solid currentColor;
        border-radius: 6px;
        color: #24292f;
        cursor: pointer;
        flex: none;
        font: inherit;
        padding: 4px 10px;
      }

      .guard-button:hover {
        background: #f6f8fa;
      }

      .guard-button:focus-visible {
        outline: 3px solid #54aeff;
        outline-offset: 2px;
      }

      @media (max-width: 640px) {
        .guard-bar {
          align-items: stretch;
          flex-direction: column;
          font-size: 14px;
          gap: 6px;
        }
      }
    `;

    const bar = document.createElement("section");
    bar.className = "guard-bar";
    bar.setAttribute("role", "alert");
    bar.setAttribute("aria-live", "assertive");
    bar.setAttribute("aria-atomic", "true");

    const message = document.createElement("p");
    message.className = "guard-message";

    if (state.kind === "mismatch") {
      bar.classList.add("guard-bar--mismatch");
      message.textContent = `GitHub Account Guard: signed in as @${state.actualUsername}.`;
    } else if (state.kind === "setup-needed") {
      bar.classList.add("guard-bar--setup");
      message.textContent = "GitHub Account Guard needs at least one expected GitHub alias.";
      bar.append(message, createButton("Configure aliases", openOptions));
    } else {
      bar.classList.add("guard-bar--caution");
      message.textContent =
        `GitHub Account Guard could not verify the signed-in account. ${state.reason || ""}`.trim();
      bar.append(message, createButton("Retry", scheduleEvaluation));
    }

    if (state.kind === "mismatch") {
      bar.append(message);
    }

    shadow.append(style, bar);
    document.body.prepend(host);
    trackGuardHeight(bar);
    currentStateKey = nextStateKey;
  }

  function createButton(label, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guard-button";
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function openOptions() {
    chrome.runtime.openOptionsPage();
  }

  function observeHead() {
    headObserver?.disconnect();
    if (!document.head) {
      return;
    }

    headObserver = new MutationObserver(scheduleEvaluation);
    headObserver.observe(document.head, {
      attributes: true,
      attributeFilter: ["content"],
      childList: true,
      subtree: true
    });
  }

  function observeDocumentStructure() {
    documentObserver = new MutationObserver((mutations) => {
      const headChanged = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) => node.nodeName === "HEAD") ||
        Array.from(mutation.removedNodes).some((node) => node.nodeName === "HEAD")
      );

      if (headChanged) {
        observeHead();
        scheduleEvaluation();
      }

      const bodyChanged = mutations.some((mutation) =>
        Array.from(mutation.addedNodes).some((node) => node.nodeName === "BODY") ||
        Array.from(mutation.removedNodes).some((node) => node.nodeName === "BODY")
      );

      if (bodyChanged) {
        scheduleEvaluation();
      }
    });

    documentObserver.observe(document.documentElement, { childList: true });
  }

  function start() {
    chrome.storage.sync.get({ [STORAGE_KEY]: "" }, (result) => {
      if (chrome.runtime.lastError) {
        expectedUsernames = [];
      } else {
        expectedUsernames = result[STORAGE_KEY];
      }
      scheduleEvaluation();
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && changes[STORAGE_KEY]) {
        expectedUsernames = changes[STORAGE_KEY].newValue || [];
        scheduleEvaluation();
      }
    });

    NAVIGATION_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, scheduleEvaluation, true);
    });

    observeHead();
    observeDocumentStructure();
    scheduleEvaluation();
  }

  if (document.documentElement) {
    start();
  } else {
    document.addEventListener("readystatechange", start, { once: true });
  }
})();
