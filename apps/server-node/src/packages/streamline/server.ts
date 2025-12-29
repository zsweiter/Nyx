import { Server as HttpServer, IncomingMessage } from 'http';
import { WebSocketServer } from 'ws';
import { SilentSocket, StreamlineClients } from './socket';

import internal from 'stream';
import { URL } from 'url';

import debugMode from 'debug';
import { Pipeline } from '../pipeline';
const debug = debugMode('streamline:');

interface WebSocketOptions {
	path: string;
	tokenKey: string;
}

type DomainEvents = 'connection' | 'error' | 'headers' | 'close' | 'listening';
type DomainHandler = (socket: SilentSocket, request: IncomingMessage) => void | Promise<void>;

export class StreamlineServer {
	/**
	 * The main server of websocket
	 */
	public readonly engine: WebSocketServer;

	/**
	 * The websocket options or configuration
	 */
	protected options: WebSocketOptions = {} as WebSocketOptions;
	protected _url: URL;
	protected _path: string = '';
	public readonly clients: StreamlineClients = new StreamlineClients();

	protected pipeline: Pipeline;

	protected auth?: (request: IncomingMessage, url: URL) => Promise<string | null>;

	public constructor() {
		this._url = new URL('/', 'http://localhost');
		this.engine = new WebSocketServer({
			noServer: true,
			maxPayload: 50 * 1024 * 1024,
		});

		this.pipeline = new Pipeline();
	}

	public connect(http: HttpServer, options: WebSocketOptions) {
		this.options = options;
		this._path = options.path || '';
		this._url = new URL(this._path, 'http://localhost');

		http.on('upgrade', (request, socket, head) => {
			this.onUpgrade(request, socket, head);
		});
	}

	public use(middleware: (...args: any[]) => void) {
		this.pipeline.add(middleware);

		return this;
	}

	protected onUpgrade(request: IncomingMessage, socket: internal.Duplex, head: Buffer) {
		this._url = new URL(request.url || '', `http://${request.headers.host}`);

		if (this.URL.pathname === this._path) {
			this.withAuthentication(request, this._url)
				.then((userId) => {
					debug('auth with: ' + userId);
					this.engine.handleUpgrade(request, socket, head, (websocket) => {
						const socket = new SilentSocket(websocket, userId, this);
						this.clients.add(socket.id, socket);

						this.doConnection(socket, request);
					});
				})
				.catch((err) => {
					console.error(err);
					debug('fails authentication: ' + err?.message);
					socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
					socket.destroy();
				});
		} else {
			socket.destroy();
		}
	}

	private async withAuthentication(request: IncomingMessage, url: URL) {
		if (!this.auth) {
			return Promise.resolve(null);
		}

		return this.auth(request, url);
	}

	public useAuth(fn: (request: IncomingMessage, url: URL) => Promise<string | null>) {
		this.auth = fn;

		return this;
	}

	protected doConnection(socket: SilentSocket, request: IncomingMessage) {
		debug(`new-client: ⚡ ${socket.id}`);

		this.engine.emit('connection', socket, request);

		socket.ws.on('close', () => {
			this.clients.remove(socket.id);
			this.engine.emit('disconnection', socket);
			debug('close-client: ⚡ ' + socket.id);
		});
	}

	public handle(event: DomainEvents | 'disconnection', handler: DomainHandler) {
		this.engine.on(event, handler);
	}

	public get URL() {
		return this._url;
	}
}
