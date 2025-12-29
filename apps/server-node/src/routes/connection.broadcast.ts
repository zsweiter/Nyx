import { container } from './../packages/container';
import { Server, Socket } from '../packages/streamline';
import { UserService } from '../services/users.service';
import { ConnectionEventType } from '../shared/event-types';

export const handleConnection = async (socket: Socket, ws: Server) => {
	const userId = socket.userId;
	if (!userId) return;

	const userService = container.get(UserService);
	const user = await userService.findById(userId);
	if (user?.code) {
		ws.clients.join(user.code, userId);
		ws.clients.room(user.code).dispatchOnlyOpen(ConnectionEventType.USER_CONNECTED, {
			userId,
			code: user.code,
		});
	}

	const payload = { userId, status: true };

	ws.clients.to(userId).dispatchOnlyOpen(ConnectionEventType.USER_ONLINE, payload);
};

export const handleDisconnection = async (socket: Socket, ws: Server) => {
	const userId = socket.userId;
	if (!userId) return;

	const userService = container.get(UserService);
	await userService.updateStatus(userId, false);

	const payload = { userId, status: false };

	ws.clients.to(userId).dispatchOnlyOpen(ConnectionEventType.USER_OFFLINE, payload);
};
