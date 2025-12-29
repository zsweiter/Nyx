import { ObjectId } from 'mongodb';
import { MongoRepository, WithModel } from '../database/respository';
import { User, UserService } from './users.service';
import { Message, MessagesService, Status, STATUS } from './messages.service';
import { generateFileURL } from './../utils';
import { MessagePayload, MessageType } from '../types';
import { HttpException } from './../exceptions';

export type Conversation = WithModel<{
	name: string;
	participants: ObjectId[];
	type?: 'private' | 'group' | 'self';
	last_message?: {
		status: Status;
		created_at: Date | string;
	} & MessagePayload;
	muted_by?: ObjectId[];
	archived_by?: ObjectId[];
	pinned_by?: ObjectId[];
	admins?: ObjectId[];
	photo?: string;
	public_key?: string;
	unreads?: number;
	updated_at?: Date;
	anonymous?: boolean;
}>;

export type ConversationModel = WithModel<{
	type: 'private' | 'group' | 'self';
	name: string;
	participants: User[];
	last_message?: {
		status: Status;
		created_at: Date | string;
	} & MessagePayload;
}>;

export class ConversationService {
	protected readonly repository: MongoRepository<Conversation>;

	public constructor(private readonly userService: UserService, private readonly messageService: MessagesService) {
		this.repository = new MongoRepository<Conversation>('conversations');
	}

	public async findOrCreateByUserCode(senderId: ObjectId, recipientCode: string) {
		const recipient = await this.userService.findByCode(recipientCode);
		if (!recipient) {
			throw new HttpException('Recipient not found', 404);
		}

		const participants = this.formatParticipants(senderId, recipient._id as ObjectId);
		const name = participants.map((p) => p.toHexString()).join('-');
		const isSelf = senderId.equals(recipient._id as ObjectId);

		let conversation = await this.repository.findOne({
			participants: participants,
			name: name,
		});
		if (!conversation) {
			conversation = await this.repository.save({
				participants: participants,
				name: name,
				type: isSelf ? 'self' : 'private',
			});
		}

		return {
			...conversation,
			public_key: recipient?.public_key,
			unreads: conversation.unreads || 0,
			updated_at: new Date(),
			anonymous: recipient?.anonymous,
			recipient: {
				...recipient,
				type: conversation.type,
			},
		};
	}

	/**
	 * Push new message to conversation (create when not exists)
	 *
	 * @param senderId
	 * @param recipientId
	 * @param message
	 */
	public async pushMessage(senderId: ObjectId, recipientId: ObjectId, message: Message) {
		const participants = this.formatParticipants(senderId, recipientId);
		const name = participants.map((p) => p.toHexString()).join('-');
		const isSelf = senderId.equals(recipientId);

		// Create conversation if not exists and update last message
		const $conversation = await this.repository.db.findOneAndUpdate(
			{
				name: name,
				participants: participants,
			},
			{
				$set: {
					last_message: {
						type: message.type as any,
						payload: message.payload,
						status: STATUS.Sent,
						created_at: new Date(),
					},
					updated_at: new Date(),
				},
				$setOnInsert: {
					name: name,
					type: isSelf ? 'self' : 'private',
					participants: participants,
					created_at: new Date(),
				},
			},
			{
				upsert: true,
				returnDocument: 'after',
			}
		);

		if (!$conversation) {
			throw new Error('Conversation created failed in pushMessage');
		}

		const createdMessage = await this.messageService.createMessage({
			conversationId: new ObjectId($conversation._id),
			type: message.type,
			participants: participants,
			message: message,
			senderId: senderId,
		});

		const _participants = await this.userService.findParticipantsByIds(participants);

		return {
			message: {
				...createdMessage,
				sender_id: senderId,
				recipient_id: recipientId,
			},
			conversation: {
				...$conversation,
				unreads: $conversation.unreads || 1,
				updated_at: new Date(),
				participants: _participants,
			},
			isSelf: isSelf, // Indicates current message is self
		};
	}

	public async getConversationById(userId: ObjectId, conversationId: string) {
		const pipeline = [
			{
				$match: {
					_id: ObjectId.createFromHexString(conversationId),
					participants: { $in: [userId] },
				},
			},
			{
				$lookup: {
					from: 'users',
					localField: 'participants',
					foreignField: '_id',
					as: 'participants',
				},
			},
			{
				$project: {
					_id: 1,
					type: 1,
					name: 1,
					last_message: 1,
					participants: {
						_id: 1,
						username: 1,
						email: 1,
						avatar: 1,
						public_key: 1,
						anonymous: 1,
					},
				},
			},
		];

		const conversations = await this.repository.aggregate<ConversationModel>(pipeline).toArray();

		if (!conversations.length) {
			throw new Error('Conversation not found');
		}

		const conversation = conversations[0];

		const participants = conversation.participants
			.filter((user) => (conversation.type !== 'self' ? user._id?.toString() !== userId.toString() : true))
			.map((user) => ({
				...user,
				avatar: generateFileURL(user.avatar),
			}));

		const history = await this.messageService.historyOf(conversation._id as ObjectId);
		const meta = {
			public_key: '',
			unreads: 0,
			updated_at: new Date(),
			anonymous: false,
		};

		const recipient = participants[0];
		if (conversation.type === 'private') {
			meta.public_key = recipient?.public_key as string;
			meta.unreads = ((recipient as any)?.unreads || 0) as number;
			meta.updated_at = ((recipient as any)?.updated_at || new Date()) as Date;
			meta.anonymous = ((recipient as any)?.anonymous || false) as boolean;
		}

		return {
			...conversation,
			...meta,
			recipient: {
				...recipient,
				type: conversation.type,
			},
			history,
		};
	}

