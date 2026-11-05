# 0009. OpenFeature with flagd

- Status: accepted
- Date: 2026-11-05

## Context
The AI features (the `anthropic` summary provider, natural-language search) are behind feature flags. Both apps use OpenFeature, and the code should not depend on a particular flag vendor.

## Options
- **flagd in Compose**, reading a committed `flags/flags.json`: a real out-of-process provider.
- **An in-memory provider** in each app: no extra container, but each app holds its own copy of the flags.

## Decision
flagd. The API uses the OpenFeature Python SDK with the flagd provider. The web app uses the OpenFeature web SDK with the flagd web provider, which goes through the Caddy proxy.

## Consequences
- Both apps read the same flag file. Changes reload without a restart.
- Moving to LaunchDarkly, GrowthBook or Unleash only means swapping the provider registration. The README documents this.
- It adds one container. If flagd isn't reachable, flags fall back to their code defaults (AI features off), so the app still works.
