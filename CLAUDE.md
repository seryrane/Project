# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`geocoder` is a small Node.js library that wraps geocoding web services (Google Geocoding API by default, with GeoNames and Yahoo PlaceFinder as alternative providers). It exposes a singleton with three public methods: `geocode(loc, cbk, opts)`, `reverseGeocode(lat, lng, cbk, opts)`, and `selectProvider(name, opts)`. All providers normalize their responses to roughly match Google's Geocoding JSON output format.

## Architecture

- `index.js` — the `Geocoder` singleton. `selectProvider(name)` does `require("./providers/" + name)` and delegates `geocode`/`reverseGeocode` calls to that module.
- `providers/google.js` — Google Geocoding API. Uses HTTPS when a `key` option is passed, plain HTTP otherwise.
- `providers/geonames.js` — GeoNames API; transforms its XML/JSON responses into Google-shaped JSON. Requires `xml2js` (an optional dependency, only needed for this provider).
- `providers/yahoo.js` — Yahoo PlaceFinder; also transforms responses into Google-shaped JSON.

Adding a provider means dropping a module into `providers/` that exports `geocode(providerOpts, loc, cbk, opts)` and `reverseGeocode(providerOpts, lat, lng, cbk, opts)`.

## Commands

- `npm install` — install dependencies.
- `npm test` — offline smoke test (`test/smoke-test.js`); verifies the module and all providers load and expose the public API. This is what CI runs.
- `npm run test:live` — nodeunit suites in `test/` that hit the real provider APIs. These need network access and valid API credentials (Google now requires an API key; Yahoo PlaceFinder has been discontinued), so expect failures without them.

## Caveats

- The codebase predates modern JavaScript: callback-style APIs, `var`, and the deprecated `request` and old `underscore`/`xml2js` versions are intentional — keep changes consistent with that style unless the task is explicitly a modernization.
- `index.js` exports a singleton, so `selectProvider` mutates shared state across all requirers.
