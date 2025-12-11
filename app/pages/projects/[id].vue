<script setup lang="ts">
import type { Database } from '../../types/database.types'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const client = useSupabaseClient<Database>()
const projectId = route.params.id as string

const project = ref<Database['public']['Tables']['projects']['Row'] | null>(null)
const loading = ref(true)

const fetchProject = async () => {
  const { data } = await client.from('projects').select('*').eq('id', projectId).single()
  if (data) {
    project.value = data
  }
  loading.value = false
}

const links = computed(() => [
  {
    label: 'Board',
    icon: 'i-lucide-kanban',
    to: `/projects/${projectId}`
  },
  {
    label: 'Settings',
    icon: 'i-lucide-settings',
    to: `/projects/${projectId}/settings`
  }
])

onMounted(() => {
  fetchProject()
})
</script>

<template>
  <div class="h-full flex flex-col">
    <div v-if="loading" class="p-4">
      <USkeleton class="h-8 w-64 mb-4" />
      <USkeleton class="h-10 w-full" />
    </div>
    <div v-else-if="project" class="flex-1 flex flex-col">
      <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">{{ project.name }}</h1>
            <p class="text-sm text-gray-500">{{ project.description }}</p>
          </div>
        </div>
        
        <UHorizontalNavigation :links="links" />
      </header>

      <div class="flex-1 overflow-auto p-4">
        <NuxtPage :project="project" />
      </div>
    </div>
    <div v-else class="p-8 text-center">
      <p>Project not found</p>
      <UButton to="/projects" variant="link">Back to Projects</UButton>
    </div>
  </div>
</template>
