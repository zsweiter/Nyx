import { StreamlineServer } from './server';
import { SilentSocket } from './socket';

export type EventPayload<T> = {
    body: string;
} & T;

type SourceListener<P = Record<string, any>> = (
    payload: EventPayload<P>,
    socket: SilentSocket,
    ws: StreamlineServer
) => Promise<void>;

export class StreamlineSource<T = unknown> {
    private readonly events = new Map<string, Set<SourceListener>>();

    public add<P = T>(name: string, listener: SourceListener<P>): void {
        if (!this.events.has(name)) {
            this.events.set(name, new Set());
        }

        this.events.get(name)!.add(listener as SourceListener);
    }

    public push<P = T>(name: string, listener: SourceListener<P>) {
        this.add(name, listener);
    }

    public delete(name: string, listener?: SourceListener): void {
        if (listener) {
            const listeners = this.events.get(name);
            listeners && listeners.delete(listener);
        } else {
            this.events.delete(name);
        }
    }

    public listeners(name: string): ReadonlySet<SourceListener> | undefined {
        return this.events.get(name);
    }

    public each(fn: (event: string, listeners: Set<SourceListener>) => void) {
        for (const event of this.events.keys()) {
            fn(event, this.events.get(event) as Set<SourceListener>);
        }
    }
}
