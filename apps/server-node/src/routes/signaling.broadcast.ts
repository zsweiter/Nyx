import { SilentSocket, StreamlineServer } from '../packages/streamline';
import { SignalingEventType } from '../shared/event-types';

export const relaySignal = (data: { to: string; signal: any }, socket: SilentSocket, server: StreamlineServer) => {
	const { to, signal } = data;

	// Check if the target user is connected
	const targetSocket = server.clients.to(to);

	// We need to send the signal to the target peer.
	// The event type should be the same as the one received, or we can map it.
	// However, the `server.clients.to(to)` returns an emitter.
	// We want to send specific event types based on the signal type or the event that triggered this.
	// But since we are registering this handler for specific events, we might need a way to know which event triggered it
	// OR we can just dispatch specific events.

	// Better approach: relaySignal can be generic or we define one for each type.
	// But wait, the handler signature in socket.ts is `(data, socket, server, options)`.
	// We don't have the event name in the arguments unless we use a wrapper.

	// Let's check how other handlers are implemented.
	// saveMessage signature: (data: any, socket: SilentSocket, server: StreamlineServer)
};

export const handleOffer = (data: { to: string; signal: any }, socket: SilentSocket, server: StreamlineServer) => {
	const { to, signal } = data;
	server.clients.to(to).dispatch(SignalingEventType.P2P_OFFER, {
		from: socket.userId,
		signal,
	});
};

export const handleAnswer = (data: { to: string; signal: any }, socket: SilentSocket, server: StreamlineServer) => {
	const { to, signal } = data;
	server.clients.to(to).dispatch(SignalingEventType.P2P_ANSWER, {
		from: socket.userId,
		signal,
	});
};

export const handleCandidate = (data: { to: string; signal: any }, socket: SilentSocket, server: StreamlineServer) => {
	const { to, signal } = data;
	server.clients.to(to).dispatch(SignalingEventType.P2P_CANDIDATE, {
		from: socket.userId,
		signal,
	});
};
