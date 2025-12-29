import { useEffect, useMemo } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { socket } from '../websocket'
import { useAppSelector, useAppDispatch } from '@/store/hooks'
import { ConnectionEventType, MessageEventType } from '@shared/event-types'
import { Message, onIncomingMessage, updateMessageStatus } from '@/store/slices/messages.slice'
import { ConversationList } from '@/components/conversation/ConversationList'
import sound from '@/assets/audio/tic-tic.mp3'
import { cipher } from '@/crypto/new-cipher'
import {
    Conversation,
    fetchConversationPaginated,
    selectAllConversations,
    selectConversationById,
    updateLastMessage,
    updateTypingStatus,
} from '@/store/slices/conversation.slice'
import { MessageType } from '../types'

// Images
import img1 from '@/assets/img/paper.jpg'
import img2 from '@/assets/img/woman-draft.jpg'
import img3 from '@/assets/img/woman.jpg'
import { Background } from '@/store/slices/settings.slice'

const playSound = () => {
    try {
        const audio = new Audio(sound)
        audio.volume = 0.5
        audio.play()
    } catch (error) {
        console.log(error)
    }
}

const typingTimeouts = new Map<string, NodeJS.Timeout>()

export const ChatLayout = () => {
    const user = useAppSelector(state => state.users.user)
    const conversations = useAppSelector(selectAllConversations)
    const isLoading = useAppSelector(state => state.conversations.loaders.pagination)
    const settings = useAppSelector(state => state.settings)

    const params = useParams()
    const conversationId = useMemo(() => params.conversation_id, [params.conversation_id])

    const conversation = useAppSelector(state => selectConversationById(state, conversationId))

    const dispatch = useAppDispatch()

    useEffect(() => {
        socket.setAuthKeyRecover(() => localStorage.getItem('auth-token'))
        socket.connectWith()

        const connectionHandlers = {
            // ! TODO  - update contact status
            userOnline: (_data: any) => {
                // dispatch(updateContactStatus({ userId: data.userId, status: true }))
            },
            // ! TODO  - update contact status
            userOffline: (_data: any) => {
                // dispatch(updateContactStatus({ userId: data.userId, status: false }))
            },
            userTypingStart: (data: any) => {
                dispatch(updateTypingStatus({ conversationId: data.conversation_id, isTyping: true }))

                if (typingTimeouts.has(conversationId)) {
                    clearTimeout(typingTimeouts.get(conversationId))
                }

                const timeout = setTimeout(() => {
                    dispatch(updateTypingStatus({ conversationId: data.conversation_id, isTyping: false }))
                    typingTimeouts.delete(conversationId)
                }, 2000)

                typingTimeouts.set(conversationId, timeout)
            },
        }

        socket.listen(ConnectionEventType.USER_ONLINE, connectionHandlers.userOnline)
        socket.listen(ConnectionEventType.USER_OFFLINE, connectionHandlers.userOffline)
        socket.listen(ConnectionEventType.USER_TYPING_START, connectionHandlers.userTypingStart)

        const messageHandlers = {
            statusChanged: (data: any) => {
                dispatch(
                    updateMessageStatus({
                        messageIds: data.messageIds,
                        status: data.status,
                        conversationId: data.conversationId,
                    })
                )
            },
            onIncomingMessage: async ({ message, conversation }: { message: Message; conversation: Conversation }) => {
                playSound()
                dispatch(updateTypingStatus({ conversationId: conversation._id, isTyping: false }))

                const sender = conversation.participants.find(p => p._id == message.sender_id)
                if (sender?.public_key) {
                    await cipher.registerPeerPublicKey(conversation._id, sender.public_key)
                }

                if (message.type === MessageType.Text) {
                    const body = await cipher.decryptText(message.payload.body, conversation._id)
                    message.payload.body = body
                }

                // The sender of the message is the recipient of the conversation (because the sender is the one who sent the message)
                conversation.recipient = sender
                conversation.last_message = {
                    _id: message._id,
                    type: message.type as any,
                    payload: message.payload,
                    status: message.status,
                    created_at: message.created_at,
                }
                conversation.name = sender?.username || 'Anomous'
                conversation.isTyping = false

                dispatch(updateLastMessage({ conversationId: conversation._id, message: conversation.last_message }))
                dispatch(onIncomingMessage({ message, conversation }))
            },
        }

        socket.listen(MessageEventType.MESSAGE_INCOMING, messageHandlers.onIncomingMessage)
        socket.listen(MessageEventType.MESSAGE_CHANGED_STATUS, messageHandlers.statusChanged)

        return () => {
            socket.off(MessageEventType.MESSAGE_INCOMING, messageHandlers.onIncomingMessage)
            socket.off(MessageEventType.MESSAGE_CHANGED_STATUS, messageHandlers.statusChanged)

            socket.off(ConnectionEventType.USER_ONLINE, connectionHandlers.userOnline)
            socket.off(ConnectionEventType.USER_OFFLINE, connectionHandlers.userOffline)
            socket.off(ConnectionEventType.USER_TYPING_START, connectionHandlers.userTypingStart)
        }
    }, [dispatch, user?._id])

    useEffect(() => {
        dispatch(
            fetchConversationPaginated({
                limit: 15,
            })
        )
    }, [])

    const img = useMemo(() => {
        const map: Record<Background, string> = {
            paper: img1,
            womanDraft: img2,
            woman: img3,
            default: img1,
        }

        if (settings.background === 'default') {
            const values = Object.values(map)
            const randomIndex = Math.floor(Math.random() * values.length)

            return values[randomIndex]
        }

        return map[settings.background]
    }, [settings.background])

    return (
        <div
            className={`flex h-screen ${
                settings.theme === 'dark' ? 'bg-neutral-900 text-white' : 'bg-white text-neutral-900'
            }`}
        >
            <div className='w-80 shrink-0 px-4 border-r border-neutral-800 h-full flex flex-col'>
                <ConversationList
                    conversations={conversations}
                    currentConversation={conversation}
                    loading={isLoading}
                    user={user}
                />
            </div>
            <div className='w-full chat-background' style={{ backgroundImage: `url(${img})` }}>
                <Outlet />
            </div>
        </div>
    )
}
