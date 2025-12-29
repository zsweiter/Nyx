import { Arr, generateId, hasOwnProperty, isEmpty, log } from './utils';

export class EventEmitter<T extends Record<string, any>> {
    /**
     * The all list of events registered
     */
    private events: EventEmitterMap<T>;

    /**
     *  The last id of events
     */
    private lastId: string;

    /**
     * Instance EventEmitter with default properties
     */
    public constructor() {
        this.events = {} as EventEmitterMap<T>;
        this.lastId = '';
    }

    /**
     * Generate random hash based in time and prefix (if exists)
     *
     * @param prefix The prefix for hash
     *
     * @returns The generated hash
     */
    private hash(prefix: string = ''): string {
        this.lastId = generateId(10, prefix);

        return this.lastId;
    }

    /**
     * Dispatch one event by event name, and send payload (data) to event handler
     *
     * @param event - The name of event for dispatch
     * @param payload - The data send for process in event handler
     */
    public dispatch(event: keyof T, payload?: T[keyof T]) {
        const subscribers = this.events[event as string];

        payload = payload || null;
        if (isEmpty(subscribers)) {
            if (__DEV__) {
                log('warning', `Event: "${String(event)}"`, () => {
                    console.warn(`Event '${String(event)}' listener are empty`);
                    console.log('payload: ', payload);
                });
            }

            return;
        }

        for (const key in subscribers) {
            if (hasOwnProperty(subscribers, key)) {
                subscribers[key](payload);

                if (__DEV__) {
                    log('info', `Event: "${String(event)}"`, () => {
                        console.log('id: ', key);
                        console.log('payload: ', payload);
                    });
                }

                if (String(key).slice(0, 2) === 'on') {
                    delete subscribers[key];
                }
            }
        }
    }

    /**
     * Push listener to given event
     *
     * @param event - The event name or names
     * @param listener - The listener for push
     */
    public listen(event: SingleOrArray<keyof T>, listener: EventEmitterFunc<T[keyof T]>) {
        return Arr.wrap(event).map((event: keyof T) => this.addEventListener(String(event), listener));
    }

    /**
     * Push listener to given event for run only once
     *
     * @param event - The event name or names
     * @param listener - The listener for push
     */
    public once(event: SingleOrArray<keyof T>, listener: EventEmitterFunc<T[keyof T]>) {
        return Arr.wrap(event).map((event: keyof T) => this.addEventListener(String(event), listener, true));
    }

    /**
     * Removes the specified event or all events if no event is provided.
     * If a listener is provided, only that listener will be removed from the event.
     *
     * @param event - The name of the event to remove.
     * @param listener - (Optional) The specific listener to remove from the event.
     */
    public off(event: keyof T, listener?: EventEmitterFunc<T[keyof T]>): void {
        if (hasOwnProperty(this.events, event)) {
            const subscribers = this.events[event];
            if (listener && !isEmpty(subscribers)) {
                for (const key in subscribers) {
                    if (hasOwnProperty(subscribers, key) && subscribers[key] === listener) {
                        delete subscribers[key];
                    }
                }
            } else {
                delete this.events[event];
            }
        }
    }

    /**
     * Removes all events and resets the event emitter to its initial state.
     */
    public flush(): void {
        this.events = {} as EventEmitterMap<T>;
        this.lastId = '';
    }

    /**
     * Push the listener to events hash table
     *
     * @param event - The event name
     * @param listener - The event listener or handler
     * @param once - Indicates given event is run exactly once
     */
    private addEventListener(event: string, listener: EventEmitterFunc<any>, once: boolean = false) {
        if (!hasOwnProperty(this.events, event)) {
            this.events[event as keyof T] = {};
        }

        const id = once ? this.hash('on') : this.hash();
        this.events[event][id] = listener;

        const forget = () => {
            delete this.events[event][id];

            if (isEmpty(this.events[event])) {
                delete this.events[event];
            }
        };

        return { forget };
    }

    public getEvents() {
        return this.events;
    }
}

/**
 * Global event emitter for handling application-wide events.
 * @type {EventEmitter}
 */
export const AppEvent: EventEmitter<Record<string, any>> = new EventEmitter();