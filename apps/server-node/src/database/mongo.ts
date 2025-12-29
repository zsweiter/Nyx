import { MongoClient, Document, CollectionOptions } from "mongodb";
import { config } from "../config";

const instances = {
	def: null as MongoClient | null,
};

const MONGO_URI = `mongodb://${config.DB_HOST}:${config.DB_PORT}`;

export const storage = {
	get def() {
		if (!instances.def) {
			instances.def = new MongoClient(MONGO_URI, {
				monitorCommands: true,
			});
		}

		return instances.def.db(config.DB_SCHEMA);
	},

	collection<H extends Document>(name: string, options?: CollectionOptions) {
		if (!instances.def) {
			instances.def = new MongoClient(MONGO_URI, {
				monitorCommands: true,
			});
		}

		return instances.def.db(config.DB_SCHEMA).collection<H>(name, options);
	},
};
