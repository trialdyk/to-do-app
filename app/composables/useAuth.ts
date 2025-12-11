export const useAuth = () => {
    const user = useSupabaseUser()
    const client = useSupabaseClient()

    /**
     * robustly gets the current user, refreshing the session if necessary.
     * This helps when useSupabaseUser() might be momentarily null or out of sync.
     */
    const getCurrentUser = async () => {
        // 1. Try the reactive user ref first
        if (user.value && user.value.id) {
            console.log('useAuth: Using reactive user', user.value.id)
            return user.value
        }

        // 2. Fallback: Try to fetch the session from Supabase (checks storage/cookies)
        console.log('useAuth: Reactive user missing/incomplete. Fetching session...')
        const { data } = await client.auth.getSession()
        if (data.session?.user && data.session.user.id) {
            console.log('useAuth: Session found', data.session.user.id)
            return data.session.user
        }

        // 3. Last resort: Get user from API (verifies with server)
        console.log('useAuth: Session missing. Fetching from API...')
        const { data: userData } = await client.auth.getUser()
        if (userData.user && userData.user.id) {
            console.log('useAuth: API user found', userData.user.id)
            return userData.user
        }

        console.log('useAuth: No user found')
        return null
    }

    /**
     * Ensures a user is logged in, throwing an error if not.
     * Useful for actions that strictly require auth (like saving data).
     */
    const requireUser = async () => {
        const u = await getCurrentUser()
        if (!u) {
            throw new Error('User not authenticated')
        }
        return u
    }

    return {
        user,
        getCurrentUser,
        requireUser
    }
}
