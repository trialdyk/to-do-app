<script setup lang="ts">
import type { Database } from '../../../types/database.types'

definePageMeta({
  middleware: 'auth'
})

const props = defineProps<{
  project: Database['public']['Tables']['projects']['Row']
}>()

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()

// State
const categories = ref<Database['public']['Tables']['task_categories']['Row'][]>([])
const tasks = ref<Database['public']['Tables']['tasks']['Row'][]>([])
const loading = ref(true)

// Drag & Drop State
const draggedTask = ref<Database['public']['Tables']['tasks']['Row'] | null>(null)

// Task Creation
const isTaskModalOpen = ref(false)
const newTaskTitle = ref('')
const newTaskCategoryId = ref('')
const newTaskPriority = ref<'low' | 'medium' | 'high'>('medium')
const createLoading = ref(false)

const fetchData = async () => {
  loading.value = true
  
  // Fetch Categories
  const { data: cats } = await client
    .from('task_categories')
    .select('*')
    .eq('project_id', props.project.id)
    .order('position')
    
  if (cats && cats.length > 0) {
    categories.value = cats
  } else {
    // Initialize default categories if none exist
    await initializeCategories()
  }

  // Fetch Tasks
  const { data: t } = await client
    .from('tasks')
    .select('*')
    .eq('project_id', props.project.id)
  
  if (t) tasks.value = t

  loading.value = false
}

const initializeCategories = async () => {
  const defaults = [
    { name: 'To Do', position: 0, color: 'gray' },
    { name: 'In Progress', position: 1, color: 'blue' },
    { name: 'Done', position: 2, color: 'green', is_approval_required: true }
  ]
  
  const { data } = await client.from('task_categories').insert(
    defaults.map(d => ({ ...d, project_id: props.project.id }))
  ).select()
  
  if (data) categories.value = data
}

// Drag & Drop Handlers
const onDragStart = (event: DragEvent, task: Database['public']['Tables']['tasks']['Row']) => {
  draggedTask.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.dropEffect = 'move'
  }
}

const onDrop = async (event: DragEvent, categoryId: string) => {
  if (!draggedTask.value) return
  
  const oldCategoryId = draggedTask.value.category_id
  if (oldCategoryId === categoryId) return

  // Optimistic Update
  const task = tasks.value.find((t: Database['public']['Tables']['tasks']['Row']) => t.id === draggedTask.value?.id)
  if (task) {
    task.category_id = categoryId
  }

  // Check for Approval Requirement
  const targetCategory = categories.value.find((c: Database['public']['Tables']['task_categories']['Row']) => c.id === categoryId)
  let approvalStatus: Database['public']['Tables']['tasks']['Row']['approval_status'] = 'none'
  
  if (targetCategory?.is_approval_required) {
    approvalStatus = 'pending'
    toast.add({ title: 'Task submitted for approval', icon: 'i-lucide-clock' })
  }

  // Update DB
  const { error } = await client.from('tasks').update({ 
    category_id: categoryId,
    approval_status: approvalStatus
  }).eq('id', draggedTask.value.id)

  if (error) {
    // Revert on error
    if (task) task.category_id = oldCategoryId
    toast.add({ title: 'Failed to move task', color: 'error' })
  }

  draggedTask.value = null
}

// Task Actions
const openAddTask = (categoryId: string) => {
  newTaskCategoryId.value = categoryId
  newTaskTitle.value = ''
  newTaskPriority.value = 'medium'
  isTaskModalOpen.value = true
}

const createTask = async () => {
  if (!newTaskTitle.value) return
  
  createLoading.value = true
  const { data, error } = await client.from('tasks').insert({
    title: newTaskTitle.value,
    project_id: props.project.id,
    category_id: newTaskCategoryId.value,
    priority: newTaskPriority.value,
    user_id: user.value?.id
  }).select().single()

  if (data) {
    tasks.value.push(data)
    isTaskModalOpen.value = false
    toast.add({ title: 'Task created' })
  }
  createLoading.value = false
}

const getTasksByCategory = (categoryId: string) => {
  return tasks.value.filter((t: Database['public']['Tables']['tasks']['Row']) => t.category_id === categoryId)
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'neutral'
  }
}

// Permissions
const userPermissions = ref({
  approve_task: false
})

const fetchPermissions = async () => {
  // Check if owner
  if (props.project.owner_id === user.value?.id) {
    userPermissions.value = { approve_task: true }
    return
  }

  const { data } = await client
    .from('project_members')
    .select('role_id, roles(permissions)')
    .eq('project_id', props.project.id)
    .eq('user_id', user.value?.id as string)
    .single()

  if (data?.roles) {
    const perms = (data.roles.permissions as { approve_task?: boolean }) || {}
    userPermissions.value = {
      approve_task: !!perms.approve_task
    }
  }
}

