import { ObjectId } from 'mongodb';
import { MongoRepository, WithModel } from '../database/respository';
import { MessagePayload, MessageType } from './../types';

export const STATUS = Object.freeze({
	Read: 'read',
	Delete: 'delete',
	Sent: 'sent',
	Delivered: 'delivered',
	Failed: 'failed',
});
export type Status = Lowercase<keyof typeof STATUS>;

export type Message = WithModel<
	{
		status: Status;
		sender_id?: ObjectId;
		conversation_id?: ObjectId;
		reply_to?: ObjectId;
		forwarded_from?: ObjectId;
		edited?: boolean;
		delivered_at?: Date;
		read_at?: Date;
	} & MessagePayload
>;

export type MessageInput = {
	type: MessageType;
	message: Message;
	conversationId: ObjectId;
	senderId: ObjectId;
	participants: ObjectId[];
};

export class MessagesService {
	public constructor(private readonly repository: MongoRepository<Message>) {}

	/**
	 * Create a new message
	 *
	 * @param message
	 */
	public async createMessage(message: MessageInput) {
		const response = await this.repository.save({
			...message.message,
			sender_id: message.senderId,
			conversation_id: message.conversationId,
		});

		return response;
	}

	public async historyOf(conversationId: ObjectId) {
		const cursor = this.repository.find(
			{ conversation_id: conversationId },
			{ limit: 100, sort: { created_at: 1 } }
		);

		const data: Message[] = await cursor.toArray();

		return data;
	}

	public async compressConversationHistory(conversationId: ObjectId, keep: number = 100) {
		const cursor = this.repository.find(
			{ conversation_id: conversationId },
			{ sort: { created_at: -1 }, projection: { _id: 1 }, skip: keep }
		);
		const idsToDelete: ObjectId[] = [];
		for await (const doc of cursor) {
			idsToDelete.push(doc._id as ObjectId);
		}
		if (idsToDelete.length > 0) {
			await this.repository.db.deleteMany({ _id: { $in: idsToDelete } } as any);
		}
	}

	public async deleteMessage(messageId: ObjectId, userId: ObjectId) {
		const message = await this.repository.findOne({ _id: messageId });
		if (!message) return null;

		if (message.sender_id?.toString() !== userId.toString()) {
			throw new Error('Unauthorized');
		}

		await this.repository.delete(messageId);

		return message;
	}

	public async deleteByConversationId(conversationId: ObjectId) {
		return await this.repository.deleteMany({ conversation_id: conversationId });
	}

	public async markAsDelivered(messageIds: ObjectId[]) {
		await this.repository.db.updateMany({ _id: { $in: messageIds } }, {
			$set: { status: 'delivered', delivered_at: new Date() },
		} as any);
	}

	public async markAsRead(messageIds: ObjectId[]) {
		await this.repository.db.updateMany({ _id: { $in: messageIds } }, {
			$set: { status: 'read', read_at: new Date() },
		} as any);
	}

	public async editMessage(messageId: ObjectId, userId: ObjectId, newBody: string) {
		const message = await this.repository.findOne({ _id: messageId });
		if (!message) return null;
		if (message.sender_id?.toString() !== userId.toString()) throw new Error('Unauthorized');

		await this.repository.db.updateOne({ _id: messageId }, {
			$set: { body: newBody, edited: true, updated_at: new Date() },
		} as any);
		return { ...message, body: newBody, edited: true };
	}
}
