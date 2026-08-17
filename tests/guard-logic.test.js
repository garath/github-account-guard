"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeUsername,
  validateUsername,
  detectAccountFromMetadata,
  decideGuardState
} = require("../src/guard-logic.js");

function metadata(content, hasContentAttribute = true) {
  return {
    getAttribute(name) {
      assert.equal(name, "content");
      return hasContentAttribute ? content : null;
    }
  };
}

test("normalizes whitespace, a leading at-sign, and case", () => {
  assert.equal(normalizeUsername("  @Octo-Cat  "), "octo-cat");
});

test("accepts valid GitHub usernames", () => {
  assert.deepEqual(validateUsername("Octo-Cat"), {
    valid: true,
    username: "octo-cat",
    error: ""
  });
  assert.equal(validateUsername("a").valid, true);
  assert.equal(validateUsername("a".repeat(39)).valid, true);
});

test("rejects malformed GitHub usernames", () => {
  ["", "-", "-octocat", "octocat-", "octo--cat", "octo_cat", "a".repeat(40)].forEach((value) => {
    assert.equal(validateUsername(value).valid, false, value);
  });
});

test("detects a signed-in account from GitHub metadata", () => {
  assert.deepEqual(detectAccountFromMetadata(metadata("Octo-Cat")), {
    status: "signed-in",
    username: "octo-cat",
    reason: ""
  });
});

test("treats empty GitHub metadata as logged out", () => {
  assert.deepEqual(detectAccountFromMetadata(metadata("")), {
    status: "logged-out",
    username: null,
    reason: ""
  });
});

test("treats absent or invalid metadata as indeterminate", () => {
  assert.equal(detectAccountFromMetadata(null).status, "indeterminate");
  assert.equal(detectAccountFromMetadata(metadata("", false)).status, "indeterminate");
  assert.equal(detectAccountFromMetadata(metadata("not valid!")).status, "indeterminate");
});

test("requires setup before evaluating account mismatch", () => {
  assert.equal(
    decideGuardState("", { status: "signed-in", username: "octocat" }).kind,
    "setup-needed"
  );
});

test("distinguishes match, mismatch, logged-out, and indeterminate states", () => {
  assert.equal(
    decideGuardState("octocat", { status: "signed-in", username: "OCTOCAT" }).kind,
    "match"
  );

  assert.deepEqual(
    decideGuardState("octocat", { status: "signed-in", username: "hubot" }),
    {
      kind: "mismatch",
      expectedUsername: "octocat",
      actualUsername: "hubot"
    }
  );

  assert.equal(
    decideGuardState("octocat", { status: "logged-out", username: null }).kind,
    "logged-out"
  );

  assert.equal(
    decideGuardState("octocat", {
      status: "indeterminate",
      username: null,
      reason: "Metadata missing."
    }).kind,
    "indeterminate"
  );
});