// Approval Actions
const approveTask = async (task: Database['public']['Tables']['tasks']['Row']) => {
  const { error } = await client.from('tasks').update({
    approval_status: 'approved',
    approved_by: user.value?.id
  }).eq('id', task.id)

  if (error) {
    toast.add({ title: 'Error approving task', color: 'error' })
  } else {
    // Update local state
    const t = tasks.value.find((t: Database['public']['Tables']['tasks']['Row']) => t.id === task.id)
    if (t) t.approval_status = 'approved'
    toast.add({ title: 'Task approved', icon: 'i-lucide-check-circle' })
  }
}

const rejectTask = async (task: Database['public']['Tables']['tasks']['Row']) => {
  // Move back to previous category? Or just mark rejected?
  // For simplicity, let's just mark rejected. User can move it back manually.
  const { error } = await client.from('tasks').update({
    approval_status: 'rejected'
  }).eq('id', task.id)

  if (error) {
    toast.add({ title: 'Error rejecting task', color: 'error' })
  } else {
    const t = tasks.value.find((t: Database['public']['Tables']['tasks']['Row']) => t.id === task.id)
    if (t) t.approval_status = 'rejected'
    toast.add({ title: 'Task rejected', icon: 'i-lucide-x-circle' })
  }
}

onMounted(() => {
  fetchData()
  fetchPermissions()
})
</script>

<template>
  <div class="h-full overflow-x-auto">
    <div class="flex h-full gap-4 min-w-max pb-4">
      <!-- Columns -->
      <div 
        v-for="category in categories" 
        :key="category.id"
        class="w-80 flex flex-col bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-800"
        @dragover.prevent
        @drop="onDrop($event, category.id)"
      >
        <!-- Column Header -->
        <div class="p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <div :class="`w-3 h-3 rounded-full bg-${category.color}-500`"></div>
            <h3 class="font-semibold text-gray-700 dark:text-gray-200">{{ category.name }}</h3>
            <UBadge color="neutral" variant="subtle" size="xs">{{ getTasksByCategory(category.id).length }}</UBadge>
          </div>
          <UButton icon="i-lucide-plus" color="neutral" variant="ghost" size="xs" @click="openAddTask(category.id)" />
        </div>

        <!-- Task List -->
        <div class="flex-1 p-2 overflow-y-auto space-y-2">
          <UCard
            v-for="task in getTasksByCategory(category.id)"
            :key="task.id"
            class="cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary-500/50 transition-all"
            draggable="true"
            @dragstart="onDragStart($event, task)"
          >
            <div class="space-y-2">
              <div class="flex justify-between items-start gap-2">
                <p class="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{{ task.title }}</p>
                <UBadge :color="getPriorityColor(task.priority)" variant="subtle" size="xs" class="capitalize">
                  {{ task.priority }}
                </UBadge>
              </div>
              
              <div v-if="task.approval_status === 'pending'" class="flex flex-col gap-2">
                <div class="flex items-center gap-1 text-xs text-orange-500 font-medium">
                  <UIcon name="i-lucide-clock" class="w-3 h-3" />
                  Pending Approval
                </div>
                
                <div v-if="userPermissions.approve_task" class="flex gap-1">
                  <UButton size="xs" color="primary" variant="soft" icon="i-lucide-check" block @click.stop="approveTask(task)">Approve</UButton>
                  <UButton size="xs" color="error" variant="soft" icon="i-lucide-x" block @click.stop="rejectTask(task)">Reject</UButton>
                </div>
              </div>
              <div v-else-if="task.approval_status === 'rejected'" class="flex items-center gap-1 text-xs text-red-500 font-medium">
                <UIcon name="i-lucide-x-circle" class="w-3 h-3" />
                Rejected
              </div>
              <div v-else-if="task.approval_status === 'approved'" class="flex items-center gap-1 text-xs text-green-500 font-medium">
                <UIcon name="i-lucide-check-circle" class="w-3 h-3" />
                Approved
              </div>
            </div>
          </UCard>
        </div>
      </div>
      
      <!-- Add Column Button (Placeholder) -->
      <div class="w-80 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg opacity-50 hover:opacity-100 transition-opacity cursor-pointer">
        <div class="text-center">
          <UIcon name="i-lucide-plus" class="w-8 h-8 mx-auto mb-2" />
          <span class="font-medium">Add Column</span>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <UModal v-model:open="isTaskModalOpen" title="Create Task">
      <template #body>
        <div class="space-y-4 w-full">
          <UFormField label="Task Title">
            <UInput v-model="newTaskTitle" autofocus class="w-full" />
          </UFormField>
          <UFormField label="Priority">
            <USelect v-model="newTaskPriority" :items="['low', 'medium', 'high']" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isTaskModalOpen = false">Cancel</UButton>
          <UButton color="primary" :loading="createLoading" @click="createTask">Create</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
