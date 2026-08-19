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

  function validateUsernames(value) {
    const values = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/[\n,]/)
        : [];
    const usernames = new Set();

    for (const candidate of values) {
      if (typeof candidate === "string" && !candidate.trim()) {
        continue;
      }

      const validation = validateUsername(candidate);
      if (!validation.valid) {
        return {
          valid: false,
          usernames: [],
          error: validation.error
        };
      }

      usernames.add(validation.username);
    }

    if (usernames.size === 0) {
      return {
        valid: false,
        usernames: [],
        error: "Enter at least one GitHub username."
      };
    }

    return {
      valid: true,
      usernames: Array.from(usernames),
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
    const expectedValidation = validateUsernames(expectedValue);

    if (!expectedValidation.valid) {
      return {
        kind: "setup-needed",
        expectedUsernames: [],
        actualUsername: account && account.username ? account.username : null
      };
    }

    if (!account || account.status === "indeterminate") {
      return {
        kind: "indeterminate",
        expectedUsernames: expectedValidation.usernames,
        actualUsername: null,
        reason: account && account.reason ? account.reason : "GitHub account verification was unavailable."
      };
    }

    if (account.status === "logged-out") {
      return {
        kind: "logged-out",
        expectedUsernames: expectedValidation.usernames,
        actualUsername: null
      };
    }

    if (account.status !== "signed-in" || !account.username) {
      return {
        kind: "indeterminate",
        expectedUsernames: expectedValidation.usernames,
        actualUsername: null,
        reason: "GitHub account verification returned an unknown state."
      };
    }

    const actualUsername = normalizeUsername(account.username);
    if (!expectedValidation.usernames.includes(actualUsername)) {
      return {
        kind: "mismatch",
        expectedUsernames: expectedValidation.usernames,
        actualUsername
      };
    }

    return {
      kind: "match",
      expectedUsernames: expectedValidation.usernames,
      actualUsername
    };
  }

  return {
    USERNAME_PATTERN,
    normalizeUsername,
    validateUsername,
    validateUsernames,
    detectAccountFromMetadata,
    decideGuardState
  };
});
