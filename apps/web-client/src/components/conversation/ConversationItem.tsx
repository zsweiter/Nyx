import { motion } from 'framer-motion'
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns'
import type { Conversation } from '@/store/slices/conversation.slice'
import { useMemo } from 'react'
import { useAppSelector } from '@/store/hooks'

interface Props {
    conversation: Conversation
    isActive: boolean
    onClick: (id: string) => void
}

function formatRelativeShort(date: Date) {
    const now = new Date()
    const diffMins = differenceInMinutes(now, date)

    if (diffMins < 60) return `${diffMins}m`
    const diffHours = differenceInHours(now, date)
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = differenceInDays(now, date)
    return `${diffDays}d`
}

export const ConversationItem = ({ conversation, isActive, onClick }: Props) => {
    const superAnonymous = useAppSelector(state => state.settings.superAnonymous)
    const messageText = useMemo(() => {
        const last = conversation.last_message
        if (!last) return 'Empty'
        if (conversation.anonymous || superAnonymous) return '***********'
 
        switch (last.type) {
            case 'text':
                return String(last.payload.body)
            case 'image':
                return 'Image'
            case 'video':
                return 'Video'
            case 'audio':
                return 'Audio'
            case 'document':
                return 'Document'
            case 'sticker':
                return 'Sticker'
            case 'contacts':
                return 'Contacts'
            case 'location':
                return 'Location'
            case 'template':
                return 'Template'
            default:
                return ''
        }
    }, [conversation.last_message, conversation.anonymous, superAnonymous])

    const lastMessageTime = conversation.last_message?.created_at
        ? formatRelativeShort(new Date(conversation.last_message.created_at))
        : 'Just now'

    return (
        <motion.li
            layout
            key={conversation._id}
            initial={conversation.created_at === conversation.updated_at ? { opacity: 0, y: 10 } : false}
            animate={conversation.created_at === conversation.updated_at ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.3 }}
            onClick={() => onClick(conversation._id)}
            className={`flex items-center gap-3 px-4 h-18 cursor-pointer border-b border-neutral-800 transition-colors ${
                isActive ? 'bg-neutral-950' : 'hover:bg-neutral-800'
            }`}
        >
            <img
                src={conversation.recipient?.avatar || ''}
                alt={conversation.name}
                className='h-12 w-12 rounded-full object-cover'
            />

            <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between'>
                    <span className='font-semibold text-teal-500 truncate'>{conversation.name || 'Sin nombre'}</span>
                </div>
                <div className='flex items-center justify-between mt-1'>
                    <span className='text-xs text-neutral-300 truncate pr-2 max-w-[20ch]'>{messageText}</span>
                    {!isActive && conversation.unreads && Number(conversation.unreads) > 0 ? (
                        <span className='ml-2 bg-teal-500 text-black text-[10px] font-semibold px-2 py-0.5 rounded-full'>
                            {Number(conversation.unreads)}
                        </span>
                    ) : undefined}
                    <span className='text-xs text-neutral-400'>{lastMessageTime}</span>
                </div>
            </div>
        </motion.li>
    )
}
