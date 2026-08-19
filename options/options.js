(function runOptionsPage() {
  "use strict";

  const logic = globalThis.GitHubAccountGuardLogic;
  const STORAGE_KEY = "expectedUsername";
  const form = document.getElementById("account-form");
  const input = document.getElementById("expected-usernames");
  const status = document.getElementById("status");

  function setStatus(message, kind) {
    status.textContent = message;
    status.className = `status${kind ? ` status--${kind}` : ""}`;
  }

  chrome.storage.sync.get({ [STORAGE_KEY]: "" }, (result) => {
    if (chrome.runtime.lastError) {
      setStatus(`Could not load the saved username: ${chrome.runtime.lastError.message}`, "error");
      return;
    }

    const savedValue = result[STORAGE_KEY];
    input.value = (Array.isArray(savedValue) ? savedValue : [savedValue])
      .filter(Boolean)
      .join("\n");
    input.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const validation = logic.validateUsernames(input.value);

    if (!validation.valid) {
      input.setAttribute("aria-invalid", "true");
      setStatus(validation.error, "error");
      input.focus();
      return;
    }

    input.removeAttribute("aria-invalid");
    input.value = validation.usernames.join("\n");
    chrome.storage.sync.set({ [STORAGE_KEY]: validation.usernames }, () => {
      if (chrome.runtime.lastError) {
        setStatus(`Could not save the username: ${chrome.runtime.lastError.message}`, "error");
        return;
      }

      const noun = validation.usernames.length === 1 ? "alias" : "aliases";
      setStatus(`Saved ${validation.usernames.length} expected ${noun}.`, "success");
    });
  });
})();
