import { MessageType } from '@/types'
import { TextMessage } from './message-types/TextMessage'
import { ImageMessage } from './message-types/ImageMessage'
import { AudioMessage } from './message-types/AudioMessage'
import { VideoMessage } from './message-types/VideoMessage'
import { DocumentMessage } from './message-types/DocumentMessage'
import { StickerMessage } from './message-types/StickerMessage'
import { ContactsMessage } from './message-types/ContactsMessage'
import { LocationMessage } from './message-types/LocationMessage'
import { useAuth } from '../../context/AuthContext'
import { Message } from '../../store/slices/messages.slice'

interface Props {
    message: Message
    onQuickReply?: (context: { message_id: string; name: string; payload: string }) => void
    onReply?: (message: Message) => void
    isOwner: boolean
}

export const MessageBubble = ({ message, isOwner }: Props) => {
    const auth = useAuth()
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
    }
    const createdAt = formatTime(new Date(message.created_at))

    const renderMessageContent = () => {
        switch (message.type) {
            case MessageType.Text:
                return () => <TextMessage payload={message.payload} time={createdAt} isOwner={isOwner} user={auth} />
            case MessageType.Image:
                return () => <ImageMessage payload={message.payload} message={message} time={createdAt} user={auth} />
            case MessageType.Audio:
                return () => <AudioMessage payload={message.payload} message={message} auth={auth} />
            case MessageType.Video:
                return () => <VideoMessage message={message} payload={message.payload} auth={auth} />
            case MessageType.Sticker:
                return () => <StickerMessage payload={message.payload} />
            case MessageType.Document:
                return () => <DocumentMessage payload={message.payload} time={createdAt} />
            case MessageType.Contacts:
                return () => <ContactsMessage payload={message.payload} time={createdAt} />
            case MessageType.Location:
                return () => <LocationMessage payload={message.payload} time={createdAt} />
            default:
                return null
        }
    }

    const MessageComponent = renderMessageContent()
    if (!MessageComponent) return null

    return (
        <div
            key={message._id}
            className={`flex items-end message-box group text-neutral-200 font-normal ${
                isOwner ? 'justify-end outgoing' : 'justify-start incoming'
            } message-${message.type}`}
        >
            <div className='relative max-w-xs md:max-w-sm min-w-[8ch] '>
                <MessageComponent />
            </div>
        </div>
    )
}
