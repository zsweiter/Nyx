import { createSlice, createAction, PayloadAction, createSelector } from '@reduxjs/toolkit'
import { RootState } from '..'
import { format } from 'date-fns'
import { Conversation, fetchConversationById } from './conversation.slice'
import { MessagePayload, MessageType } from '../../types'

export type Message = {
    _id: string
    conversation_id: string
    owner_id: string
    recipient_id: string
    sender_id: string
    status?: 'sent' | 'delivered' | 'read' | 'pending'
    edited?: boolean
    created_at: string
    updated_at: string
} & MessagePayload

type ConversationMessages = {
    ids: string[]
    entities: Record<string, Message>
}

type MessagesState = {
    byConversation: Record<string, ConversationMessages>
    currentConversationId: string | null
}

const initialState: MessagesState = {
    byConversation: {},
    currentConversationId: null,
}

export const onIncomingMessage = createAction<{
    message: Message
    conversation: Conversation
}>('messages/onIncomingMessage')

const messagesSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setCurrentConversationId: (state, action: PayloadAction<string | null>) => {
            state.currentConversationId = action.payload
        },

        addMessage: (state, action: PayloadAction<Message>) => {
            const { conversation_id, _id } = action.payload

            if (!state.byConversation[conversation_id]) {
                state.byConversation[conversation_id] = {
                    ids: [],
                    entities: {},
                }
            }

            const conv = state.byConversation[conversation_id]

            if (!conv.entities[_id]) {
                conv.ids.push(_id)
                conv.entities[_id] = action.payload
            }
        },

        pushMessage: (state, action: PayloadAction<Message>) => {
            const { conversation_id, _id } = action.payload

            if (!state.byConversation[conversation_id]) {
                state.byConversation[conversation_id] = {
                    ids: [],
                    entities: {},
                }
            }

            const conv = state.byConversation[conversation_id]

            if (!conv.entities[_id]) {
                conv.ids.push(_id)
                conv.entities[_id] = action.payload
            }
        },

        updateMessageStatus: (
            state,
            action: PayloadAction<{
                conversationId: string
                messageIds: string[]
                status: Message['status']
            }>
        ) => {
            const { conversationId, messageIds, status } = action.payload
            const conv = state.byConversation[conversationId]
            if (!conv) return

            messageIds.forEach(id => {
                if (conv.entities[id]) {
                    conv.entities[id].status = status
                }
            })
        },

        updateMessageContent: (
            state,
            action: PayloadAction<{
                conversationId: string
                messageId: string
                content: string
            }>
        ) => {
            const { conversationId, messageId, content } = action.payload
            const conv = state.byConversation[conversationId]
            if (!conv?.entities[messageId]) return

            conv.entities[messageId].edited = true
            if (conv.entities[messageId].type === MessageType.Text) {
                conv.entities[messageId].payload.body = content
            }
        },

        removeMessages: (
            state,
            action: PayloadAction<{
                conversationId: string
                ids: string[]
            }>
        ) => {
            const { conversationId, ids } = action.payload
            const conv = state.byConversation[conversationId]
            if (!conv) return

            ids.forEach(id => {
                delete conv.entities[id]
            })

            conv.ids = conv.ids.filter(id => !ids.includes(id))
        },
    },

    extraReducers: builder => {
        builder.addCase(fetchConversationById.fulfilled, (state, action) => {
            const conversation = action.payload

            state.byConversation[conversation._id] = {
                ids: [],
                entities: {},
            }

            conversation.history.forEach(msg => {
                state.byConversation[conversation._id].ids.push(msg._id)
                state.byConversation[conversation._id].entities[msg._id] = msg
            })
        })

        builder.addCase(onIncomingMessage, (state, action) => {
            const { message, conversation } = action.payload

            if (!state.byConversation[conversation._id]) {
                state.byConversation[conversation._id] = {
                    ids: [],
                    entities: {},
                }
            }

            const conv = state.byConversation[conversation._id]

            if (!conv.entities[message._id]) {
                conv.ids.push(message._id)
                conv.entities[message._id] = message
            }
        })
    },
})

export const {
    addMessage,
    pushMessage,
    removeMessages,
    updateMessageStatus,
    updateMessageContent,
    setCurrentConversationId,
} = messagesSlice.actions

export default messagesSlice.reducer

export const selectMessagesByConversationId = () =>
    createSelector(
        (state: RootState, conversationId: string) => state.messages.byConversation[conversationId],
        conv => (conv ? conv.ids.map(id => conv.entities[id]) : [])
    )

export const selectGroupedMessagesByMinute = () =>
    createSelector(
        (state: RootState, conversationId: string) => state.messages.byConversation[conversationId],
        conv => {
            if (!conv) return []

            const groups: { key: string; sender_id: string; messages: Message[] }[] = []

            for (const id of conv.ids) {
                const msg = conv.entities[id]
                const key = format(new Date(msg.created_at), 'yyyy-MM-dd HH:mm')

                const last = groups[groups.length - 1]
                if (!last || last.key !== key) {
                    groups.push({ key, sender_id: msg.sender_id, messages: [msg] })
                } else {
                    last.messages.push(msg)
                }
            }

            return groups
        }
    )
