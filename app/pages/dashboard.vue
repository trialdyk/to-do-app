<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
import confetti from 'canvas-confetti'
import { format, isToday, isPast, isFuture, parseISO, isSameDay } from 'date-fns'
import type { Database } from '../types/database.types'

const { t, locale, setLocale } = useI18n()
const toast = useToast()
const user = useSupabaseUser()
const client = useSupabaseClient<Database>()

const availableLocales = [
  { code: 'id', name: 'ID' },
  { code: 'en', name: 'EN' }
]

const switchLocale = (code: 'id' | 'en') => {
  setLocale(code)
}

type Task = Database['public']['Tables']['tasks']['Row']

const tasks = ref<Task[]>([])
const newTask = ref('')
const newPriority = ref<'low' | 'medium' | 'high'>('medium')
const newDeadline = ref('')
const loading = ref(false)

// Gamification State
const xp = ref(0)
const level = ref(1)
const progress = ref(0)

// Filter State
const currentFilter = ref('today')
const filters = [
  { label: 'Today', value: 'today' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Overdue', value: 'overdue' }
]

const calculateStats = () => {
  const completedCount = tasks.value.filter(t => t.completed).length
  const totalXp = completedCount * 10
  xp.value = totalXp
  level.value = Math.floor(totalXp / 100) + 1
  progress.value = totalXp % 100
}

const stats = computed(() => {
  const total = tasks.value.length
  const completed = tasks.value.filter(t => t.completed).length
  const pending = total - completed
  const overdue = tasks.value.filter(t => !t.completed && t.deadline && isPast(parseISO(t.deadline)) && !isToday(parseISO(t.deadline))).length
  const dueToday = tasks.value.filter(t => !t.completed && t.deadline && isToday(parseISO(t.deadline))).length

  return { total, completed, pending, overdue, dueToday }
})

const filteredTasks = computed(() => {
  let result: Task[] = []
  switch (currentFilter.value) {
    case 'today':
      result = tasks.value.filter(t => t.deadline && isSameDay(parseISO(t.deadline), new Date()))
      break
    case 'upcoming':
      result = tasks.value.filter(t => t.deadline && isFuture(parseISO(t.deadline)) && !isSameDay(parseISO(t.deadline), new Date()))
      break
    case 'overdue':
      result = tasks.value.filter(t => !t.completed && t.deadline && isPast(parseISO(t.deadline)) && !isSameDay(parseISO(t.deadline), new Date()))
      break
    default:
      result = [...tasks.value]
  }

  return result.sort((a, b) => {
    if (a.completed === b.completed) return 0
    return a.completed ? 1 : -1
  })
})

const groupedTasks = computed(() => {
  if (currentFilter.value !== 'upcoming') return { default: filteredTasks.value }

  const groups: Record<string, Task[]> = {}
  filteredTasks.value.forEach(task => {
    const dateKey = task.deadline ? format(parseISO(task.deadline), 'yyyy-MM-dd') : 'No Date'
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(task)
  })
  
  // Sort groups by date
  return Object.keys(groups).sort().reduce((acc, key) => {
    acc[key] = groups[key]!
    return acc
  }, {} as Record<string, Task[]>)
})

const isEditModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const taskToDelete = ref<string | null>(null)
const editingTask = ref<Task | null>(null)
const editTitle = ref('')
const editPriority = ref<'low' | 'medium' | 'high'>('medium')
const editDeadline = ref('')
const editLoading = ref(false)

const priorities = ['low', 'medium', 'high']

const fetchTasks = async () => {
  loading.value = true
  const { data } = await client.from('tasks').select('*').order('created_at', { ascending: false })
  if (data) {
    tasks.value = data
    calculateStats()
  }
  loading.value = false
}

const addTask = async () => {
  if (!newTask.value.trim()) return
  loading.value = true

  const payload: Database['public']['Tables']['tasks']['Insert'] = {
    title: newTask.value,
    priority: newPriority.value,
    user_id: user.value?.id
  }

  if (newDeadline.value) {
    payload.deadline = new Date(newDeadline.value).toISOString()
  }

  const { data } = await client.from('tasks').insert(payload).select().single()

  if (data) {
    tasks.value.unshift(data)
    toast.add({ title: t('toast.taskCreated'), icon: 'i-lucide-check-circle' })
  }
  newTask.value = ''
  newPriority.value = 'medium'
  loading.value = false
}

const toggleTask = async (task: Task) => {
  const oldLevel = level.value
  task.completed = !task.completed

  if (task.completed) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    })
  }

  await client.from('tasks').update({ completed: task.completed }).eq('id', task.id)
  calculateStats()

  if (level.value > oldLevel) {
    toast.add({
      title: t('toast.levelUp', { level: level.value }),
      icon: 'i-lucide-trophy',
      color: 'warning'
    })
  }
}

