# NetPulse — Network Diagnostics Web App

**Release:** 1.0.1 (patch to the original v1.0.0 release; beta work began at `1.0.0-beta.1`)  
**Platform:** Responsive browser app, deployable to Vercel. The Android-style frame and system controls are UI previews, not native Android controls.

NetPulse reports the public IP observed by its own server, attempts a best-effort local IPv4 candidate lookup where the browser allows it, calculates IPv4 subnets, and measures HTTP latency and transfer throughput to the deployed app endpoints.

## What the browser can and cannot report

- Public IP: returned by `/api/my-ip`; no third-party geolocation service is used. Your hosting provider necessarily receives the request IP. ISP, ASN, and geographic location are intentionally not guessed or displayed.
- Local IP: best-effort WebRTC host-candidate detection with no external STUN server. Browsers may hide local candidates, so “Unavailable” is a valid result.
- Connection type, estimated downlink, and RTT: shown only when the browser exposes the Network Information API. Support varies by browser.
- MAC addresses, Wi-Fi SSID/BSSID, signal strength, gateway, and Android radio controls: browsers cannot access or change these device-level details. The interface/MAC cards and quick settings are clearly marked sample UI profiles only.
- Latency values are HTTP request timings, not ICMP ping. The target-host tool is an HTTP(S) browser probe and can be affected by CORS, browser policy, DNS, and the target server.
- Speed tests measure transfers between your browser and this app’s Vercel endpoints; they are not an independent ISP speed-test network. A run is capped at 24 MiB downloaded and 5 MiB uploaded. The upload endpoint accepts at most 256 KiB per request and applies a best-effort per-instance limit of 30 requests per minute.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm 9+

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Checks

```bash
npm run lint   # TypeScript check
npm test       # Vitest unit tests
npm run build  # Production Vite build
```

## Deploy to Vercel

1. Import the project/repository in Vercel.
2. Keep the project root at the repository root. `vercel.json` configures Vite, `npm ci`, `npm run build`, and `dist` as the static output directory.
3. Deploy. The `api/` directory contains Vercel Node Functions for `/api/ping`, `/api/my-ip`, `/api/speedtest/download`, and `/api/speedtest/upload`.
4. In Vercel Firewall, configure a rate-limit rule for `/api/speedtest/upload`. The in-memory limiter is only a per-warm-instance safeguard; it is not a globally shared quota across serverless instances or regions.

For local development, equivalent routes are served by the Vite plugin in `vite.config.ts`.

## Privacy and operational notes

- NetPulse’s server receives the requester’s IP for the public-IP display and upload rate limiting. It does not store the upload payload; it counts bytes and discards them.
- The app uses no third-party IP geolocation provider. The optional local-IP check creates a local WebRTC peer connection without contacting a STUN server; modern browsers commonly obfuscate local addresses.
- Vercel Functions, bandwidth, and egress can incur account usage. The client and API impose transfer limits, but public deployments should also use Vercel Firewall rate limiting and review Vercel usage.
- Sample adapter/MAC values are fictional preview data and do not represent or modify the visitor’s device.

## Release

See [CHANGELOG.md](CHANGELOG.md). Current patch release: **v1.0.1**.
