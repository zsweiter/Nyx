import SimplePeer from 'simple-peer';
import { socket } from '../websocket';
import { ConnectionEventType, SignalingEventType } from '../shared/event-types';

class PeerService {
	private peers: Map<string, SimplePeer.Instance> = new Map();

	constructor() {
		this.setupSocketListeners();
	}

	private setupSocketListeners() {
		socket.listen(SignalingEventType.P2P_OFFER, (data: any) => {
			this.handleIncomingSignal(data.from, data.signal, 'offer');
		});

		socket.listen(SignalingEventType.P2P_ANSWER, (data: any) => {
			this.handleIncomingSignal(data.from, data.signal, 'answer');
		});

		socket.listen(SignalingEventType.P2P_CANDIDATE, (data: any) => {
			this.handleIncomingSignal(data.from, data.signal, 'candidate');
		});

		socket.listen(ConnectionEventType.USER_CONNECTED, (data: any) => {
			if (data.userId) {
				this.initPeer(data.userId, true);
			}
		});
	}

	public initPeer(peerId: string, initiator: boolean = false) {
		if (this.peers.has(peerId)) {
			console.warn(`Peer connection already exists for ${peerId}`);
			return;
		}

		const peer = new SimplePeer({
			initiator,
			trickle: false, // Start with simple non-trickle ICE for simplicity, can enable later
		});

		peer.on('signal', (signal) => {
			const type =
				signal.type === 'offer'
					? SignalingEventType.P2P_OFFER
					: signal.type === 'answer'
					? SignalingEventType.P2P_ANSWER
					: SignalingEventType.P2P_CANDIDATE;

			socket.dispatch(type, {
				to: peerId,
				signal,
			});
		});

		peer.on('connect', () => {
			console.log(`P2P Connection established with ${peerId}`);
		});

		peer.on('data', (data) => {
			console.log(`Received P2P data from ${peerId}:`, data.toString());
			// TODO: Handle incoming data
		});

		peer.on('error', (err) => {
			console.error(`P2P Error with ${peerId}:`, err);
			this.destroyPeer(peerId);
		});

		peer.on('close', () => {
			console.log(`P2P Connection closed with ${peerId}`);
			this.destroyPeer(peerId);
		});

		this.peers.set(peerId, peer);
		return peer;
	}

	private handleIncomingSignal(fromId: string, signal: SimplePeer.SignalData, type: string) {
		let peer = this.peers.get(fromId);

		// If receiving an offer, we are not the initiator, act as receiver
		if (!peer && type === 'offer') {
			peer = this.initPeer(fromId, false);
		}

		if (peer) {
			peer.signal(signal);
		}
	}

	public destroyPeer(peerId: string) {
		const peer = this.peers.get(peerId);
		if (peer) {
			peer.destroy();
			this.peers.delete(peerId);
		}
	}

	public broadcast(data: any) {
		this.peers.forEach((peer) => {
			if (peer.connected) {
				peer.send(JSON.stringify(data));
			}
		});
	}

	public send(peerId: string, data: any) {
		const peer = this.peers.get(peerId);
		if (peer) {
			peer.send(JSON.stringify(data));
		}
	}
}

export const peerService = new PeerService();
