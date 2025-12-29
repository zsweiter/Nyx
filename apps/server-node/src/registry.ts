import { container } from './packages/container';
import { User, UserService } from './services/users.service';
import { Message, MessagesService } from './services/messages.service';
import { ConversationService } from './services/conversation.service';
import { MongoRepository } from './database/respository';

export const registryServices = () => {
    container.bind(UserService, () => new UserService(new MongoRepository<User>('users')));
    container.bind(MessagesService, () => new MessagesService(new MongoRepository<Message>('messages')));
    container.bind(ConversationService, (app) => new ConversationService(app.get(UserService), app.get(MessagesService)));
};
