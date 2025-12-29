import axios from 'axios'

export const httpClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

httpClient.interceptors.request.use(
    config => {
        const token = localStorage.getItem('auth-token')
        if (token) {
            config.headers.Authorization = `Bearer ${token.trim()}`
        }

        return config
    },
    err => Promise.reject(err)
)
