import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import { animatedUno } from 'animated-unocss'
export default defineConfig({
  shortcuts: {
    'app-shell': 'min-h-screen bg-app text-app font-lexend',
    'app-container': 'mx-auto w-full max-w-[1260px] px-4 sm:px-6 lg:px-8',
    'app-panel': 'bg-app-soft text-app',
    'app-card': 'rounded bg-app-soft text-app',
    'app-card-hover': 'transition hover:bg-app-mute hover:text-accent',
    'app-border': 'border border-app-border',
    'app-divider': 'border-app-border',
    'app-heading': 'font-bold text-app-heading',
    'app-muted': 'text-app/65',

    'btn-base':
      'inline-flex items-center justify-center gap-2 rounded border-0 font-bold no-underline transition disabled:pointer-events-none disabled:opacity-60',
    'btn-primary': 'btn-base bg-accent px-5 py-3 text-ink hover:bg-accent-soft',
    'btn-secondary': 'btn-base bg-app-soft px-5 py-3 text-app-heading hover:text-accent',
    'btn-ghost': 'btn-base bg-transparent px-3 py-2 text-app-heading hover:bg-app-soft hover:text-accent',
    'btn-danger': 'btn-base bg-red-500/10 px-4 py-2 text-red-300 hover:bg-red-500/20',

    'icon-btn':
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-app-heading transition hover:bg-app-soft hover:text-accent',
    'icon-btn-solid':
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border-0 bg-accent p-0 text-ink transition hover:bg-accent-soft',

    'input-shell': 'flex items-center rounded bg-white px-2 py-1 shadow-md',
    'input-field':
      'min-w-0 appearance-none border-0 bg-transparent p-0 text-sm outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0',
    'search-popover': 'absolute z-50 mt-2 overflow-y-auto rounded app-border bg-app shadow-xl',

    'badge-accent': 'rounded bg-accent px-2 py-0.5 text-xs font-bold text-ink',
    'badge-muted': 'rounded bg-mocha-overlay px-2 py-0.5 text-xs text-app/80',
    'link-accent': 'text-accent no-underline transition hover:text-accent-soft',
    'link-muted': 'text-app no-underline transition hover:text-accent',
    'section-title': 'text-2xl font-extrabold tracking-wide text-accent',
  },
  theme: {
    colors: {
      app: {
        DEFAULT: 'var(--color-text)',
        bg: 'var(--color-background)',
        soft: 'var(--color-background-soft)',
        mute: 'var(--color-background-mute)',
        heading: 'var(--color-heading)',
        border: 'var(--color-border)',
        'border-hover': 'var(--color-border-hover)',
      },
      accent: {
        DEFAULT: '#f9a8d4',
        soft: '#fbcfe8',
        strong: '#f472b6',
        muted: 'rgba(249, 168, 212, 0.15)',
      },
      ink: {
        DEFAULT: '#1e1e2e',
        soft: '#313244',
      },
      latte: {
        base: '#f5e0dc',
        mantle: '#f2cdcd',
        overlay: '#f5c2e7',
      },
      mocha: {
        base: '#1e1e2e',
        mantle: '#181825',
        overlay: '#313244',
      },
      sapphire: '#89b4fa',
      sky: '#89dceb',
      lavender: '#b4befe',
      peach: '#fab387',
    },
    fontFamily: {
      lexend: 'Lexend Deca, ui-sans-serif, system-ui, sans-serif',
      mono: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
  },
  presets: [animatedUno(), presetWind3(), presetAttributify(), presetIcons(), presetTypography()],
  transformers: [transformerDirectives(), transformerVariantGroup()],
})
