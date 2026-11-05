// Design tokens only: colour, spacing, radius, shadow, z-index and duration values in CSS
// Modules must come from `var(--…)` (see src/styles/tokens.css). Sizes and font sizes use the
// size/text tokens by convention and review.
const tokenProperties = [
  // colour
  '/^(color|fill|stroke|caret-color|accent-color|text-decoration-color|outline-color)$/',
  '/^background(-color)?$/',
  '/^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?-color$/',
  // spacing
  '/^(margin|padding|scroll-padding|scroll-margin)(-(top|right|bottom|left|block|inline)(-(start|end))?)?$/',
  '/^(gap|row-gap|column-gap)$/',
  // radius
  '/^border(-(start|end)-(start|end))?-radius$/',
  '/^border-(top|bottom)-(left|right)-radius$/',
  // shadow
  '/^(box|text)-shadow$/',
  // layers
  'z-index',
  // duration
  '/^(transition|animation)-(duration|delay)$/',
];

// Colour literals are banned in every property, which also covers shorthands such as
// `border: 1px solid #ccc`.
const colourLiteral = [
  '/#[0-9a-f]{3,8}\\b/i',
  '/\\b(rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color|color-mix)\\(/i',
  '/\\b(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink)\\b/i',
];

export default {
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'scale-unlimited/declaration-strict-value': [
      tokenProperties,
      {
        ignoreFunctions: false,
        ignoreValues: [
          '0',
          'inherit',
          'currentColor',
          'currentcolor',
          'transparent',
          'none',
          'auto',
          // Arithmetic on tokens, for example calc(var(--size-header) + var(--space-4)).
          '/^(calc|min|max|clamp)\\(/',
        ],
        message: 'Use a design token: var(--…) from src/styles/tokens.css.',
      },
    ],
    'declaration-property-value-disallowed-list': [
      { '/.+/': colourLiteral },
      { message: 'Use a colour token: var(--color-…) from src/styles/tokens.css.' },
    ],
  },
};
