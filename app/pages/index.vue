<script setup lang="ts">
definePageMeta({
  layout: 'empty',
  middleware: 'guest'
})
const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const loading = ref(false)
const isSignUp = ref(false)
const errorMsg = ref('')

const handleEmailAuth = async () => {
  if (!email.value || !password.value) return

  loading.value = true
  errorMsg.value = ''

  try {
    if (isSignUp.value) {
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
        options: {
          emailRedirectTo: window.location.origin + '/confirm'
        }
      })
      if (error) throw error
      if (!error) alert('Check your email for the confirmation link!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      if (error) throw error
    }
  } catch (error) {
    if (error instanceof Error) {
      errorMsg.value = error.message
    }
  } finally {
    loading.value = false
  }
}

const signInWithGoogle = async () => {
  loading.value = true
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/confirm'
    }
  })
  if (error) {
    errorMsg.value = error.message
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {{ isSignUp ? $t('auth.createAccount') : $t('auth.welcome') }}
        </h1>
        <p class="text-center text-gray-500 dark:text-gray-400 mt-1 text-sm">
          {{ isSignUp ? $t('auth.signUpSubtitle') : $t('auth.signInSubtitle') }}
        </p>
      </template>

      <div class="flex flex-col gap-4">
        <UButton
          icon="logos:google-icon"
          :label="$t('auth.continueWithGoogle')"
          color="neutral"
          variant="soft"
          block
          :loading="loading"
          @click="signInWithGoogle"
        />

        <div class="relative flex items-center py-2">
          <div class="flex-grow border-t border-gray-200 dark:border-gray-700" />
          <span class="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">{{ $t('auth.or') }}</span>
          <div class="flex-grow border-t border-gray-200 dark:border-gray-700" />
        </div>

        <form class="flex flex-col gap-4" @submit.prevent="handleEmailAuth">
          <UFormField :label="$t('auth.email')" name="email">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              icon="i-lucide-mail"
              :disabled="loading"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField :label="$t('auth.password')" name="password">
            <UInput
              v-model="password"
              type="password"
              placeholder="••••••••"
              icon="i-lucide-lock"
              :disabled="loading"
              required
              class="w-full"
            />
          </UFormField>

          <div v-if="errorMsg" class="text-red-500 text-sm text-center">
            {{ errorMsg }}
          </div>

          <UButton
            type="submit"
            :label="isSignUp ? $t('auth.signUp') : $t('auth.signIn')"
            color="primary"
            block
            :loading="loading"
          />
        </form>

        <div class="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
          {{ isSignUp ? $t('auth.haveAccount') : $t('auth.noAccount') }}
          <button
            type="button"
            class="text-primary-600 dark:text-primary-400 hover:underline font-medium ml-1"
            @click="isSignUp = !isSignUp"
          >
            {{ isSignUp ? $t('auth.signIn') : $t('auth.signUp') }}
          </button>
        </div>
      </div>
    </UCard>
  </div>
</template>
