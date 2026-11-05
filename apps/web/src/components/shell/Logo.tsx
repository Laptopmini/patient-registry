/**
 * The Patient Registry mark: a rounded tile with a cross, drawn with tokens only. It is
 * decorative (the product name sits next to it), and not any third-party or company logo.
 */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      <rect width="28" height="28" rx="8" style={{ fill: 'var(--color-primary-bg)' }} />
      <path d="M11.5 6.5h5v5h5v5h-5v5h-5v-5h-5v-5h5z" style={{ fill: 'var(--color-primary-fg)' }} />
    </svg>
  );
}
