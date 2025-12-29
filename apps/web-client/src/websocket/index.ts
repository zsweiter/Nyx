import { Json } from '@shared/encoding'

type Listener<F = unknown> = (data?: F) => void
type Listeners<F = unknown> = {
    [x: 'connect' | 'close' | 'error' | 'string' | string]: Array<Listener<F>>
}

export class StreamlineSocket {
    protected socket: WebSocket | null = null
    protected listeners: Listeners = {}
    protected reconnectAttempts = 0
    protected maxReconnectAttempts = 10
    protected reconnectDelay = 1000 // 1 segundo inicial
    protected maxReconnectDelay = 30000 // 30 segundos máximo

    private token?: string
    private authKeyRecover: () => string | undefined = () => this.token

    constructor(
        protected readonly url: `ws://${string}` | `wss://${string}`,
        protected protocols?: string | string[]
    ) {}

    public connectWith() {
        const token = this.authKeyRecover()
        const protocols: string[] = []
        if (token) {
            protocols.push(token)
        }

        if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
            this.socket = new WebSocket(this.url, protocols)

            this.socket.onmessage = message => {
                try {
                    const { event, data, payload } = Json.parse(message.data)
                    this.handleIncomingEvent(event, data ?? payload)
                } catch (err) {
                    console.error('Error parsing message', err)
                }
            }

            this.socket.onopen = event => {
                this.reconnectAttempts = 0
                this.reconnectDelay = 1000
                this.handleIncomingEvent('connect', event)
            }

            this.socket.onclose = event => {
                this.handleIncomingEvent('close', event)
                this.tryReconnect()
            }

            this.socket.onerror = event => {
                this.handleIncomingEvent('error', event)
            }
        }
    }

    private tryReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++
            const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, this.maxReconnectDelay)
            console.log(`Intentando reconectar en ${delay}ms... (Intento ${this.reconnectAttempts})`)
            setTimeout(() => this.connectWith(), delay)
        } else {
            console.warn('Máximo de intentos de reconexión alcanzado.')
        }
    }

    public listen(name: string, listener: Listener) {
        if (!this.listeners[name]) {
            this.listeners[name] = []
        }
        this.listeners[name].push(listener)
    }

    public dispatch(name: string, data = null) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(Json.stringify({ event: name, data }))
        }
    }

    public off(event: string, listener: Listener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(fn => fn !== listener)
        }
    }

    public close(code?: number, reason?: string) {
        this.socket?.close(code, reason)
        this.socket = null
    }

    private handleIncomingEvent(eventName: string, data: unknown) {
        this.listeners[eventName]?.forEach(listener => listener(data))
    }

    public setAuthKeyRecover(recover: () => string) {
        this.authKeyRecover = recover
    }
}

export const socket = new StreamlineSocket(`wss://localhost:3030/v1/socket`)
