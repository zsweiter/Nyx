import { SilentSocket, StreamlineServer, StreamlineSource } from './streamline';

declare module '@streamline' {
    export class Server extends StreamlineServer {}
    export class Socket extends SilentSocket {}
    export class Source extends StreamlineSource {}
}
