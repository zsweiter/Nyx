import './config';
import express from 'express';
import https from 'node:https';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';

import { route as userRoutes } from './routes/user.routes';
import { route as messagesRoutes } from './routes/messages.routes';
import { route as conversationRoutes } from './routes/conversation.routes';
import { route as mediaRoutes } from './routes/media.routes';

import { Server } from './packages/streamline';
import { socketAuthenticated } from './middlewares/isAuthenticated';
import { saveMessage, deleteMessage } from './routes/messages.broadcast';
import { typing, stopTyping } from './routes/typing.broadcast';
import { handleConnection, handleDisconnection } from './routes/connection.broadcast';
import { handleAnswer, handleCandidate, handleOffer } from './routes/signaling.broadcast';
import { ConnectionEventType, MessageEventType, SignalingEventType } from './shared/event-types';
import { container } from './packages/container';
import { registryServices } from './registry';

const app = express();

const corsOptions = {
	origin: config.CORS_ORIGINS,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
	allowedHeaders: [
		'Content-Type',
		'Authorization',
		'auth-token',
		'Origin',
		'Accept',
		'X-Requested-With',
		'Cache-Control',
		'Access-Control-Allow-Origin',
	],
};

app.use(cors(corsOptions));
app.use((req, res, next) => {
	// @ts-ignore
	req.container = container;

	console.log('Request:', req.method, req.url);
	next();
});

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registry services
registryServices();

const options = {
	key: fs.readFileSync(path.join(__dirname, '../../../certs/localhost-key.pem')),
	cert: fs.readFileSync(path.join(__dirname, '../../../certs/localhost.pem')),
};

const httpServer = https.createServer(options, app);
const sockline = new Server();

sockline.connect(httpServer, {
	path: '/v1/socket',
	tokenKey: 'auth-token',
});

/** REST ROUTES */
app.get('/health', (request, response) => {
	return response.send({ status: 'Operational' });
});

app.use('/v1/auth', userRoutes);
app.use('/v1/messages', messagesRoutes);
app.use('/v1/conversations', conversationRoutes);
app.use('/v1/media', mediaRoutes);

/** STREAMLINE SOCKET */
sockline.useAuth(socketAuthenticated);

sockline.handle('connection', (socket, request) => {
	handleConnection(socket, sockline);

	socket.on(MessageEventType.MESSAGE_SEND, saveMessage);
	socket.on(MessageEventType.MESSAGE_DELETED, deleteMessage);

	socket.on(ConnectionEventType.USER_TYPING_START, typing);
	socket.on(ConnectionEventType.USER_TYPING_STOP, stopTyping);

	socket.on(SignalingEventType.P2P_OFFER, handleOffer);
	socket.on(SignalingEventType.P2P_ANSWER, handleAnswer);
	socket.on(SignalingEventType.P2P_CANDIDATE, handleCandidate);
});

sockline.handle('disconnection', (socket) => {
	handleDisconnection(socket, sockline);
});

const PORT = Number(process.env.PORT || 3030);
httpServer.listen(PORT, '0.0.0.0', () => {
	console.log(`✅ HTTPS Server running on https://localhost:${PORT}`);
	console.log(`📡 Socket: https://localhost:${PORT}/v1/socket`);
});
