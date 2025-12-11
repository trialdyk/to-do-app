<script setup lang="ts">
import type { Database } from '../../types/database.types'

definePageMeta({
  middleware: 'auth'
})

const client = useSupabaseClient<Database>()
const user = useSupabaseUser()
const toast = useToast()
const { t } = useI18n()

const loading = ref(true)
const saving = ref(false)
const profile = ref<Database['public']['Tables']['profiles']['Row'] | null>(null)

// Form State
const fullName = ref('')
const bio = ref('')
const tags = ref<string[]>([])
const newTag = ref('')

const { getCurrentUser, requireUser } = useAuth()

const fetchProfile = async () => {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    loading.value = false
    return
  }

  loading.value = true
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single()

  if (data) {
    profile.value = data
    fullName.value = data.full_name || ''
    bio.value = data.bio || ''
    tags.value = data.tags || []
  } else if (error && error.code === 'PGRST116') {
    // Profile doesn't exist, sync from Google Auth metadata
    await syncProfile(currentUser)
  }
  
  loading.value = false
}

const syncProfile = async (currentUser: any) => {
  if (!currentUser || !currentUser.id) return

  const metadata = currentUser.user_metadata || {}
  const newProfile = {
    id: currentUser.id,
    email: currentUser.email as string,
    full_name: metadata.full_name || metadata.name || '',
    avatar_url: metadata.avatar_url || metadata.picture || '',
    created_at: new Date().toISOString()
  }

  const { data, error } = await client.from('profiles').insert(newProfile).select().single()
  
  if (data) {
    profile.value = data
    fullName.value = data.full_name || ''
    profile.value = data
    fullName.value = data.full_name || ''
    toast.add({ title: t('settings.profile.toast.syncSuccess'), color: 'success' })
  } else if (error) {
    console.error('Error syncing profile:', error)
  }
}

const saveProfile = async () => {
  try {
    const currentUser = await requireUser()
    
    saving.value = true
    const updates = {
      full_name: fullName.value,
      bio: bio.value,
      tags: tags.value,
      updated_at: new Date().toISOString()
    }

    const { error } = await client.from('profiles').update(updates).eq('id', currentUser.id)

    if (error) {
      toast.add({ title: t('settings.profile.toast.saveError'), color: 'error' })
    } else {
      toast.add({ title: t('settings.profile.toast.saveSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
      if (profile.value) {
        profile.value = { ...profile.value, ...updates }
      }
    }
  } catch (e) {
    toast.add({ title: t('settings.profile.toast.unauthenticated'), color: 'error' })
  } finally {
    saving.value = false
  }
}

const addTag = () => {
  if (newTag.value.trim() && !tags.value.includes(newTag.value.trim())) {
    tags.value.push(newTag.value.trim())
    newTag.value = ''
  }
}

const removeTag = (tag: string) => {
  tags.value = tags.value.filter(t => t !== tag)
}

onMounted(() => {
  if (user.value) {
    fetchProfile()
  } else {
    // Watch for user to become available
    const unwatch = watch(user, (newUser) => {
      if (newUser) {
        fetchProfile()
        unwatch()
      }
    })
    // Safety timeout
    setTimeout(() => {
      loading.value = false
    }, 2000)
  }
})
</script>

<template>
  <div>
    <UPageCard
      :title="t('settings.profile.title')"
      :description="t('settings.profile.description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        :loading="saving"
        :label="t('settings.profile.save')"
        color="primary"
        class="w-fit lg:ms-auto"
        @click="saveProfile"
      />
    </UPageCard>

    <div v-if="loading" class="space-y-4">
      <USkeleton class="h-32 w-full rounded-lg" />
      <USkeleton class="h-10 w-full" />
      <USkeleton class="h-10 w-full" />
    </div>

    <div v-else class="space-y-8">
      <!-- Profile Header -->
      <div class="flex items-center gap-6 p-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
        <UAvatar
          :src="profile?.avatar_url || user?.user_metadata?.avatar_url"
          :alt="fullName"
          size="3xl"
        />
        <div>
          <h2 class="text-xl font-semibold">{{ fullName || 'Anonymous' }}</h2>
          <p class="text-gray-500">{{ user?.email }}</p>
        </div>
      </div>

      <!-- Edit Form -->
      <UCard>
        <div class="space-y-6">
          <UFormField :label="t('settings.profile.fullName')">
            <UInput v-model="fullName" icon="i-lucide-user" />
          </UFormField>

          <UFormField :label="t('settings.profile.bio')">
            <UTextarea v-model="bio" :placeholder="t('settings.profile.bioPlaceholder')" :rows="4" />
          </UFormField>

          <UFormField :label="t('settings.profile.tags')">
            <div class="space-y-3">
              <div class="flex gap-2">
                <UInput 
                  v-model="newTag" 
                  :placeholder="t('settings.profile.addTagPlaceholder')" 
                  @keyup.enter="addTag"
                  class="flex-1"
                />
                <UButton icon="i-lucide-plus" color="neutral" variant="soft" @click="addTag" />
              </div>
              
              <div class="flex flex-wrap gap-2">
                <UBadge 
                  v-for="tag in tags" 
                  :key="tag" 
                  color="primary" 
                  variant="subtle"
                  class="cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900"
                  @click="removeTag(tag)"
                >
                  {{ tag }}
                  <UIcon name="i-lucide-x" class="ml-1 w-3 h-3" />
                </UBadge>
              </div>
            </div>
          </UFormField>
        </div>
      </UCard>
    </div>
  </div>
</template>
