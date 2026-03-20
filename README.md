# VODA Mobile Web App

A mobile-first progressive web app concept for a smart thermos bottle with UV-C purification and water filtration.

## What is included

- Responsive multi-screen mobile web app that adapts from phones to larger tablets and desktops.
- Stateful hydration tracking with refill and drink logging stored in local browser storage.
- Working UV purification controls with live cycle countdown, automation settings, and history.
- Filter lifecycle management with cartridge replacement, water source tracking, and notes.
- Device personalization, install prompt support, and offline caching through a service worker.

## Run locally

Serve the app from the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

- The app stores data locally in the browser using `localStorage`.
- Installing it as a PWA depends on browser support for install prompts.
- For full service worker behavior, use a local server instead of opening the HTML file directly.
