// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/supabase',
    '@nuxtjs/i18n'
  ],

  i18n: {
    locales: [
      { code: 'id', file: 'id.json', name: 'Indonesia' },
      { code: 'en', file: 'en.json', name: 'English' }
    ],
    langDir: 'locales',
    defaultLocale: 'id',
    strategy: 'no_prefix'
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    redirectOptions: {
      login: '/',
      callback: '/confirm',
      exclude: ['/', '/confirm']
    }
  }
})
