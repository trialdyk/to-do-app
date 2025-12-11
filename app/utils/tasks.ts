import { format, isSameDay, isPast, parseISO } from 'date-fns'

export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'high': return 'error'
        case 'medium': return 'warning'
        case 'low': return 'success'
        default: return 'neutral'
    }
}

export const formatDate = (dateString: string | null) => {
    if (!dateString || dateString === 'default' || dateString === 'No Date') return dateString || ''
    try {
        return format(parseISO(dateString), 'MMM d, yyyy')
    } catch (e) {
        return dateString
    }
}

export const getDeadlineColor = (dateString: string | null, completed: boolean) => {
    if (!dateString || completed) return 'text-gray-500 dark:text-gray-400'
    const date = parseISO(dateString)
    if (isSameDay(date, new Date())) return 'text-yellow-500 dark:text-yellow-400 font-bold'
    if (isPast(date)) return 'text-red-500 dark:text-red-400 font-bold'
    return 'text-gray-500 dark:text-gray-400'
}
