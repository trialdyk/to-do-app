<script setup lang="ts">
import type { Database } from '../../../types/database.types'

definePageMeta({
  middleware: 'auth'
})

const props = defineProps<{
  project: Database['public']['Tables']['projects']['Row']
}>()

const client = useSupabaseClient<Database>()
const toast = useToast()
const route = useRoute()
const projectId = route.params.id as string

// State
const roles = ref<Database['public']['Tables']['roles']['Row'][]>([])
const members = ref<(Database['public']['Tables']['project_members']['Row'] & { users: { email: string } })[]>([])
const loading = ref(true)
const saving = ref(false)

// Project Settings
const projectName = ref('')
const projectDescription = ref('')

const tabs = [
  { label: 'General', slot: 'general', icon: 'i-lucide-settings-2' },
  { label: 'Members', slot: 'members', icon: 'i-lucide-users' },
  { label: 'Roles', slot: 'roles', icon: 'i-lucide-shield' }
]

// Role Management
const isRoleModalOpen = ref(false)
const editingRole = ref<Database['public']['Tables']['roles']['Row'] | null>(null)
const roleName = ref('')
const roleLevel = ref(1) // Keep level for hierarchy sorting if needed, or hide it.
// Removed permissions ref

// Member Management
const isInviteModalOpen = ref(false)
const inviteEmail = ref('')
const inviteRole = ref('')

const fetchData = async () => {
  loading.value = true
  
  // Fetch Project Details
  const { data: projectData } = await client
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
    
  if (projectData) {
    projectName.value = projectData.name
    projectDescription.value = projectData.description || ''
  }

  // Fetch Roles
  const { data: rolesData } = await client
    .from('roles')
    .select('*')
    .eq('project_id', projectId)
    .order('level', { ascending: false })
    
  if (rolesData) roles.value = rolesData

  // Fetch Members
  const { data: membersData } = await client
    .from('project_members')
    .select('*, users(email)')
    .eq('project_id', projectId)
  
  if (membersData) {
    // @ts-expect-error: Supabase types for joined tables are tricky
    members.value = membersData
  }

  loading.value = false
}

const saveProjectSettings = async () => {
  if (!projectName.value.trim()) return

  saving.value = true
  const { error } = await client
    .from('projects')
    .update({
      name: projectName.value,
      description: projectDescription.value
    })
    .eq('id', projectId)

  if (error) {
    toast.add({ title: 'Error saving settings', color: 'error' })
  } else {
    toast.add({ title: 'Settings saved', icon: 'i-lucide-check-circle' })
  }
  saving.value = false
}

// Role Actions
const openRoleModal = (roleData?: any) => {
  if (roleData) {
    const role = roleData as Database['public']['Tables']['roles']['Row']
    editingRole.value = role
    roleName.value = role.name
    roleLevel.value = role.level
    // No permissions to load
  } else {
    editingRole.value = null
    roleName.value = ''
    roleLevel.value = 1
    // No permissions to reset
  }
  isRoleModalOpen.value = true
}

const saveRole = async () => {
  if (!roleName.value) return

  const payload = {
    project_id: projectId,
    name: roleName.value,
    level: roleLevel.value,
    permissions: {} // Send empty JSON or whatever default
  }

  if (editingRole.value) {
    const { error } = await client.from('roles').update(payload).eq('id', editingRole.value.id)
    if (error) throw error
    toast.add({ title: 'Role updated' })
  } else {
    const { error } = await client.from('roles').insert(payload)
    if (error) throw error
    toast.add({ title: 'Role created' })
  }
  
  isRoleModalOpen.value = false
  fetchData()
}

const deleteRole = async (id: string) => {
  if (!confirm('Are you sure?')) return
  await client.from('roles').delete().eq('id', id)
  fetchData()
}

// Member Actions
const inviteMember = async () => {
  if (!inviteEmail.value) return

  try {
    loading.value = true
    const { data, error } = await useFetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        body: { email: inviteEmail.value }
    })

    if (error.value) throw error.value

    toast.add({ title: 'Invitation sent', description: `Invite sent to ${inviteEmail.value}` })
    isInviteModalOpen.value = false
    inviteEmail.value = ''
  } catch (e: any) {
    toast.add({ title: 'Error sending invite', description: e.message || 'Unknown error', color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>

  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Project Settings</h1>
    </div>

    <UTabs :items="tabs" class="w-full">
      <!-- General Tab -->
      <template #general="{ item }">
        <UCard>
          <template #header>
            <h3 class="text-lg font-medium">General Settings</h3>
          </template>
          
          <div class="space-y-4">
            <UFormField label="Project Name">
              <UInput v-model="projectName" />
            </UFormField>
            <UFormField label="Description">
              <UTextarea v-model="projectDescription" />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex justify-end">
              <UButton :loading="saving" @click="saveProjectSettings">Save Changes</UButton>
            </div>
          </template>
        </UCard>
      </template>

      <!-- Members Tab -->
      <template #members="{ item }">
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium">Team Members</h3>
              <UButton icon="i-lucide-user-plus" size="sm" @click="isInviteModalOpen = true">Invite Member</UButton>
            </div>
          </template>

          <UTable :rows="members" :columns="[{ key: 'users.email', label: 'Email' }, { key: 'joined_at', label: 'Joined' }]">
            <template #users.email-data="{ row }">
              {{ row.users?.email }}
            </template>
            <template #joined_at-data="{ row }">
              {{ new Date(row.joined_at).toLocaleDateString() }}
            </template>
          </UTable>
        </UCard>
      </template>

      <!-- Roles Tab -->
      <template #roles="{ item }">
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-medium">Roles & Permissions</h3>
              <UButton icon="i-lucide-plus" size="sm" @click="openRoleModal()">Add Role</UButton>
            </div>
          </template>
          
          <UTable :rows="roles" :columns="[{ key: 'name', label: 'Role' }, { key: 'level', label: 'Level' }, { key: 'actions' }]">
            <template #actions-data="{ row }">
              <div class="flex gap-2">
                <UButton color="neutral" variant="ghost" icon="i-lucide-pencil" size="xs" @click="openRoleModal(row)" />
                <UButton color="error" variant="ghost" icon="i-lucide-trash-2" size="xs" @click="deleteRole(row.id)" />
              </div>
            </template>
          </UTable>
        </UCard>
      </template>
    </UTabs>

    <!-- Role Modal -->
    <UModal v-model:open="isRoleModalOpen" :title="editingRole ? 'Edit Role' : 'Create Role'">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Role Name">
            <UInput v-model="roleName" />
          </UFormField>
          <UFormField label="Level (Higher = More Authority)">
            <UInput v-model="roleLevel" type="number" min="1" />
          </UFormField>
          
          <div class="space-y-2">
            <p class="text-sm text-gray-500">Roles are now just badges to identify team members.</p>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isRoleModalOpen = false">Cancel</UButton>
          <UButton color="primary" @click="saveRole">Save</UButton>
        </div>
      </template>
    </UModal>

    <!-- Invite Modal -->
    <UModal v-model:open="isInviteModalOpen" title="Invite Member">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Email Address">
            <UInput v-model="inviteEmail" type="email" placeholder="colleague@example.com" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="isInviteModalOpen = false">Cancel</UButton>
          <UButton color="primary" @click="inviteMember">Send Invite</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
