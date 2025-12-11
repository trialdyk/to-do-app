import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~~/app/types/database.types'

export default defineEventHandler(async (event) => {
    const client = await serverSupabaseClient<Database>(event)
    const user = await serverSupabaseUser(event)

    // Check authentication
    if (!user) {
        throw createError({
            statusCode: 401,
            statusMessage: 'Unauthorized'
        })
    }

    const query = getQuery(event)
    const search = query.search as string
    const status = query.status as string

    let dbQuery = client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

    // Apply Search
    if (search) {
        dbQuery = dbQuery.ilike('title', `%${search}%`)
    }

    // Apply Filter
    if (status === 'completed') {
        dbQuery = dbQuery.eq('completed', true)
    } else if (status === 'pending') {
        dbQuery = dbQuery.eq('completed', false)
    }

    // Use RLS (Supabase handles this automatically based on authenticated user in client)
    // Note: serverSupabaseClient uses the usage user session, so RLS applies.

    const { data, error } = await dbQuery

    if (error) {
        throw createError({
            statusCode: 500,
            statusMessage: error.message
        })
    }

    return data || []
})
