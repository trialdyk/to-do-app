import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
    const user = await serverSupabaseUser(event)
    if (!user || !user.email) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const client = await serverSupabaseClient<Database>(event)

    // Fetch invites where email matches user's email
    const { data, error } = await client
        .from('project_invites')
        .select('*, projects(name)')
        .eq('email', user.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) {
        throw createError({ statusCode: 500, statusMessage: error.message })
    }

    return { invites: data }
})
