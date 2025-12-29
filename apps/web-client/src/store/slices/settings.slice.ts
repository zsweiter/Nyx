import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type Theme = 'dark' | 'light'
export type Background = 'paper' | 'womanDraft' | 'woman' | 'default'

interface SettingsState {
    theme: Theme
    background: Background
    superAnonymous: boolean
}

export const initialSettingsState: SettingsState = (() => {
    const raw = localStorage.getItem('settings')
    if (raw) {
        try {
            const parsed = JSON.parse(raw)
            return {
                theme: parsed.theme ?? 'dark',
                background: parsed.background ?? 'default',
                superAnonymous: parsed.superAnonymous ?? false,
            } as SettingsState
        } catch {
            /* ignore parse errors */
        }
    }
    return { theme: 'dark', background: 'paper', superAnonymous: false }
})()

const settingsSlice = createSlice({
    name: 'settings-slice',
    initialState: {
        theme: 'dark' as Theme,
        background: 'paper' as Background,
        superAnonymous: false,
    },
    reducers: {
        setTheme: (state, action: PayloadAction<Theme>) => {
            state.theme = action.payload
            // persist(state)
        },
        setBackground: (state, action: PayloadAction<Background>) => {
            state.background = action.payload
            // persist(state)
        },
        setSuperAnonymous: (state, action: PayloadAction<boolean>) => {
            state.superAnonymous = action.payload
            // persist(state)
        },
    },
})

export const { setTheme, setBackground, setSuperAnonymous } = settingsSlice.actions
export default settingsSlice.reducer
