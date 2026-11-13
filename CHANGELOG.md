# Changelog

## 1.0.1 — 2026-11-13

- Fixed Vercel function cold-start failures by removing extensionless local imports from API routes; every endpoint is now self-contained apart from Node built-ins.
- Retained API request validation, no-store headers, upload size cap, and per-instance rate guard.

## 1.0.0 — 2026-11-13

- Promoted the project from `1.0.0-beta.1` to the Vercel-ready `v1.0.0` release.
- Added Vercel Functions for measured public-IP, app latency, download, and upload endpoints.
- Added bounded transfers and upload request limits/rate guard; documented Vercel Firewall rate limiting for a global limit.
- Removed fabricated IP, location, ping, speed, and rolling-telemetry fallbacks; failures now show unavailable/error states.
- Marked Android controls and interface/MAC values as UI sample data; removed third-party IP/geolocation lookups and STUN-server calls.
- Added HTTP-probe and browser capability/privacy disclosures; clarified that web pages cannot change device network settings.
- Improved subnet/host validation, cancellation, clipboard error handling, and tests.
- Updated Node.js requirement and Vercel deployment instructions; removed unused packages and stale project ZIP download UI.

## 1.0.0-beta.1 — 2026-11-13

- Start of the NetPulse 1.0 release-candidate work.
- Priorities: truthful network readings, Vercel production APIs, privacy and browser-capability disclosures, input validation, test coverage, and deployment hardening.
