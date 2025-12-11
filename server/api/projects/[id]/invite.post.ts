import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
    const projectId = event.context.params?.id
    const body = await readBody(event)
    const email = body.email

    if (!projectId || !email) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Project ID and Email are required'
        })
    }

    const client = await serverSupabaseClient<Database>(event)
    const user = await serverSupabaseUser(event)

    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
    }

    // 1. Check if user is owner (or has permission - handled by RLS but good to check status)
    // For now we rely on RLS provided in the migration.

    // 2. Insert Invite
    const { data, error } = await client
        .from('project_invites')
        .insert({
            project_id: projectId,
            email: email,
            status: 'pending'
        })
        .select()
        .single()

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }

    return { success: true, invite: data }
})