const deleteTask = (id: string) => {
  taskToDelete.value = id
  isDeleteModalOpen.value = true
}

const confirmDelete = async () => {
  if (!taskToDelete.value) return
  
  const id = taskToDelete.value
  tasks.value = tasks.value.filter(t => t.id !== id)
  await client.from('tasks').delete().eq('id', id)
  calculateStats()
  toast.add({ title: t('toast.taskDeleted'), icon: 'i-lucide-trash-2' })
  
  isDeleteModalOpen.value = false
  taskToDelete.value = null
}

const openEditModal = (task: Task) => {
  editingTask.value = task
  editTitle.value = task.title
  editPriority.value = task.priority as 'low' | 'medium' | 'high'
  editDeadline.value = task.deadline ? format(parseISO(task.deadline), 'yyyy-MM-dd') : ''
  isEditModalOpen.value = true
}

const saveEdit = async () => {
  if (!editingTask.value || !editTitle.value.trim()) return

  editLoading.value = true
  const payload: Database['public']['Tables']['tasks']['Update'] = {
    title: editTitle.value,
    priority: editPriority.value
  }

  if (editDeadline.value) {
    payload.deadline = new Date(editDeadline.value).toISOString()
  } else {
    payload.deadline = null
  }

  const { data } = await client.from('tasks').update(payload).eq('id', editingTask.value.id).select().single()

  if (data) {
    const index = tasks.value.findIndex(t => t.id === editingTask.value?.id)
    if (index !== -1) {
      tasks.value[index] = data
    }
    isEditModalOpen.value = false
    toast.add({ title: t('toast.taskUpdated'), icon: 'i-lucide-check-circle' })
  }
  editLoading.value = false
}

const signOut = async () => {
  await client.auth.signOut()
  navigateTo('/')
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'error'
    case 'medium': return 'warning'
    case 'low': return 'success'
    default: return 'neutral'
  }
}

const formatDate = (dateString: string | null) => {
  if (!dateString || dateString === 'default' || dateString === 'No Date') return dateString || ''
  try {
    return format(parseISO(dateString), 'MMM d, yyyy')
  } catch (e) {
    return dateString
  }
}

const getDeadlineColor = (dateString: string | null, completed: boolean) => {
  if (!dateString || completed) return 'text-gray-500 dark:text-gray-400'
  const date = parseISO(dateString)
  if (isSameDay(date, new Date())) return 'text-yellow-500 dark:text-yellow-400 font-bold'
  if (isPast(date)) return 'text-red-500 dark:text-red-400 font-bold'
  return 'text-gray-500 dark:text-gray-400'
}

onMounted(() => {
  fetchTasks()
})
</script>

