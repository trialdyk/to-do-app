<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
import type { Database } from '../../types/database.types'

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()

const projects = ref<Database['public']['Tables']['projects']['Row'][]>([])
const loading = ref(true)
const isCreateModalOpen = ref(false)
const newProjectName = ref('')
const newProjectDescription = ref('')
const createLoading = ref(false)

const { getCurrentUser, requireUser } = useAuth()
const fetchProjects = async () => {
  loading.value = true
  const { data } = await client.from('projects').select('*').order('created_at', { ascending: false })
  if (data) {
    projects.value = data
  }
  loading.value = false
}

const createProject = async () => {
  if (!newProjectName.value.trim()) return
  
  try {
    const currentUser = await requireUser()

    createLoading.value = true
    const { data, error } = await client.from('projects').insert({
      name: newProjectName.value,
      description: newProjectDescription.value,
      owner_id: currentUser.id
    }).select().single()

    if (error) {
      toast.add({ title: 'Error creating project', description: error.message, color: 'error' })
    } else if (data) {
      projects.value.unshift(data)
      isCreateModalOpen.value = false
      newProjectName.value = ''
      newProjectDescription.value = ''
      toast.add({ title: 'Project created successfully', icon: 'i-lucide-check-circle' })
    }
  } catch (e) {
    toast.add({ title: 'You must be logged in to create a project', color: 'error' })
  } finally {
    createLoading.value = false
  }
}

onMounted(() => {
  fetchProjects()
})
</script>

<template>
  <UContainer class="py-8">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Projects</h1>
        <p class="text-gray-500 dark:text-gray-400">Manage your team projects</p>
      </div>
      <UButton icon="i-lucide-plus" size="lg" @click="isCreateModalOpen = true">
        Create Project
      </UButton>
    </div>

    <!-- Invites Section Removed (Moved to /inbox) -->

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <USkeleton v-for="i in 3" :key="i" class="h-40 w-full" />
    </div>

    <div v-else-if="projects.length === 0" class="text-center py-12">
      <UIcon name="i-lucide-folder-open" class="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-white">No projects yet</h3>
      <p class="text-gray-500 mb-4">Create your first project to get started.</p>
      <UButton icon="i-lucide-plus" variant="soft" @click="isCreateModalOpen = true">
        Create Project
      </UButton>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <UCard
        v-for="project in projects"
        :key="project.id"
        class="group hover:ring-2 hover:ring-primary-500 transition-all duration-300 overflow-hidden"
        :ui="{ body: 'p-0', footer: 'p-4' }"
      >
        <!-- Placeholder Image / Icon -->
        <div class="h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
          <UIcon name="i-lucide-folder" class="w-12 h-12 text-gray-300 dark:text-gray-600" />
          <div class="absolute bottom-4 left-4 right-4">
             <h3 class="text-xl font-bold truncate text-gray-900 dark:text-white">{{ project.name }}</h3>
          </div>
        </div>

        <div class="p-4">
          <div class="flex justify-between items-start mb-2">
             <p class="text-gray-500 dark:text-gray-400 line-clamp-2 text-sm h-10">
              {{ project.description || 'No description provided.' }}
            </p>
            <UBadge v-if="project.owner_id === user?.id" color="primary" variant="subtle" size="xs">Owner</UBadge>
          </div>
          
          <div class="flex items-center gap-2 text-xs text-gray-400 mt-4">
            <UIcon name="i-lucide-calendar" class="w-3 h-3" />
            <span>{{ new Date(project.created_at).toLocaleDateString() }}</span>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UTooltip text="Kanban Board">
              <UButton 
                icon="i-lucide-kanban" 
                color="primary" 
                variant="soft" 
                :to="`/projects/${project.id}`"
              />
            </UTooltip>
            <UTooltip text="Settings">
              <UButton 
                icon="i-lucide-settings" 
                color="neutral" 
                variant="ghost" 
                :to="`/projects/${project.id}/settings`"
              />
            </UTooltip>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Create Project Modal -->
    <UModal v-model:open="isCreateModalOpen" title="Create New Project">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Project Name">
            <UInput v-model="newProjectName" placeholder="e.g. Website Redesign" autofocus />
          </UFormField>
          <UFormField label="Description">
            <UTextarea v-model="newProjectDescription" placeholder="Brief description of the project..." />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">Cancel</UButton>
          <UButton color="primary" :loading="createLoading" @click="createProject">Create Project</UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
