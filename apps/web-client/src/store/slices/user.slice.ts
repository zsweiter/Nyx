import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { httpClient } from '../../shared/http-client'
import { cipher } from '../../crypto/new-cipher'

export interface AuthUser {
    email: string
    password: string
}

export interface User {
    _id: string
    username: string
    email: string
    avatar: string
    code?: string
    created_at: string
    updated_at: string
}

interface AuthResponse {
    token: {
        access_token: string
        expires_at: number
        expires_in: number
        token_type: 'Bearer'
    }
    data: User
}

export const authenticate = createAsyncThunk<AuthResponse, AuthUser, unknown>(
    'auth/login',
    async ({ email, password }) => {
        const publicKey = await cipher.exportPublicKey()
        const { data } = await httpClient.post('/auth/login', { email, password, public_key: publicKey })

        return data.data
    }
)

export const register = createAsyncThunk<AuthResponse, FormData, unknown>('auth/register', async formData => {
    const publicKey = await cipher.exportPublicKey()
    formData.set('public_key', publicKey)

    const { data } = await httpClient.post('/auth/register', formData)

    return data.data
})

export const join = createAsyncThunk<AuthResponse, { code?: string }, unknown>('auth/join', async ({ code }) => {
    const publicKey = await cipher.exportPublicKey()
    const { data } = await httpClient.post('/auth/join', { code: code, public_key: publicKey })

    return data.data
})

export const fetchProfile = createAsyncThunk<User, void, unknown>('auth/me', async () => {
    const { data } = await httpClient.get('/auth/me')

    return data.data
})

export const updateProfile = createAsyncThunk<User, { username?: string; avatar?: File }, unknown>(
    'auth/updateProfile',
    async ({ username, avatar }) => {
        const form = new FormData()
        if (username) form.set('username', username)
        if (avatar) form.set('avatar', avatar)
        const { data } = await httpClient.put('/auth/profile', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data.data
    }
)

export const searchByCode = createAsyncThunk<User, string, unknown>('auth/searchCode', async code => {
    const { data } = await httpClient.get(`/auth/code/${code}`)

    return data.data
})

const worksSlice = createSlice({
    name: 'user-slice',
    initialState: {
        loading: false,
        user: {} as User,
    },
    reducers: {},
    extraReducers: builder => {
        // Login
        builder.addCase(authenticate.pending, state => {
            state.loading = true
        })
        builder.addCase(authenticate.fulfilled, (state, { payload }) => {
            state.user = payload.data // payload is { token, data: user }
            state.loading = false

            localStorage.setItem('user', JSON.stringify(payload.data))
            localStorage.setItem('auth-token', payload.token.access_token)
        })
        builder.addCase(authenticate.rejected, (state, _action) => {
            state.loading = false
        })

        builder.addCase(join.pending, state => {
            state.loading = true
        })
        builder.addCase(join.fulfilled, (state, { payload }) => {
            state.user = payload.data // payload is { token, data: user }
            state.loading = false

            localStorage.setItem('user', JSON.stringify(payload.data))
            localStorage.setItem('auth-token', payload.token.access_token)
        })
        builder.addCase(join.rejected, (state, _action) => {
            state.loading = false
        })

        builder.addCase(register.fulfilled, (state, { payload }) => {
            state.user = payload.data
            state.loading = false

            localStorage.setItem('user', JSON.stringify(payload.data))
            localStorage.setItem('auth-token', payload.token.access_token)
        })
        builder.addCase(register.rejected, (state, action) => {
            state.loading = false
            console.log(action)
        })

        // Fetch Profile
        builder.addCase(fetchProfile.fulfilled, (state, { payload }) => {
            state.user = payload
            localStorage.setItem('user', JSON.stringify(payload))
        })
        // Update Profile
        builder.addCase(updateProfile.fulfilled, (state, { payload }) => {
            state.user = payload
            localStorage.setItem('user', JSON.stringify(payload))
        })
    },
})

export default worksSlice.reducer
