(function initializeGuardLogic(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.GitHubAccountGuardLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createGuardLogic() {
  "use strict";

  const USERNAME_PATTERN = /^(?!-)(?!.*--)[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

  function normalizeUsername(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value.trim().replace(/^@/, "").toLowerCase();
  }

  function validateUsername(value) {
    const username = normalizeUsername(value);

    if (!username) {
      return {
        valid: false,
        username: "",
        error: "Enter a GitHub username."
      };
    }

    if (!USERNAME_PATTERN.test(username)) {
      return {
        valid: false,
        username,
        error: "Use 1-39 letters, numbers, or single hyphens; do not start or end with a hyphen."
      };
    }

    return {
      valid: true,
      username,
      error: ""
    };
  }

  function detectAccountFromMetadata(metaElement) {
    if (!metaElement) {
      return {
        status: "indeterminate",
        username: null,
        reason: "GitHub account metadata was not found."
      };
    }

    const rawContent = metaElement.getAttribute("content");
    if (rawContent === null) {
      return {
        status: "indeterminate",
        username: null,
        reason: "GitHub account metadata did not contain a value."
      };
    }

    if (!rawContent.trim()) {
      return {
        status: "logged-out",
        username: null,
        reason: ""
      };
    }

    const validation = validateUsername(rawContent);
    if (!validation.valid) {
      return {
        status: "indeterminate",
        username: null,
        reason: "GitHub account metadata contained an invalid username."
      };
    }

    return {
      status: "signed-in",
      username: validation.username,
      reason: ""
    };
  }

  function decideGuardState(expectedValue, account) {
    const expectedValidation = validateUsername(expectedValue);

    if (!expectedValidation.valid) {
      return {
        kind: "setup-needed",
        expectedUsername: null,
        actualUsername: account && account.username ? account.username : null
      };
    }

    if (!account || account.status === "indeterminate") {
      return {
        kind: "indeterminate",
        expectedUsername: expectedValidation.username,
        actualUsername: null,
        reason: account && account.reason ? account.reason : "GitHub account verification was unavailable."
      };
    }

    if (account.status === "logged-out") {
      return {
        kind: "logged-out",
        expectedUsername: expectedValidation.username,
        actualUsername: null
      };
    }

    if (account.status !== "signed-in" || !account.username) {
      return {
        kind: "indeterminate",
        expectedUsername: expectedValidation.username,
        actualUsername: null,
        reason: "GitHub account verification returned an unknown state."
      };
    }

    const actualUsername = normalizeUsername(account.username);
    if (actualUsername !== expectedValidation.username) {
      return {
        kind: "mismatch",
        expectedUsername: expectedValidation.username,
        actualUsername
      };
    }

    return {
      kind: "match",
      expectedUsername: expectedValidation.username,
      actualUsername
    };
  }

  return {
    USERNAME_PATTERN,
    normalizeUsername,
    validateUsername,
    detectAccountFromMetadata,
    decideGuardState
  };
});
