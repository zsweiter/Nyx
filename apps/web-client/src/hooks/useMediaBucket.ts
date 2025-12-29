import { httpClient } from '../shared/http-client';
import { useState, useCallback } from 'react';
import { cipher } from '../crypto/new-cipher';
import { useImageSanitizer } from './useImageSanitizer';
import { useAudioFileSanitizer } from './useAudioFileSanitizer';

// Simple in-memory cache for decrypted blobs to avoid re-decrypting
const blobCache = new Map<string, string>();
type ObjectURL = string | null;

const getURL = (): typeof URL | null => {
	if (typeof window === 'undefined') return null;
	return window.URL || (window as any).webkitURL || null;
};

const createObjectURL = async (blob: Blob): Promise<ObjectURL> => {
	const urlAPI = getURL();
	if (urlAPI?.createObjectURL) {
		try {
			return urlAPI.createObjectURL(blob);
		} catch (err) {
			console.warn('createObjectURL failed, falling back', err);
		}
	}

	return new Promise((resolve, reject) => {
		try {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(null);
			reader.readAsDataURL(blob);
		} catch {
			resolve(null);
		}
	});
};

const revokeObjectURL = (url?: string | null) => {
	if (!url) return;
	const urlAPI = getURL();
	if (!urlAPI?.revokeObjectURL) return;

	try {
		urlAPI.revokeObjectURL(url);
	} catch (err) {
		console.warn('revokeObjectURL failed', err);
	}
};

export const useMediaBucket = (storage: 'remote' | 'local' = 'remote') => {
	const [isUploading, setIsUploading] = useState<string | null>(null);
	const [uploadProgress, setUploadProgress] = useState<number>(0);
	const [isDownloading, setIsDownloading] = useState<string | null>(null);

	const imageSanitizer = useImageSanitizer();
	const audioSanitizer = useAudioFileSanitizer();

	const buckets = {
		remote: {
			upload: async (file: File, bucketId: string, blobId: string, peerId?: string) => {
				const cacheKey = `${bucketId}-${blobId}`;
				try {
					setIsUploading(blobId);
					setUploadProgress(0);

					let fileToUpload: File | Blob = file;
					switch (file.type) {
						case 'image/jpeg':
						case 'image/png':
							fileToUpload = await imageSanitizer.sanitize(file);
							break;
						case 'audio/mpeg':
							fileToUpload = await audioSanitizer.sanitize(file);
							break;
					}

					blobCache.set(cacheKey, await createObjectURL(fileToUpload));

					// Encrypt if peerKey is provided
					if (peerId) {
						const buffer = await cipher.encryptFile(file, {}, peerId);
						fileToUpload = new Blob([buffer], { type: 'application/octet-stream' });
					}

					const formData = new FormData();
					formData.append('file', fileToUpload as File); // Cast to File to satisfy TS, though Blob works in FormData
					formData.append('bucket_id', bucketId);
					formData.append('blob_id', blobId);

					// Fake progress for now as axios progress events might need more setup in httpClient
					// In a real app, pass onUploadProgress to httpClient
					setUploadProgress(50);

					const response = await httpClient.postForm('/media/blob/upload', formData);

					setUploadProgress(100);
					return response.data;
				} catch (err: any) {
					console.error('Upload failed:', err);
					throw err;
				} finally {
					setIsUploading(null);
					setUploadProgress(0);
				}
			},
			download: async (bucketId: string, blobId: string, peerId?: string): Promise<string> => {
				const cacheKey = `${bucketId}:${blobId}`;

				// Check cache first
				if (blobCache.has(cacheKey)) {
					return blobCache.get(cacheKey)!;
				}

				try {
					setIsDownloading(blobId);
					const response = await httpClient.get(`/media/blob/${bucketId}/${blobId}`, {
						responseType: 'arraybuffer',
					});

					let url: string;

					if (peerId) {
						const decryptedFile = await cipher.decryptFile(response.data, peerId);
						url = await createObjectURL(decryptedFile);
					} else {
						const blob = new Blob([response.data]);
						url = await createObjectURL(blob);
					}

					// Cache the URL
					blobCache.set(cacheKey, url);
					return url;
				} catch (err: any) {
					console.error('Download failed:', err);
					throw err;
				} finally {
					setIsDownloading(null);
				}
			},
		},
		local: {
			// Local fallback impl remains simple for now
			upload: async (_file: File, _bucketId: string, _blobId: string) => {
				// ... existing implementation if needed or similar logic
				return null;
			},
			download: async (_bucketId: string, _blobId: string) => {
				return '';
			},
		},
	};

	// Helper to clear cache if needed
	const clearCache = useCallback((bucketId: string, blobId: string) => {
		const key = `${bucketId}:${blobId}`;
		const url = blobCache.get(key);
		if (url) {
			revokeObjectURL(url);
			blobCache.delete(key);
		}
	}, []);

	const fromCache = useCallback((bucketId: string, blobId: string) => {
		const key = `${bucketId}:${blobId}`;
		return blobCache.get(key);
	}, []);

	return {
		isUploading,
		uploadProgress,
		isDownloading,
		upload: buckets[storage].upload,
		download: buckets[storage].download,
		clearCache,
		fromCache,
	};
};
