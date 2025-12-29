import { Request, Response, Router } from 'express';
import multer, { diskStorage } from 'multer';
import { User, UserService } from '../services/users.service';
import { handleHttpExceptions } from '../exceptions';
import { isAuthenticated } from '../middlewares/isAuthenticated';
import { container } from './../packages/container';

export const route = Router();
const upload = multer({
    storage: diskStorage({
        destination: './uploads',
        filename: function (req, file, cb) {
            cb(null, file.originalname);
        },
    }),
});

// For normal users
route.post('/login', async (request: Request, response: Response) => {
    try {
        const body = request.body;

        const service = container.get(UserService);
        const data = await service.login(body.email, body.password);

        response.status(200).send({ status: 'Ok', data });
    } catch (error) {
        const { message, status, code } = handleHttpExceptions(error);
        response.status(status).send({ message, code });
    }
});

route.post('/register', upload.single('avatar'), async (request: Request, response: Response) => {
    try {
        const user: User = {
            ...(request.body as User),
            avatar: request.file?.originalname,
            public_key: request.body.public_key,
        };

        const service = container.get(UserService);
        const data = await service.register(user);

        response.status(200).send({ status: 'Ok', data: data });
    } catch (error) {
        const { message, status, code } = handleHttpExceptions(error);
        response.status(status).send({ message, code });
    }
});

// For anonymous users
route.post('/join', async (request: Request, response: Response) => {
    try {
        const input = {
            publicKey: request.body.public_key,
            code: request.body.code,
        };

        const service = container.get(UserService);
        const data = await service.join(input.publicKey, input.code);

        response.status(200).send({ status: 'Ok', data });
    } catch (error) {
        const { message, status, code } = handleHttpExceptions(error);
        response.status(status).send({ message, code });
    }
});

route.get('/code/:code', isAuthenticated, async (request: Request, response: Response) => {
    try {
        // @ts-ignore
        const requesterId = request.userId;

        const code = request.params.code;
        const service = container.get(UserService);
        const data = await service.findByCode(code);

        if (!data) {
            return response.status(404).send({ message: 'User not found', code: 'NOT_FOUND' });
        }

        response.status(200).send({
            status: 'Ok',
            data: {
                conversation_id: data._id,
            },
        });
    } catch (error) {
        const { message, status, code } = handleHttpExceptions(error);
        response.status(status).send({ message, code });
    }
});

route.get('/me', isAuthenticated, async (request: Request, response: Response) => {
    try {
        const service = container.get(UserService);
        // @ts-ignore
        const data = await service.findById(request.userId!);

        response.status(200).send({ status: 'Ok', data });
    } catch (error) {
        const { message, status, code } = handleHttpExceptions(error);
        response.status(status).send({ message, code });
    }
});

route.put('/profile', isAuthenticated, upload.single('avatar'), async (request: Request, response: Response) => {
    try {
        const service = container.get(UserService);
        // @ts-ignore
        const requesterId = request.userId!;
        const username = String(request.body.username || '').trim() || undefined;
        const avatar = request.file?.originalname || undefined;
        const data = await service.updateProfile(requesterId, { username, avatar });
        response.status(200).send({ status: 'Ok', data });
    } catch (error) {
        const { message, status, code } = handleHttpExceptions(error);
        response.status(status).send({ message, code });
    }
});

route.get('/search', isAuthenticated, async (request: Request, response: Response) => {
    try {
        const username = request.query.username;

        const service = container.get(UserService);
        const data = await service.search({ username });

        response.status(200).send({ status: 'Ok', data: data });
    } catch (error) {
        const { message, status, code } = handleHttpExceptions(error);
        response.status(status).send({ message, code });
    }
});
