import { ConnectionEventType } from '../shared/event-types';
import { Server, Socket } from './../packages/streamline';

type TypingPayload = {
    recipient_id: string;
    conversation_id: string;
};

export const typing = (body: TypingPayload, socket: Socket, ws: Server) => {
    ws.clients.to(body.recipient_id).filterOpened((client) => {
        client.dispatch(ConnectionEventType.USER_TYPING_START, {
            sender_id: socket.userId,
            conversation_id: body.conversation_id,
        });
    });
};

export const stopTyping = (body: TypingPayload, socket: Socket, ws: Server) => {
    ws.clients.to(body.recipient_id).filterOpened((client) => {
        client.dispatch(ConnectionEventType.USER_TYPING_STOP, {
            sender_id: socket.userId,
            conversation_id: body.conversation_id,
        });
    });
};
