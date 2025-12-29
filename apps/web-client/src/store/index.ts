import { configureStore } from '@reduxjs/toolkit'
import userSlice from './slices/user.slice'
import messagesSlice from './slices/messages.slice'
import conversationsSlice from './slices/conversation.slice'
import settingsSlice, { initialSettingsState } from './slices/settings.slice'

export const store = configureStore({
    reducer: {
        users: userSlice,
        messages: messagesSlice,
        conversations: conversationsSlice,
        settings: settingsSlice,
    },
    preloadedState: {
        settings: initialSettingsState,
    },
})

store.subscribe(() => {
    const state = store.getState()
    localStorage.setItem('settings', JSON.stringify(state.settings))
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
