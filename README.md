# GitHub Account Guard for Microsoft Edge

GitHub Account Guard is a small Manifest V3 extension that warns when
GitHub.com is signed in with an account that is not one of the aliases you expect.
It runs only on `https://github.com/*`.

## Install in Edge

1. Open `edge://extensions` in Microsoft Edge.
2. Turn on **Developer mode**.
3. Select **Load unpacked**.
4. Select this project folder (the folder containing `manifest.json`).
5. Open the extension's **Details**, then select **Extension options**.
6. Enter and save the GitHub aliases you expect to use, one per line.
7. Open or reload `https://github.com` to test it.

After editing the extension's files, use the **Reload** button on
`edge://extensions` before testing again.

## What you will see

- **Red bar:** GitHub is signed in with an unexpected account. The bar names
  the account that is currently signed in.
- **Amber setup bar:** No expected alias is configured. Use its button to
  open the options page.
- **Yellow caution bar:** The extension could not determine the signed-in
  account, so it does not assume the session is safe.
- **No bar:** The signed-in account matches an expected alias, or GitHub's metadata explicitly
  indicates that the browser is logged out.

The sticky warning reserves space above GitHub's interface so it does not cover
the site's menus or controls.

## Permissions, security, and privacy

- **Site access for `https://github.com/*`:** needed to read GitHub's local page
  metadata and display the warning.
- **Storage:** needed to save the expected aliases with Edge extension sync.

The extension does not use GitHub tokens, make network or GitHub API requests,
run remote code, include analytics, or send account information anywhere.
There are no third-party dependencies.

## Known limitation

Account detection relies on GitHub's `meta[name="user-login"]` page metadata.
Standard GitHub usernames and Enterprise Managed User aliases with an underscore
shortcode suffix are supported.
GitHub can change or temporarily omit this metadata. When it is absent or
invalid, the extension displays the yellow verification-failed caution instead
of silently treating the account as correct. GitHub client-side navigation and
metadata changes trigger a fresh check.

## Local validation

With Node.js installed:

```powershell
npm test
npm run check
```

These commands use only Node.js built-in modules.
