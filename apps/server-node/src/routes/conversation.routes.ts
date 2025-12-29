import { Response, Router } from 'express';
import { handleHttpExceptions } from '../exceptions';
import { isAuthenticated } from '../middlewares/isAuthenticated';
import { ConversationService } from '../services/conversation.service';
import { container } from './../packages/container';
import { ObjectId } from 'mongodb';

export const route = Router();

route.put('/upsert-by-user-code/:code', isAuthenticated, async (request: any, response: Response) => {
	try {
		const service = container.get(ConversationService);
		const data = await service.findOrCreateByUserCode(request.userId, request.params.code);

		response.status(200).send({ status: 'Ok', data: data });
	} catch (error) {
		const { message, status, code } = handleHttpExceptions(error);
		response.status(status).send({ message, code });
	}
});

route.get('/paginate', isAuthenticated, async (request: any, response: Response) => {
	try {
		const input = {
			userId: request.userId,
			limit: Number(request.query.limit || 15),
			cursor: request.query.cursor,
		};

		const service = container.get(ConversationService);
		const data = await service.getConversationsPaginated(input.userId, input.limit, input.cursor);

		response.status(200).send({ status: 'Ok', data: data });
	} catch (error) {
		const { message, status, code } = handleHttpExceptions(error);
		response.status(status).send({ message, code });
	}
});

route.delete('/:conversation_id', isAuthenticated, async (request: any, response: Response) => {
	try {
		const service = container.get(ConversationService);
		await service.deleteChat(ObjectId.createFromHexString(request.params.conversation_id));
		response.status(200).send({ status: 'Ok' });
	} catch (error) {
		const { message, status, code } = handleHttpExceptions(error);
		response.status(status).send({ message, code });
	}
});

route.post('/:conversation_id/compress', isAuthenticated, async (request: any, response: Response) => {
	try {
		const service = container.get(ConversationService);
		const keep = Number(request.body.keep || 100);
		await service.compressChat(ObjectId.createFromHexString(request.params.conversation_id), keep);
		response.status(200).send({ status: 'Ok' });
	} catch (error) {
		const { message, status, code } = handleHttpExceptions(error);
		response.status(status).send({ message, code });
	}
});

route.get('/:conversation_id', isAuthenticated, async (request: any, response: Response) => {
	try {
		const service = container.get(ConversationService);
		const data = await service.getConversationById(request.userId, request.params.conversation_id);

		response.status(200).send({ status: 'Ok', data: data });
	} catch (error) {
		const { message, status, code } = handleHttpExceptions(error);
		response.status(status).send({ message, code });
	}
});
