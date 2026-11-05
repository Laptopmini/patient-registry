import { FlagdWebProvider } from '@openfeature/flagd-web-provider';
import { InMemoryProvider, OpenFeature } from '@openfeature/web-sdk';

/**
 * Code defaults, mirroring `flags/flags.json` (the repository root copy is outside this
 * app's Docker build context). Used when flagd can't be reached, as ADR 0009 requires.
 */
const fallbackFlags = {
  'summary-provider-anthropic': {
    disabled: false,
    variants: { on: true, off: false },
    defaultVariant: 'off',
  },
  'natural-language-search': {
    disabled: false,
    variants: { on: true, off: false },
    defaultVariant: 'off',
  },
};

/**
 * Registers the flagd web provider through the same-origin `/flagd` path (Caddy in
 * Docker, the Vite proxy in development). If flagd is unreachable, falls back to the
 * in-memory provider with the code defaults. No UI depends on flags yet.
 */
export async function registerFlagProvider() {
  const secure = window.location.protocol === 'https:';
  try {
    await OpenFeature.setProviderAndWait(
      new FlagdWebProvider({
        host: window.location.hostname,
        port: Number(window.location.port) || (secure ? 443 : 80),
        tls: secure,
        // The provider builds `${scheme}://${host}:${port}/${pathPrefix}`.
        pathPrefix: 'flagd',
        maxRetries: 3,
      }),
    );
  } catch {
    await OpenFeature.setProviderAndWait(new InMemoryProvider(fallbackFlags));
  }
}
