import { ObjectId } from 'mongodb';
import { MessagesService, STATUS } from '../services/messages.service';
import { Server, Socket } from './../packages/streamline';
import { MessageEventType } from '../shared/event-types';
import { container } from './../packages/container';
import { ConversationService } from '../services/conversation.service';
import { MessagePayload } from './../types';

type MessageEntry = {
	conversation_id: string;
	owner_id: string;
	recipient_id: string;
	sender_id: string;
	status?: 'sent' | 'delivered' | 'read';
} & MessagePayload;

export const saveMessage = async (body: MessageEntry, socket: Socket, ws: Server) => {
	try {
		const senderId = ObjectId.createFromHexString(socket.userId!);
		const recipientId = ObjectId.createFromHexString(body.recipient_id);

		const conversationService = container.get(ConversationService);
		const { message, conversation, isSelf } = await conversationService.pushMessage(senderId, recipientId, {
			status: STATUS.Sent,
			sender_id: senderId,
			type: body.type as any,
			payload: body.payload,
			conversation_id: ObjectId.createFromHexString(body.conversation_id),
			delivered_at: new Date(),
		});

		socket.dispatch(MessageEventType.MESSAGE_SENT, message);

		// Notify recipient if the sender is not the recipient
		if (!isSelf) {
			ws.clients.to(body.recipient_id).filterOpened((client) => {
				client.dispatch(MessageEventType.MESSAGE_INCOMING, { message, conversation });
			});
		}
	} catch (error: any) {
		console.error(error);

		socket.dispatch(MessageEventType.MESSAGE_FAILED, { error: error?.message || 'Unknown error' });
	}
};

export const deleteMessage = async (body: { message_id: string; recipient_id: string }, socket: Socket, ws: Server) => {
	try {
		const service = container.get(MessagesService);
		const userId = ObjectId.createFromHexString(socket.userId!);
		const messageId = ObjectId.createFromHexString(body.message_id);
		await service.deleteMessage(messageId, userId);

		const isSelf = userId.equals(ObjectId.createFromHexString(body.recipient_id));
		const payload = { ids: [body.message_id] };

		// Notify sender
		socket.dispatch(MessageEventType.MESSAGE_DELETED, payload);

		if (!isSelf) {
			ws.clients.to(body.recipient_id).filterOpened((client) => {
				client.dispatch(MessageEventType.MESSAGE_DELETED, payload);
			});
		}
	} catch (error: any) {
		console.error('Failed to delete message', error);

		socket.dispatch(MessageEventType.MESSAGE_FAILED, { error: error?.message || 'Unknown error' });
	}
};
