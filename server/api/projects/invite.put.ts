import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import type { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
    const body = await readBody(event)
    const { inviteId, accept } = body

    if (!inviteId) {
        throw createError({ statusCode: 400, statusMessage: 'Invite ID required' })
    }

    const user = await serverSupabaseUser(event)
    if (!user) {
        throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    }

    const client = await serverSupabaseClient<Database>(event)

    // 1. Get the invite to verify ownership and get project_id
    const { data: invite, error: fetchError } = await client
        .from('project_invites')
        .select('*')
        .eq('id', inviteId)
        .single()

    if (fetchError || !invite) {
        throw createError({ statusCode: 404, statusMessage: 'Invite not found' })
    }

    // Double check email matches (though RLS should handle this, safety first)
    if (invite.email !== user.email) {
        throw createError({ statusCode: 403, statusMessage: 'Not authorized for this invite' })
    }

    if (invite.status !== 'pending') {
        throw createError({ statusCode: 400, statusMessage: 'Invite already processed' })
    }

    // 2. Update status
    const newStatus = accept ? 'accepted' : 'declined'

    const { error: updateError } = await client
        .from('project_invites')
        .update({ status: newStatus })
        .eq('id', inviteId)

    if (updateError) {
        throw createError({ statusCode: 500, statusMessage: updateError.message })
    }

    // 3. If accepted, add to project_members
    if (accept) {
        const { error: memberError } = await client
            .from('project_members')
            .insert({
                project_id: invite.project_id,
                user_id: user.id
            })

        if (memberError) {
            // Rollback invite status if member insertion fails (simple manual rollback attempt)
            await client.from('project_invites').update({ status: 'pending' }).eq('id', inviteId)
            throw createError({ statusCode: 500, statusMessage: 'Failed to join project' })
        }
    }

    return { success: true }
})
