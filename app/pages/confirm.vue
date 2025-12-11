<script setup lang="ts">
const user = useSupabaseUser()

watch(user, () => {
  if (user.value) {
    return navigateTo('/dashboard')
  }
}, { immediate: true })
</script>

<template>
  <UContainer>
    <div class="flex items-center justify-center w-full h-full">
      <UIcon name="i-lucide-loader-2" class="animate-spin size-8" />
      <span class="ml-2">Logging in...</span>
    </div>
  </UContainer>
</template>
