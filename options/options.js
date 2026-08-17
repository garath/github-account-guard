(function runOptionsPage() {
  "use strict";

  const logic = globalThis.GitHubAccountGuardLogic;
  const STORAGE_KEY = "expectedUsername";
  const form = document.getElementById("account-form");
  const input = document.getElementById("expected-username");
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

    input.value = result[STORAGE_KEY];
    input.focus();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const validation = logic.validateUsername(input.value);

    if (!validation.valid) {
      input.setAttribute("aria-invalid", "true");
      setStatus(validation.error, "error");
      input.focus();
      return;
    }

    input.removeAttribute("aria-invalid");
    input.value = validation.username;
    chrome.storage.sync.set({ [STORAGE_KEY]: validation.username }, () => {
      if (chrome.runtime.lastError) {
        setStatus(`Could not save the username: ${chrome.runtime.lastError.message}`, "error");
        return;
      }

      setStatus(`Saved @${validation.username} as the expected account.`, "success");
    });
  });
})();
