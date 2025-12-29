import { Message } from '@/store/slices/messages.slice'
import { format, parse } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageBubble } from '@/components/messages/Message'
import { classnames } from '@/shared/utils'
import { memo } from 'react'

interface Props {
	datetime: string
	isOwner: boolean
	messages: Message[]
	handleDeleteMessage?: (messageId: string) => void
}

export const _MessageGroup = ({ datetime, isOwner, messages }: Props) => {
	return (
		<div className={`flex flex-col gap-2 ${isOwner ? 'self-end' : 'self-start'}`}>
			<AnimatePresence initial={false} mode='popLayout'>
				{messages.map(msg => (
					<motion.div
						key={msg._id}
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.2 }}
					>
						<MessageBubble message={msg} isOwner={isOwner} />
					</motion.div>
				))}
			</AnimatePresence>

			<time
				className={classnames(`text-[11px] block text-neutral-500 px-2`, {
					'text-end -mt-1': isOwner,
					'text-start -ml-1': !isOwner,
				})}
			>
				{format(parse(datetime, 'yyyy-MM-dd HH:mm', new Date()), 'h:mm a')}
			</time>
		</div>
	)
}

// Prevent unnecessary re-renders
export const MessageGroup = memo(_MessageGroup, (prev, next) => {
	if (prev.datetime !== next.datetime) return false
	if (prev.isOwner !== next.isOwner) return false
	if (prev.messages.length !== next.messages.length) return false
	const prevLast = prev.messages[prev.messages.length - 1]?._id
	const nextLast = next.messages[next.messages.length - 1]?._id
	return prevLast === nextLast
})
