import { useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Fragment } from 'react/jsx-runtime';
import { socket } from '@/websocket';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
	pushMessage,
	Message,
	selectGroupedMessagesByMinute,
	updateMessageStatus,
} from '@/store/slices/messages.slice';
import { ConnectionEventType, MessageEventType } from '@/shared/event-types';
import { fetchConversationById, selectConversationById } from '@/store/slices/conversation.slice';
import { cipher } from '@/crypto/new-cipher';
import { MessagePayload, MessageType } from '@/types';
import { useMediaBucket } from '@/hooks/useMediaBucket';
import { snowflake } from '@/crypto/snowflake';
import { Header } from './Header';
import { Footer } from './Footer';
import { Messages } from '@/components/messages/Messages';

export const ConversationView = () => {
	const params = useParams();
	const dispatch = useAppDispatch();

	const conversationId = useMemo(() => params.conversation_id, [params.conversation_id]);

	const selectGroupedMessages = useMemo(selectGroupedMessagesByMinute, []);
	const messages = useAppSelector((state) => selectGroupedMessages(state, conversationId));

	const conversation = useAppSelector((state) => selectConversationById(state, conversationId));
	const recipient = useMemo(() => conversation?.recipient, [conversation]);
	const user = useAppSelector((state) => state.users.user);
	const isSameRecipient = useMemo(() => recipient?._id === user._id, [recipient, user]);

	const messagesRef = useRef<HTMLDivElement>(null);
	const scrollMessagesToBottom = () => {
		if (messagesRef.current) {
			setTimeout(() => {
				messagesRef.current.scrollTo({
					top: messagesRef.current.scrollHeight,
					behavior: 'smooth',
				});
			}, 100);
		}
	};

	useEffect(() => {
		scrollMessagesToBottom();
	}, [messages, conversation?.isTyping]);

	useEffect(() => {
		if (conversationId) {
			dispatch(fetchConversationById(conversationId));
		}
	}, [conversationId, dispatch]);

	const onUserInput = () => {
		// Prevent sending typing event if the recipient is the same as the user
		if (isSameRecipient) return;

		socket.dispatch(ConnectionEventType.USER_TYPING_START, {
			recipient_id: recipient?._id,
			conversation_id: conversationId,
		});
	};

	const { upload } = useMediaBucket();

	const handleSendMessage = async (payload: MessagePayload & { file?: File }) => {
		const messageId = snowflake.nextId();

		const message: Partial<Message> = {
			_id: messageId,
			conversation_id: conversationId,
			owner_id: user._id,
			recipient_id: recipient?._id,
			sender_id: user._id,
			type: payload.type,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			status: 'pending',
		};

		if (payload.file) {
			const bucketId = conversationId!;
			const blobId = messageId;

			dispatch(pushMessage({ ...message, payload: { ...payload.payload, id: blobId } } as Message));

			try {
				await upload(payload.file, bucketId, blobId, conversationId!);

				dispatch(
					updateMessageStatus({
						messageIds: [messageId],
						status: 'sent',
						conversationId,
					})
				);

				const minimalMessage = {
					...message,
					payload: {
						...payload.payload,
						id: blobId, // Ensure recipient references the same blobId
					},
				};

				socket.dispatch(MessageEventType.MESSAGE_SEND, minimalMessage as Message);
			} catch (error) {
				console.error('Upload failed', error);
			}

			return;
		}

		if (payload.type === MessageType.Text) {
			const content = await cipher.encryptText(payload.payload.body, conversationId).catch((err) => {
				console.error('No se pudo cifrar el mensaje', err);
				return payload.payload.body;
			});

			message.payload = {
				body: content,
			};
		}

		dispatch(pushMessage({ ...message, payload: payload.payload } as Message));

		socket.dispatch(MessageEventType.MESSAGE_SEND, message as Message);
	};

	if (!conversation) {
		return <div>Loading...</div>;
	}

	return (
		<Fragment>
			<div className="flex flex-col h-screen bg-transparent">
				<Header
					recipient={{
						avatar: recipient?.avatar,
						name: recipient?.username,
						status: recipient?.status,
					}}
					isTyping={conversation.isTyping}
				/>

				<div className="flex-1 p-8 overflow-y-auto relative" ref={messagesRef}>
					<Messages messages={messages} isTyping={conversation.isTyping} user={user} />
				</div>

				<div className="px-8 py-6">
					<Footer onMessageSend={handleSendMessage} onTyping={onUserInput} />
				</div>
			</div>
		</Fragment>
	);
};
