import { container } from './../packages/container';
import { Server, Socket } from '../packages/streamline';
import { UserService } from '../services/users.service';
import { UserEventType } from '../shared/event-types';
import { ObjectId } from 'mongodb';

export const handleUserAction = async (
    body: { action: 'block' | 'unblock' | 'report'; targetId: string },
    socket: Socket,
    ws: Server
) => {
    try {
        const userId = ObjectId.createFromHexString(socket.userId!);
        const targetId = ObjectId.createFromHexString(body.targetId);
        const service = container.get(UserService);

        if (body.action === 'block') {
            await service.blockUser(userId, targetId);
            socket.dispatch(UserEventType.USER_BLOCKED, { userId: body.targetId });
        } else if (body.action === 'unblock') {
            await service.unblockUser(userId, targetId);
            socket.dispatch(UserEventType.USER_UNBLOCKED, { userId: body.targetId });
        } else if (body.action === 'report') {
            // Log report
            socket.dispatch(UserEventType.USER_REPORTED, { userId: body.targetId });
        }
    } catch (error) {
        console.error(error);
    }
};
