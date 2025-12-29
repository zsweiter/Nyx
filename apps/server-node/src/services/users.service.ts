import crypto from 'node:crypto';
import { Filter, ObjectId } from 'mongodb';
import { HttpException } from '../exceptions';
import { generateFileURL } from '../utils';
import { MongoRepository, WithModel } from '../database/respository';
import { jwtManager, krypton } from './../security/crypto';

export type User = WithModel<{
	username: string;
	email: string;
	password?: string;
	status?: boolean;
	avatar?: string;
	code: string;
	anonymous: boolean;
	blocked?: ObjectId[];
	public_key?: string;
}>;

const ADJECTIVES = [
	'Neo',
	'Dark',
	'Ghost',
	'Cyber',
	'Null',
	'Quantum',
	'Shadow',
	'Crypto',
	'Binary',
	'Silent',
	'Red',
	'Blue',
	'Black',
	'White',
	'Iron',
	'Void',
	'Hyper',
	'Ultra',
	'Dead',
	'Cold',
	'Neon',
	'Static',
	'Raw',
	'Infinite',
	'Hidden',
	'Broken',
];

const NOUNS = [
	'Fox',
	'Root',
	'Byte',
	'Ninja',
	'Specter',
	'Kernel',
	'Glitch',
	'Daemon',
	'Zero',
	'Cipher',
	'Protocol',
	'Matrix',
	'Node',
	'Vector',
	'Payload',
	'Overflow',
	'Fragment',
	'Sector',
	'Signal',
	'Thread',
	'Cache',
	'Loop',
	'Stack',
];

export class UserService {
	public constructor(private readonly repository: MongoRepository<User>) {}

	public async findParticipantsByIds(ids: ObjectId[]) {
		const cursor = this.repository.find({ _id: { $in: ids } }, { projection: { password: 0 } });
		const records = await cursor.toArray();

		return records.map((record) => ({
			...record,
			avatar: generateFileURL(record.avatar) || undefined,
		}));
	}

	public async login(email: string, password: string) {
		const user = await this.repository.findOne({ email });
		if (user === null) {
			throw new HttpException('invalid user or password', 401, 'AUTH_ERROR');
		}

		const matches = await krypton.compare(password, user.password || '');
		if (!matches) {
			throw new HttpException('password not matches', 401, 'AUTH_ERROR');
		}

		return this.generateToken(user);
	}

	public async register(user: User) {
		const password = await krypton.make(user.password || '');

		const response = await this.repository.save({
			username: user.username,
			email: user.email,
			password: password,
			avatar: this.fallbackAvatar(user.avatar as any, user.username),
			code: this.generatePrettyCode(),
			anonymous: false,
			public_key: user.public_key,
		});

		return this.generateToken(response);
	}

	public async users(of: ObjectId[]) {
		const cursor = this.repository.find(
			{ _id: { $in: of } },
			{
				projection: {
					password: 0,
				},
			}
		);
		const records = await cursor.toArray();

		return records.map((record) => ({
			...record,
			avatar: generateFileURL(record.avatar) || undefined,
		}));
	}

	public async join(publicKey: string, code?: string) {
		const joinCode = code || this.generatePrettyCode();
		try {
			const exists = await this.repository.findOne({ code: joinCode }, { projection: { password: 0 } });
			if (exists) {
				throw new Error('Code already exists');
			}

			const username = this.generateName();
			const email = `${username}@anom.local`;
			const user = await this.repository.save({
				code: joinCode,
				username: username,
				email: email,
				anonymous: true,
				avatar: this.fallbackAvatar(null, username),
				public_key: publicKey,
			});

			return await this.generateToken(user);
		} catch (error) {
			throw error;
		}
	}

	public async search(query: Filter<User>): Promise<User | null> {
		const record = await this.repository.findOne(query, { projection: { password: 0 } });
		if (!record) {
			return null;
		}

		return {
			...record,
			avatar: generateFileURL(record.avatar) || undefined,
		};
	}

	public async findByCode(code: string): Promise<User | null> {
		const record = await this.repository.findOne({ code: code }, { projection: { password: 0 } });

		if (!record) {
			return null;
		}

		return {
			...record,
			avatar: generateFileURL(record.avatar) || undefined,
		};
	}

	public async findById(id: string | ObjectId): Promise<User> {
		const _id = typeof id === 'string' ? ObjectId.createFromHexString(id) : id;
		const record = await this.repository.findOne({ _id }, { projection: { password: 0 } });

		if (!record) {
			throw new HttpException('User not found', 404, 'NOT_FOUND');
		}

		return {
			...record,
			avatar: generateFileURL(record.avatar) || undefined,
		};
	}

	public async updateProfile(id: string | ObjectId, changes: { username?: string; avatar?: string }): Promise<User> {
		const _id = typeof id === 'string' ? ObjectId.createFromHexString(id) : id;
		const $set: Partial<User> = {};

		if (typeof changes.username === 'string' && changes.username.trim().length > 0) {
			$set.username = changes.username.trim();
		}

		if (typeof changes.avatar === 'string' && changes.avatar.trim().length > 0) {
			$set.avatar = changes.avatar.trim();
		}

		if (Object.keys($set).length > 0) {
			await this.repository.db.updateOne({ _id }, { $set } as any);
		}

		return await this.findById(_id);
	}

	protected async generateToken(user: User) {
		user.avatar = generateFileURL(user.avatar) || undefined;
		delete user.password;
		const payload = {
			id: user._id,
			email: user.email,
			username: user.username,
		};

		const plainToken = await jwtManager.sign(payload, { expiresIn: '24h' });

		return {
			token: plainToken,
			data: user,
		};
	}

	protected generatePrettyCode(blocks = 3, size = 4) {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		const block = () =>
			Array.from(crypto.getRandomValues(new Uint8Array(size)))
				.map((v) => chars[v % chars.length])
				.join('');

		return Array.from({ length: blocks }).map(block).join('-');
	}

	protected generateName() {
		const pick = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
		const mode = Math.floor(Math.random() * 3);

		const a1 = pick(ADJECTIVES);
		const a2 = pick(ADJECTIVES);
		const n1 = pick(NOUNS);
		const n2 = pick(NOUNS);

		switch (mode) {
			case 0:
				return `${a1}${n1}`;

			case 1:
				return `${n2}${a2}`;

			default:
				return `${n1}${n2}`;
		}
	}

	public async updateStatus(userId: string | ObjectId, status: boolean) {
		const _id = typeof userId === 'string' ? ObjectId.createFromHexString(userId) : userId;
		await this.repository.db.updateOne({ _id }, { $set: { status } } as any);
	}

	public async blockUser(userId: ObjectId, targetId: ObjectId) {
		await this.repository.db.updateOne({ _id: userId }, { $addToSet: { blocked: targetId } } as any);
	}

	public async unblockUser(userId: ObjectId, targetId: ObjectId) {
		await this.repository.db.updateOne({ _id: userId }, { $pull: { blocked: targetId } } as any);
	}

	private fallbackAvatar(avatar: string | null, name: string) {
		if (avatar) return avatar;
		return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${name}${Math.random() > 0.5 ? '&glases=dark1' : ''}`;
	}
}
