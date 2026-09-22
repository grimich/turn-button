# Publishing guide

## 1. Publish the public pages

Upload the contents of `site/` to a static HTTPS host. GitHub Pages is sufficient:

1. Create a repository such as `turn-button`.
2. Copy the contents of `site/` into the repository root and push it.
3. In **Settings → Pages**, publish from the default branch root.
4. Confirm that `/privacy-policy.html` and `/support.html` both load over HTTPS.
5. Put those two URLs into the Chrome Web Store Dashboard listing.

`TURN-Button-website.zip` is included beside the extension ZIP for this purpose.

## 2. Submit the extension

1. Open the Chrome Web Store Developer Dashboard.
2. Upload `TURN-Button-1.0.0.zip`.
3. Copy the product text from `STORE_LISTING.md`.
4. Upload the image files in `store-assets/` to the matching image fields.
5. Complete the Privacy tab using `DATA_SAFETY.md`.
6. Use `TEST_INSTRUCTIONS.md` where reviewer guidance is requested.
7. Set the desired distribution, review all fields, then submit.

Before submission, add a real maintainer contact to the public support page if public support will be offered.