	public async getConversationsPaginated(userId: ObjectId, limit: number, cursor?: string) {
		const match: Record<string, any> = {
			participants: { $in: [userId] },
		};
		if (cursor) {
			match._id = { $lt: ObjectId.createFromHexString(cursor) };
		}

		const aggregate = this.repository.aggregate<ConversationModel>([
			{
				$match: match,
			},
			{
				$sort: { _id: -1 },
			},
			{
				$limit: limit,
			},
			{
				$lookup: {
					from: 'users',
					localField: 'participants',
					foreignField: '_id',
					as: 'participants',
				},
			},
			{
				$project: {
					_id: 1,
					type: 1,
					name: 1,
					last_message: 1,
					participants: {
						_id: 1,
						username: 1,
						email: 1,
						avatar: 1,
						public_key: 1,
					},
				},
			},
		]);

		const conversations = await aggregate.toArray();

		const result = conversations.map((conversation) => {
			const participants = conversation.participants
				.filter((user) => (conversation.type !== 'self' ? user._id?.toString() !== userId.toString() : true))
				.map((user) => ({
					...user,
					avatar: generateFileURL(user.avatar),
				}));

			const recipient = participants[0];
			const meta = {
				public_key: '',
				unreads: 0,
				updated_at: new Date(),
				anonymous: false,
			};

			if (conversation.type === 'private') {
				meta.public_key = recipient?.public_key as string;
				meta.unreads = (recipient as any)?.unreads || 0;
				meta.updated_at = (recipient as any)?.updated_at || new Date();
				meta.anonymous = (recipient as any)?.anonymous || false;
			}

			return {
				...conversation,
				...meta,
				name: recipient.username,
				recipient: {
					...recipient,
					type: conversation.type,
				},
			};
		});

		return {
			data: result,
			nextCursor: result.length > 0 ? result[result.length - 1]._id : null,
		};
	}

	public async toggleMute(conversationId: ObjectId, userId: ObjectId, mute: boolean) {
		const update = mute ? { $addToSet: { muted_by: userId } } : { $pull: { muted_by: userId } };
		await this.repository.db.updateOne({ _id: conversationId }, update as any);
	}

	public async toggleArchive(conversationId: ObjectId, userId: ObjectId, archive: boolean) {
		const update = archive ? { $addToSet: { archived_by: userId } } : { $pull: { archived_by: userId } };
		await this.repository.db.updateOne({ _id: conversationId }, update as any);
	}

	public async togglePin(conversationId: ObjectId, userId: ObjectId, pin: boolean) {
		const update = pin ? { $addToSet: { pinned_by: userId } } : { $pull: { pinned_by: userId } };
		await this.repository.db.updateOne({ _id: conversationId }, update as any);
	}

	public async deleteChat(conversationId: ObjectId) {
		await Promise.all([
			await this.messageService.deleteByConversationId(conversationId),
			await this.repository.delete(conversationId),
		]);
	}

	public async compressChat(conversationId: ObjectId, keep: number = 100) {
		await this.messageService.compressConversationHistory(conversationId, keep);
	}

	public async createGroup(name: string, participants: ObjectId[], creatorId: ObjectId) {
		const group = await this.repository.save({
			name,
			participants: [...participants, creatorId],
			admins: [creatorId],
			type: 'group',
			created_at: new Date(),
			updated_at: new Date(),
		});
		return group;
	}

	public async addParticipant(groupId: ObjectId, userId: ObjectId) {
		await this.repository.db.updateOne({ _id: groupId }, { $addToSet: { participants: userId } } as any);
	}

	public async removeParticipant(groupId: ObjectId, userId: ObjectId) {
		await this.repository.db.updateOne({ _id: groupId }, {
			$pull: { participants: userId, admins: userId },
		} as any);
	}

	public async addAdmin(groupId: ObjectId, userId: ObjectId) {
		await this.repository.db.updateOne({ _id: groupId }, { $addToSet: { admins: userId } } as any);
	}

	public async removeAdmin(groupId: ObjectId, userId: ObjectId) {
		await this.repository.db.updateOne({ _id: groupId }, { $pull: { admins: userId } } as any);
	}

	public async updateSubject(groupId: ObjectId, subject: string) {
		await this.repository.db.updateOne({ _id: groupId }, { $set: { name: subject } } as any);
	}

	public async updatePhoto(groupId: ObjectId, photo: string) {
		await this.repository.db.updateOne({ _id: groupId }, { $set: { photo } } as any);
	}

	private formatParticipants(...participants: ObjectId[]) {
		return Array.from(new Set(participants)).sort((a, b) => a.toString().localeCompare(b.toString()));
	}
}
