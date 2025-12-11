<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const toast = useToast()
const { t } = useI18n()

const open = ref(false)

const links = computed(() => [[{
  label: t('sidebar.dashboard'),
  icon: 'i-lucide-layout-dashboard',
  to: '/dashboard',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('sidebar.tasks'),
  icon: 'i-lucide-list-todo',
  to: '/tasks',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('sidebar.projects'),
  icon: 'i-lucide-folder-kanban',
  to: '/projects',
  onSelect: () => {
    open.value = false
  }
}, {
  label: t('sidebar.inbox'),
  icon: 'i-lucide-inbox',
  to: '/inbox',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: t('sidebar.feedback'),
  icon: 'i-lucide-message-circle',
  to: 'https://wa.me/6283165721585',
  target: '_blank'
}, {
  label: t('sidebar.help'),
  icon: 'i-lucide-info',
  to: 'https://wa.me/6283165721585',
  target: '_blank'
}]] satisfies NavigationMenuItem[][])

const groups = computed(() => [{
  id: 'links',
  label: t('sidebar.groups.goto'),
  items: links.value.flat()
}])

onMounted(async () => {
  const cookie = useCookie('cookie-consent')
  if (cookie.value === 'accepted') {
    return
  }

  toast.add({
    title: 'We use first-party cookies to enhance your experience on our website.',
    duration: 0,
    close: false,
    actions: [{
      label: 'Accept',
      color: 'neutral',
      variant: 'outline',
      onClick: () => {
        cookie.value = 'accepted'
      }
    }, {
      label: 'Opt out',
      color: 'neutral',
      variant: 'ghost'
    }]
  })
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <NuxtLink to="/dashboard" class="flex items-center gap-2 px-2 w-full">
            <template v-if="collapsed">
                <img src="/favicon.svg" alt="Logo" class="w-8 h-8 rounded-lg" />
            </template>
            <template v-else>
                <img src="/favicon.svg" alt="Logo" class="w-8 h-8 rounded-lg" />
                <span class="font-bold text-gray-900 dark:text-white truncate">To Do App</span>
            </template>
        </NuxtLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Home" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>

    </template>

    <template #body>
      <slot />
    </template>
  </UDashboardPanel>
    
  </UDashboardGroup>
</template>