<template>
  <UContainer class="py-8 max-w-4xl">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
          {{ $t('dashboard.title') }}
        </h1>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          {{ $t('dashboard.welcome', { email: user?.email }) }}
        </p>
        <p class="text-xs text-gray-400 mt-1">
          {{ $t('dashboard.level', { level: level }) }} • {{ $t('dashboard.xp', { xp: xp }) }}
        </p>
      </div>
      <div class="flex gap-2">
        <div class="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            v-for="l in availableLocales"
            :key="l.code"
            @click="switchLocale(l.code as 'id' | 'en')"
            :class="[
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              locale === l.code 
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            ]"
          >
            {{ l.name }}
          </button>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          @click="signOut"
        />
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <UCard :ui="{ body: 'p-4' }">
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">
            {{ stats.pending }}
          </p>
          <p class="text-xs text-gray-500 uppercase font-semibold">
            {{ $t('dashboard.stats.pending') }}
          </p>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="text-center">
          <p class="text-2xl font-bold text-orange-500">
            {{ stats.dueToday }}
          </p>
          <p class="text-xs text-gray-500 uppercase font-semibold">
            {{ $t('dashboard.stats.dueToday') }}
          </p>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="text-center">
          <p class="text-2xl font-bold text-red-500">
            {{ stats.overdue }}
          </p>
          <p class="text-xs text-gray-500 uppercase font-semibold">
            {{ $t('dashboard.stats.overdue') }}
          </p>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="text-center">
          <p class="text-2xl font-bold text-green-500">
            {{ stats.completed }}
          </p>
          <p class="text-xs text-gray-500 uppercase font-semibold">
            {{ $t('dashboard.stats.completed') }}
          </p>
        </div>
      </UCard>
    </div>

    <!-- Progress Bar -->
    <div class="mb-8">
      <div class="flex justify-between text-sm mb-1">
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ $t('dashboard.levelProgress') }}</span>
        <span class="text-gray-500">{{ progress }} / 100 XP</span>
      </div>
      <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-primary-500 transition-all duration-500 ease-out rounded-full"
          :style="{ width: `${progress}%` }"
        />
      </div>
    </div>

    <!-- Add Task Form -->
    <form class="flex flex-col sm:flex-row gap-2 mb-8" @submit.prevent="addTask">
      <div class="flex-1 flex gap-2">
        <UInput
          v-model="newTask"
          :placeholder="$t('dashboard.addTask.placeholder')"
          class="flex-1"
          size="xl"
          :disabled="loading"
        />
        <UInput
          v-model="newDeadline"
          type="date"
          class="w-40"
          size="xl"
          :disabled="loading"
        />
        <USelect
          v-model="newPriority"
          :items="priorities"
          size="xl"
          class="w-32"
          :disabled="loading"
        />
      </div>
      <UButton
        type="submit"
        icon="i-lucide-plus"
        :loading="loading"
        size="xl"
        block
        class="sm:w-auto"
      >
        {{ $t('dashboard.addTask.button') }}
      </UButton>
    </form>

    <!-- Filters -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
      <UButton
        v-for="filter in filters"
        :key="filter.value"
        :label="$t(`dashboard.filters.${filter.value}`)"
        :variant="currentFilter === filter.value ? 'solid' : 'ghost'"
        color="neutral"
        size="sm"
        @click="currentFilter = filter.value"
      />
    </div>

    <!-- Task List -->
    <div class="space-y-6">
      <div v-for="(tasksGroup, dateKey) in groupedTasks" :key="dateKey">
        <UDivider v-if="currentFilter === 'upcoming'" :label="formatDate(dateKey)" class="mb-4" />
        
        <div class="space-y-3">
          <TransitionGroup name="list">
            <UCard
              v-for="task in tasksGroup"
              :key="task.id"
              :ui="{ body: 'p-3 sm:p-4' }"
              class="group ring-0 shadow-sm hover:shadow-md transition-shadow"
            >
              <div class="flex items-center gap-3">
                <UCheckbox
                  :model-value="task.completed"
                  color="primary"
                  @update:model-value="toggleTask(task)"
                />

                <div class="flex-1 min-w-0 flex flex-col">
                  <span
                    :class="[
                      'transition-all duration-200 truncate font-medium',
                      task.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'
                    ]"
                  >
                    {{ task.title }}
                  </span>
                  <div class="flex items-center gap-2 mt-1">
                    <span v-if="task.deadline" :class="['text-xs flex items-center gap-1', getDeadlineColor(task.deadline, task.completed)]">
                      <UIcon name="i-lucide-calendar" class="size-3" />
                      {{ formatDate(task.deadline) }}
                    </span>
                    <UBadge :color="getPriorityColor(task.priority)" variant="subtle" size="xs">
                      {{ $t(`common.priorities.${task.priority}`) }}
                    </UBadge>
                  </div>
                </div>

                <div class="flex gap-1">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-pencil"
                    size="xs"
                    @click="openEditModal(task)"
                  />
                  <UButton
                    color="error"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    size="xs"
                    @click="deleteTask(task.id)"
                  />
                </div>
              </div>
            </UCard>
          </TransitionGroup>
        </div>
      </div>

      <div v-if="filteredTasks.length === 0" class="text-center py-12">
        <UIcon name="i-lucide-clipboard-list" class="size-12 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500">
          {{ $t('dashboard.empty') }}
        </p>
      </div>
    </div>
  </UContainer>

    <!-- Edit Modal -->
    <UModal v-model:open="isEditModalOpen" :title="$t('dashboard.editTask')" :description="$t('dashboard.editDescription')">
      <template #body>
        <div class="space-y-4">
          <UFormField :label="$t('common.title')">
            <UInput v-model="editTitle" autofocus class="w-full" />
          </UFormField>

          <UFormField :label="$t('common.deadline')">
            <UInput v-model="editDeadline" type="date" class="w-full" />
          </UFormField>

          <UFormField :label="$t('common.priority')">
            <USelect v-model="editPriority" :items="priorities" class="w-full" />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isEditModalOpen = false">
            {{ $t('dashboard.cancel') }}
          </UButton>
          <UButton color="primary" :loading="editLoading" @click="saveEdit">
            {{ $t('dashboard.save') }}
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" :title="$t('dashboard.deleteTask')" :description="$t('dashboard.deleteConfirm')">
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isDeleteModalOpen = false">
            {{ $t('dashboard.cancel') }}
          </UButton>
          <UButton color="error" @click="confirmDelete">
            {{ $t('dashboard.delete') }}
          </UButton>
        </div>
      </template>
    </UModal>

</template>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
