import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    ignores: ['coverage/**'],
  },
  {
    rules: {
      'vue/html-self-closing': 'off',
    },
  },
)
