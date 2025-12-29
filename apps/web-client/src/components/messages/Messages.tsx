import TypingIndicator from '@/components/messages/message-types/TypingIndicator'
import { classnames } from '@/shared/utils'
import { Message } from '@/store/slices/messages.slice'
import { User } from '@/store/slices/user.slice'
import { Fragment, memo } from 'react'
import { MessageGroup } from './MessageGroup'

interface Props {
	messages: {
		key: string
		sender_id: string
		messages: Message[]
	}[]
	isTyping: boolean
	user: User
}

const ListItems = memo(({ messages, userId }: { messages: Props['messages']; userId: string }) => (
	<Fragment>
		{messages.map(message => (
			<li
				key={message.key}
				className={classnames({
					'self-end message-outgoing': message.sender_id === userId,
					'self-start message-incoming': message.sender_id !== userId,
				})}
			>
				<MessageGroup
					datetime={message.key}
					messages={message.messages}
					isOwner={message.sender_id === userId}
				/>
			</li>
		))}
	</Fragment>
))

const _Messages = ({ messages, isTyping, user }: Props) => {
	return (
		<ul className='messages space-y-1 flex flex-col gap-4'>
			<ListItems messages={messages} userId={user._id} />

			{isTyping && <TypingIndicator key='typing-indicator' />}
		</ul>
	)
}

export const Messages = memo(_Messages)
