import { createAsyncThunk, createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { httpClient } from '../../shared/http-client';
import { Message, onIncomingMessage, pushMessage } from './messages.slice';
import { AppEvent } from '@/shared/event-bus';
import { cipher } from '../../crypto/new-cipher';
import { RootState } from '..';
import { MessagePayload, MessageType } from '@/types';

export type Conversation = {
	_id: string;
	name: string;
	recipient: {
		_id: string;
		username: string;
		email: string;
		avatar: string;
		type: 'private' | 'group';
		status: string;
		code: string;
	};
	participants: {
		_id: string;
		username: string;
		email: string;
		avatar: string;
		type: 'private' | 'group';
		status: string;
		public_key: string;
	}[];
	last_message?: {
		_id: string;
		status: string;
		created_at: string;
	} & MessagePayload;
	updated_at: string;
	created_at: string;
	muted_by?: string[];
	archived_by?: string[];
	pinned_by?: string[];
	admins?: string[];
	type: 'private' | 'group';
	photo?: string;
	anonymous?: boolean;
	public_key?: string;
	unreads?: number;
	isTyping: boolean;
};

const conversationsAdapter = createEntityAdapter<Conversation, string>({
	selectId: (c) => c._id,
	sortComparer: (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
});

const initialState = conversationsAdapter.getInitialState({
	nextCursor: null as string | null,
	loaders: {
		pagination: false,
		fetchById: false,
	},
});

export const upsertConversationByUserCode = createAsyncThunk<Conversation, string>(
	'conversations/upsertByUserCode',
	async (userCode) => {
		const { data } = await httpClient.put(`/conversations/upsert-by-user-code/${userCode}`);

		const conversation = data.data;

		conversation.isTyping = false;
		if (conversation.public_key) {
			await cipher.registerPeerPublicKey(conversation._id, conversation.public_key);
		}

		return conversation;
	}
);

export const fetchConversationById = createAsyncThunk<Conversation & { history: Message[] }, string>(
	'conversations/fetchById',
	async (conversationId) => {
		const { data } = await httpClient.get(`/conversations/${conversationId}`);

		const conversation = data.data;

		conversation.isTyping = false;
		if (conversation.public_key) {
			await cipher.registerPeerPublicKey(conversationId, conversation.public_key);
		}

		const history = await Promise.all(
			conversation.history.map(async (m: any) => {
				if (m.type === MessageType.Text) {
					m.payload.body = await cipher.decryptText(m.payload.body, conversationId);
				}
				return { ...m, conversation_id: conversationId };
			})
		);

		return { ...conversation, history };
	}
);

export const fetchConversationPaginated = createAsyncThunk<
	{ data: Conversation[]; nextCursor: string | null },
	{ limit: number; cursor?: string }
>('conversations/fetchPaginated', async ({ limit, cursor }) => {
	const { data } = await httpClient.get('/conversations/paginate', {
		params: { limit, cursor },
	});

	const conversations = await Promise.all(
		data.data.data.map(async (conversation: any) => {
			conversation.isTyping = false;
			if (conversation.public_key) {
				await cipher.registerPeerPublicKey(conversation._id, conversation.public_key);
			}

			if (conversation.last_message?.type === MessageType.Text) {
				conversation.last_message.payload.body = await cipher
					.decryptText(conversation.last_message.payload.body, conversation._id)
					.catch(() => conversation.last_message.payload.body);
			}

			return conversation;
		})
	);

	await new Promise((res, _) => setTimeout(res, 5000));

	return {
		data: conversations,
		nextCursor: data.data.nextCursor,
	};
});

/* =========================
   SLICE
========================= */

const conversationsSlice = createSlice({
	name: 'conversations',
	initialState,
	reducers: {
		removeConversation: (state, action: PayloadAction<string>) => {
			conversationsAdapter.removeOne(state, action.payload);
		},
		updateTypingStatus: (state, action: PayloadAction<{ conversationId: string; isTyping: boolean }>) => {
			conversationsAdapter.updateOne(state, {
				id: action.payload.conversationId,
				changes: { isTyping: action.payload.isTyping },
			});
		},

		updateLastMessage: (
			state,
			action: PayloadAction<{
				conversationId: string;
				message: Conversation['last_message'];
			}>
		) => {
			conversationsAdapter.updateOne(state, {
				id: action.payload.conversationId,
				changes: {
					last_message: action.payload.message,
					updated_at: action.payload.message?.created_at,
				},
			});
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase(upsertConversationByUserCode.fulfilled, (state, action) => {
				conversationsAdapter.upsertOne(state, action.payload);
			})

			.addCase(fetchConversationById.pending, (state) => {
				state.loaders.fetchById = true;
			})
			.addCase(fetchConversationById.fulfilled, (state, action) => {
				conversationsAdapter.upsertOne(state, action.payload);
				state.loaders.fetchById = false;
			})
			.addCase(fetchConversationById.rejected, (state) => {
				state.loaders.fetchById = false;
			})

			.addCase(fetchConversationPaginated.pending, (state) => {
				state.loaders.pagination = true;
			})
			.addCase(fetchConversationPaginated.fulfilled, (state, action) => {
				conversationsAdapter.upsertMany(state, action.payload.data);
				state.nextCursor = action.payload.nextCursor;
				state.loaders.pagination = false;
			})
			.addCase(fetchConversationPaginated.rejected, (state) => {
				state.loaders.pagination = false;
			})

			.addCase(onIncomingMessage, (state, action) => {
				const conversation = action.payload.conversation;

				conversationsAdapter.upsertOne(state, {
					...conversation,
					updated_at: conversation.last_message?.created_at ?? conversation.updated_at,
				});

				if (conversation.public_key) {
					AppEvent.dispatch('cipher:new-shared-key', {
						id: conversation._id,
						sharedKey: conversation.public_key,
					});
				}
			})
			// Update last message and updated_at
			.addCase(pushMessage, (state, action) => {
				const conversation = action.payload.conversation_id;

				conversationsAdapter.updateOne(state, {
					id: conversation,
					changes: {
						last_message: {
							_id: action.payload._id,
							type: action.payload.type as any,
							payload: action.payload.payload,
							created_at: action.payload.created_at,
							status: action.payload.status,
						},
						updated_at: action.payload.created_at,
					},
				});
			})
			.addCase(deleteConversation.fulfilled, (state, action) => {
				const meta = action.meta;
				const id = meta.arg as string;
				conversationsAdapter.removeOne(state, id);
			});
	},
});

/* =========================
   EXPORTS
========================= */

export const deleteConversation = createAsyncThunk<void, string>('conversations/delete', async (id) => {
	await httpClient.delete(`/conversations/${id}`);
});

export const compressConversation = createAsyncThunk<void, { id: string; keep?: number }>(
	'conversations/compress',
	async ({ id, keep = 100 }) => {
		await httpClient.post(`/conversations/${id}/compress`, { keep });
	}
);

export const { updateTypingStatus, updateLastMessage, removeConversation } = conversationsSlice.actions;

export default conversationsSlice.reducer;

/* =========================
   SELECTORS
========================= */

export const {
	selectAll: selectAllConversations,
	selectById: selectConversationById,
	selectIds: selectConversationIds,
} = conversationsAdapter.getSelectors((state: RootState) => state.conversations);
