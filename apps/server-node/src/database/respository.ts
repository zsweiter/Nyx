import {
	AggregateOptions,
	AggregationCursor,
	Collection,
	CollectionOptions,
	Document,
	Filter,
	FindOptions,
	ObjectId,
	OptionalUnlessRequiredId,
} from "mongodb";
import { storage } from "./mongo";

export type WithModel<T> = {
	_id?: string | ObjectId;
} & T & {
		created_at?: Date | string;
		updated_at?: Date | string;
	};

export class MongoRepository<T extends Document> {
	public constructor(protected readonly name: string, protected readonly options?: CollectionOptions) {}

	protected get collection(): Collection<T> {
		return storage.collection<T>(this.name, this.options);
	}

	public async findById(id: string | ObjectId) {
		return await this.collection.findOne({ _id: new ObjectId(id) } as Filter<T>);
	}

	public async findOne(query: Filter<T>, options?: FindOptions) {
		return await this.collection.findOne(query, options);
	}

	public find(filter: Filter<T>, options?: FindOptions) {
		return this.collection.find(filter, options);
	}

	public async save(record: OptionalUnlessRequiredId<T>): Promise<T> {
		const document = {
			_id: new ObjectId(),
			...record,
			created_at: new Date(),
			updated_at: new Date(),
		};

		await this.collection.insertOne(document);

		return document as T;
	}

	public async update(id: string | ObjectId, updates: Partial<T>) {
		const result = await this.collection.updateOne({ _id: new ObjectId(id) } as Filter<T>, { $set: updates });

		return result.modifiedCount > 0;
	}

	public async delete(id: string | ObjectId) {
		const result = await this.collection.deleteOne({ _id: new ObjectId(id) } as Filter<T>);
		return result.deletedCount > 0;
	}

	public async deleteMany(filter: Filter<T>) {
		const result = await this.collection.deleteMany(filter);
		return result.deletedCount > 0;
	}

	public aggregate<T extends Document = Document>(
		pipeline?: Document[],
		options?: AggregateOptions
	): AggregationCursor<T> {
		return this.collection.aggregate(pipeline, options);
	}

	public get db() {
		return this.collection;
	}
}
