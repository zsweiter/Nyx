import { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { IncomingMessage } from 'http';
import { HttpException } from './../exceptions';
import { jwtManager } from './../security/crypto';

export const isAuthenticated = async (request: Request, response: Response, next: NextFunction) => {
	const token = String(request.headers.authorization || '').replace('Bearer ', '');
	try {
		const data = await jwtManager.verify(token.trim());
		Object.assign(request, {
			user: data.data,
			userId: ObjectId.createFromHexString((data.data as any).sub as string),
		});

		return next();
	} catch (error) {
		if (error instanceof HttpException) {
			return response.status(401).send({ reason: error.message });
		}

		return next(error);
	}
};

export const socketAuthenticated = async (request: IncomingMessage, url: URL) => {
	// Get autorization token
	const token = String(
		request.headers['authorization']?.replace('Bearer ', '') ||
			request.headers['sec-websocket-protocol']?.split(',')[0] ||
			url.searchParams.get('access-token')
	);
	try {
		const data = await jwtManager.verify(token.trim());

		return (data.data as any).sub as string;
	} catch (error) {
		throw error;
	}
};
