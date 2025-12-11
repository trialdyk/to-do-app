<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { breakpointsTailwind } from '@vueuse/core'
import type { Mail } from '~/types'

const tabItems = [{
  label: 'All',
  value: 'all'
}, {
  label: 'Unread',
  value: 'unread'
}]
const selectedTab = ref('all')

// Combine mock mails with real invites
const { data: invitesData, refresh: refreshInvites } = await useFetch('/api/users/invites')

const mappedInvites = computed(() => {
  if (!invitesData.value?.invites) return []
  return invitesData.value.invites.map((invite: any) => ({
    id: invite.id,
    unread: true, // Invites are always "active"
    from: {
      id: 0,
      name: 'System',
      email: 'noreply@system.com',
      status: 'subscribed' as const,
      location: 'System',
      avatar: { src: '', alt: 'System' }
    },
    subject: `Invitation to join ${invite.projects?.name}`,
    body: `You have been invited to join the project "${invite.projects?.name}". Please accept or decline this invitation below.`,
    date: invite.created_at,
    type: 'invite' as const,
    projectId: invite.project_id
  }))
})

const mails = computed(() => mappedInvites.value)
const toast = useToast()

const handleRespond = async ({ inviteId, accept }: { inviteId: string, accept: boolean }) => {
  try {
    const { error } = await useFetch('/api/projects/invite', {
      method: 'PUT',
      body: { inviteId, accept }
    })
    
    if (error.value) throw error.value

    toast.add({ 
      title: accept ? 'Joined project successfully' : 'Invite declined', 
      icon: accept ? 'i-lucide-check-circle' : 'i-lucide-x-circle'
    })
    
    selectedMail.value = null
    refreshInvites()
    
  } catch (e: any) {
    toast.add({ title: 'Error processing invite', description: e.message, color: 'error' })
  }
} // Remove fetch call

// Filter mails based on the selected tab
const filteredMails = computed(() => {
  if (selectedTab.value === 'unread') {
    return mails.value.filter(mail => !!mail.unread)
  }

  return mails.value
})

const selectedMail = ref<Mail | null>()

const isMailPanelOpen = computed({
  get() {
    return !!selectedMail.value
  },
  set(value: boolean) {
    if (!value) {
      selectedMail.value = null
    }
  }
})

// Reset selected mail if it's not in the filtered mails
watch(filteredMails, () => {
  if (!filteredMails.value.find(mail => mail.id === selectedMail.value?.id)) {
    selectedMail.value = null
  }
})

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')
</script>

<template>
  <UDashboardPanel
    id="inbox-1"
    :default-size="25"
    :min-size="20"
    :max-size="30"
    resizable
  >
    <UDashboardNavbar title="Inbox">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <UBadge :label="filteredMails.length" variant="subtle" />
      </template>

      <template #right>
        <UTabs
          v-model="selectedTab"
          :items="tabItems"
          :content="false"
          size="xs"
        />
      </template>
    </UDashboardNavbar>
    <InboxList v-model="selectedMail" :mails="filteredMails" />
  </UDashboardPanel>

  <InboxMail v-if="selectedMail" :mail="selectedMail" @close="selectedMail = null" @respond="handleRespond" />
  <div v-else class="hidden lg:flex flex-1 items-center justify-center">
    <UIcon name="i-lucide-inbox" class="size-32 text-gray-300 dark:text-gray-700" />
  </div>

  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="isMailPanelOpen">
      <template #content>
        <InboxMail v-if="selectedMail" :mail="selectedMail" @close="selectedMail = null" @respond="handleRespond" />
      </template>
    </USlideover>
  </ClientOnly>
</template>
