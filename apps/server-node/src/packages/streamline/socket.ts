import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { WebSocket } from 'ws';
import { StreamlineServer } from './server';
import { Json } from './../../utils';

export class SilentSocket extends EventEmitter {
    public readonly id: string;

    public constructor(
        public readonly ws: WebSocket,
        protected authId: string | null = null,
        public readonly engine: StreamlineServer
    ) {
        super();
        this.id = crypto.randomBytes(15).toString('hex');

        this.subEvents();
    }

    protected subEvents() {
        this.ws.on('message', (data, isBinary) => {
            this.handleIncomingEvents(data, this.engine);
        });

        this.ws.on('close', (code, reason) => {
            super.emit('close', code, reason, this);
        });

        this.ws.on('error', (err) => {
            super.emit('error', err, this);
        });
    }

    public on(event: string, listener: (...args: any[]) => void): this {
        super.on(event, listener);

        return this;
    }

    protected handleIncomingEvents(data: Buffer | ArrayBuffer | Buffer[], server: StreamlineServer) {
        try {
            const { event, data: eventData, options = {} } = Json.parse(data.toString());

            super.emit(event, eventData, this, server, options);
        } catch (error) {
            console.error('Error parsing incoming event:', error);
        }
    }

    public async dispatch(event: string, data: any) {
        return this._send(event, data);
    }

    protected async _send(event: string, payload: any, options = {}) {
        return new Promise<boolean>((resolve, reject) => {
            if (this.ws.readyState !== WebSocket.OPEN) {
                return reject(new Error('WebSocket is not open'));
            }

            try {
                this.ws.send(Json.stringify({ event, payload, options }) as string, (err) => {
                    if (err) reject(err);
                    else resolve(true);
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public close(code?: number, data?: string | Buffer): void {
        this.ws.close(code, data);
    }

    public get userId() {
        return this.authId;
    }

    public isOpen() {
        return this.ws.readyState === WebSocket.OPEN;
    }
}

export class StreamlineClients {
    private readonly clients = new Map<string, SilentSocket>();
    private readonly rooms = new Map<string, Set<string>>();

    public add(userId: string, socket: SilentSocket) {
        this.clients.set(userId, socket);
    }

    public remove(userId: string) {
        this.clients.delete(userId);

        for (const room of this.rooms.values()) {
            room.delete(userId);
        }
    }

    public join(roomId: string, userId: string) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }
        this.rooms.get(roomId)!.add(userId);
    }

    public leave(roomId: string, userId: string) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.delete(userId);
        if (room.size === 0) {
            this.rooms.delete(roomId);
        }
    }

    public to(users: readonly string[] | string | Set<string>) {
        const ids = Array.isArray(users) ? users : typeof users === 'string' ? [users] : Array.from(users);

        return this.createEmitter(() => ids.map((id) => this.clients.get(id)).filter(Boolean) as SilentSocket[]);
    }

    public room(roomId: string) {
        return this.createEmitter(() => {
            const users = this.rooms.get(roomId);
            if (!users) return [];

            return [...users].map((id) => this.clients.get(id)).filter(Boolean) as SilentSocket[];
        });
    }

    private createEmitter(getSockets: () => SilentSocket[]) {
        return {
            dispatch: (event: string, payload: unknown) => {
                for (const socket of getSockets()) {
                    socket.dispatch(event, payload);
                }
            },

            dispatchOnlyOpen: (event: string, payload: unknown) => {
                for (const socket of getSockets()) {
                    if (socket.isOpen()) {
                        socket.dispatch(event, payload);
                    }
                }
            },

            map: (callback: (socket: SilentSocket, index: number) => any) => {
                return getSockets().map(callback);
            },

            each: (callback: (socket: SilentSocket, index: number) => void) => {
                getSockets().forEach(callback);
            },

            filterOpened: (callback: (socket: SilentSocket, index: number) => void) => {
                getSockets().forEach((socket, index) => {
                    if (socket.isOpen()) {
                        callback(socket, index);
                    }
                });
            },
        };
    }
}
