# Release checklist

## Package

- [x] Manifest V3
- [x] Localized English and Russian metadata
- [x] One declared content-script host: `https://chatgpt.com/*`
- [x] No optional or broad permissions
- [x] No background worker, storage, analytics, network requests, or remote code
- [x] Offline icon files included in the extension package
- [x] ZIP has `manifest.json` at its root
- [x] Store icon, promotional tile, screenshot, and marquee asset prepared
- [x] Privacy and support static site prepared

## Publisher actions

- [ ] Publish `site/` at a public HTTPS URL.
- [ ] Add a maintainer contact to `site/support.html` if a public contact route is needed.
- [ ] Create or select the Chrome Web Store publisher account.
- [ ] Upload `TURN-Button-1.0.0.zip` in Chrome Web Store Developer Dashboard.
- [ ] Copy the fields from `STORE_LISTING.md`.
- [ ] Upload the images from `store-assets/`.
- [ ] Complete the Privacy tab using `DATA_SAFETY.md`.
- [ ] Use `TEST_INSTRUCTIONS.md` in the reviewer instructions field if Dashboard asks for it.
- [ ] Choose distribution and submit for review.
