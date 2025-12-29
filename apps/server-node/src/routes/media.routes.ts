import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { HttpException } from './../exceptions';

export const route = Router();
const BASE_DIR = path.join(process.cwd(), 'blobs');

const upload = multer({
	storage: multer.diskStorage({
		destination: (_, __, cb) => {
			const tmp = path.join(process.cwd(), 'tmp');
			fs.mkdirSync(tmp, { recursive: true });
			cb(null, tmp);
		},
		filename: (_, __, cb) => {
			cb(null, crypto.randomUUID());
		},
	}),
	limits: { fileSize: 100 * 1024 * 1024 },
});

route.post('/blob/upload', upload.single('file'), async (req, res) => {
	try {
		const { bucket_id, blob_id } = req.body;

		if (!req.file) {
			throw new HttpException('No file uploaded', 400);
		}

		const buffer = await fs.promises.readFile(req.file.path);

		const bucketPath = path.join(BASE_DIR, bucket_id);
		fs.mkdirSync(bucketPath, { recursive: true });

		const finalPath = path.join(bucketPath, blob_id);
		if (fs.existsSync(finalPath)) {
			throw new HttpException('Blob already exists', 409);
		}

		await fs.promises.rename(req.file.path, finalPath);

		res.json({ bucket_id, blob_id, size: buffer.length });
	} catch (err: any) {
		console.error(err);
		res.status(400).send(err.message ?? 'Upload failed');
	}
});

route.get('/blob/:bucket_id/:blob_id', async (req, res) => {
	try {
		const { bucket_id, blob_id } = req.params;

		const filePath = path.join(BASE_DIR, bucket_id, blob_id);
		if (!fs.existsSync(filePath)) {
			return res.sendStatus(404);
		}

		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Cache-Control', 'private, max-age=31536000');
		res.setHeader('Content-Disposition', 'attachment');

		fs.createReadStream(filePath).pipe(res);
	} catch (err) {
		console.error(err);
		res.sendStatus(500);
	}
});
