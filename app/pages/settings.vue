<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const { t } = useI18n()

const links = computed(() => [[{
  label: t('settings.nav.general'),
  icon: 'i-lucide-user',
  to: '/settings',
  exact: true
},{
  label: t('settings.nav.security'),
  icon: 'i-lucide-shield',
  to: '/settings/security'
}], [{
  label: t('settings.nav.documentation'),
  icon: 'i-lucide-book-open',
  to: 'https://ui.nuxt.com/docs/getting-started/installation/nuxt',
  target: '_blank'
}]] satisfies NavigationMenuItem[][])
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
    <UNavigationMenu :items="links" highlight />
        <NuxtPage />
  </div>
</template>
