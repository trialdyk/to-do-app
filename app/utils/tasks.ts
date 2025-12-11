export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'high': return 'error'
        case 'medium': return 'warning'
        case 'low': return 'success'
        default: return 'neutral'
    }
}

export const getDeadlineColor = (dateString: string | null, completed: boolean) => {
    if (!dateString || completed) return 'text-gray-500 dark:text-gray-400'
    const date = new Date(dateString)
    if (isToday(date)) return 'text-yellow-500 dark:text-yellow-400 font-bold'
    if (isPast(date)) return 'text-red-500 dark:text-red-400 font-bold'
    return 'text-gray-500 dark:text-gray-400'
}

// Simple date helpers since date-fns might not be auto-imported in utils without configuration
const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
}

const isPast = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
}
