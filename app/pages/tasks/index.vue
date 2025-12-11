<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { Database } from '../../types/database.types'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  middleware: 'auth'
})

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const { t } = useI18n()

import { UBadge, UButton, UCheckbox } from '#components'

type Task = Database['public']['Tables']['tasks']['Row']

// Columns Definition
const columns: TableColumn<Task>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: true
  },
  {
    accessorKey: 'priority',
    header: 'Priority',
    enableSorting: true,
    cell: ({ row }) => {
      return h(UBadge, {
        color: getPriorityColor(row.getValue('priority')),
        variant: 'subtle',
        size: 'xs'
      }, () => row.getValue('priority'))
    }
  },
  {
    accessorKey: 'deadline',
    header: 'Deadline',
    enableSorting: true,
    cell: ({ row }) => {
      const deadline = row.getValue('deadline') as string | null
      return h('span', {
        class: getDeadlineColor(deadline, row.getValue('completed'))
      }, deadline ? new Date(deadline).toLocaleDateString() : '-')
    }
  },
  {
    accessorKey: 'completed',
    header: 'Status',
    enableSorting: true,
    cell: ({ row }) => {
      return h(UCheckbox, {
        modelValue: row.getValue('completed'),
        'onUpdate:modelValue': () => toggleTaskStatus(row.original)
      })
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UButton, {
          color: 'neutral',
          variant: 'ghost',
          icon: 'i-lucide-pencil',
          size: 'xs',
          onClick: () => openEditModal(row.original)
        }),
        h(UButton, {
          color: 'error',
          variant: 'ghost',
          icon: 'i-lucide-trash-2',
          size: 'xs',
          onClick: () => openDeleteModal(row.original)
        })
      ])
    }
  }
]

// State
const page = ref(1)
const pageCount = ref(10)
const search = ref('')
const selectedStatus = ref('all')
const loading = computed(() => status.value === 'pending')
const totalTasks = computed(() => tasks.value?.length || 0)

// Data Fetching
const { data: tasks, status, refresh } = await useFetch<Task[]>('/api/tasks', {
  query: {
    search,
    status: selectedStatus
  },
  key: 'tasks-list',
  watch: [page]
})

// Filters
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' }
]


// ... script imports ...

// State for Modals
const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedTask = ref<any>(null)
const editTitle = ref('')
const editPriority = ref('medium')
const editDeadline = ref('')
const editLoading = ref(false)

// Actions
const openEditModal = (task: any) => {
  selectedTask.value = task
  editTitle.value = task.title
  editPriority.value = task.priority
  editDeadline.value = task.deadline ? task.deadline.split('T')[0] : ''
  isEditModalOpen.value = true
}

const saveEdit = async () => {
  if (!selectedTask.value) return
  editLoading.value = true
  
  const updates: any = {
    title: editTitle.value,
    priority: editPriority.value,
    deadline: editDeadline.value ? new Date(editDeadline.value).toISOString() : null
  }

  const { error } = await client.from('tasks').update(updates).eq('id', selectedTask.value.id)
  
  if (!error) {
    isEditModalOpen.value = false
    refresh() // Refresh data
  }
  editLoading.value = false
}

const confirmDelete = async () => {
    if (!selectedTask.value) return
    const { error } = await client.from('tasks').delete().eq('id', selectedTask.value.id)
    if (!error) {
            isDeleteModalOpen.value = false
        refresh() // Refresh data
    }
}

const openDeleteModal = (task: any) => {
    selectedTask.value = task
    isDeleteModalOpen.value = true
}

const toggleTaskStatus = async (task: any) => {
    const newStatus = !task.completed
    // Optimistic update
    task.completed = newStatus

    const { error } = await client.from('tasks').update({ completed: newStatus }).eq('id', task.id)

    if (error) {
        task.completed = !newStatus // Revert
        console.error('Failed to toggle status:', error)
    } else {
        refresh()
    }
}

// ... existing fetchTasks ...
</script>

<template>
  <UContainer class="py-6 w-full">
         <div class="flex justify-between items-center mb-6">
             <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
               All Tasks
             </h1>
             <!-- Add Task Button (Optional, or rely on Dashboard) -->
              <!-- For now, just a refresh button or empty -->
         </div>

         <!-- Toolbar -->
         <div class="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
             <UInput 
                 v-model="search"
                 icon="i-lucide-search"
                 placeholder="Search tasks..."
                 class="w-full sm:w-64"
                 size="sm"
             />
             
             <div class="flex gap-2">
                 <USelectMenu 
                     v-model="selectedStatus" 
                     :options="statusOptions"
                     value-attribute="value"
                     option-attribute="label"
                     class="w-32"
                     size="sm"
                     placeholder="Filter by Status"
                 />
             </div>
         </div>

         <!-- Table -->
         <UCard class="overflow-hidden">
             <UTable 
                 :data="tasks || []" 
                 :columns="columns" 
                 :loading="loading"
             >
                 <!-- Render functions handle content now -->
             </UTable>

             <!-- Pagination -->
             <div class="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
                 <UPagination 
                     v-model="page" 
                     :page-count="pageCount" 
                     :total="totalTasks" 
                 />
             </div>
         </UCard>
            <!-- Modals moved inside -->
             <!-- Edit Modal -->
             <UModal v-model:open="isEditModalOpen" title="Edit Task">
                 <template #body>
                     <div class="space-y-4">
                         <UFormGroup label="Title">
                             <UInput v-model="editTitle" />
                         </UFormGroup>
                         <UFormGroup label="Deadline">
                              <UInput type="date" v-model="editDeadline" />
                         </UFormGroup>
                         <UFormGroup label="Priority">
                             <USelect v-model="editPriority" :options="['low', 'medium', 'high']" />
                         </UFormGroup>
                     </div>
                 </template>
                 <template #footer>
                     <div class="flex justify-end gap-2">
                         <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">Cancel</UButton>
                         <UButton color="primary" :loading="editLoading" @click="saveEdit">Save</UButton>
                     </div>
                 </template>
             </UModal>
           
             <!-- Delete Modal -->
             <UModal v-model:open="isDeleteModalOpen" title="Delete Task">
                 <template #body>
                     <p>Are you sure you want to delete this task? This action cannot be undone.</p>
                 </template>
                 <template #footer>
                     <div class="flex justify-end gap-2">
                         <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">Cancel</UButton>
                         <UButton color="error" @click="confirmDelete">Delete</UButton>
                     </div>
                 </template>
             </UModal>
  </UContainer>
</template>
