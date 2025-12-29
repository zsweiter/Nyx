import { Mic, Paperclip, Send, StopCircle, FileText } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { MessagePayload, MessageType } from '@/types';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { snowflake } from '@/crypto/snowflake';

interface FormFooterProps {
	onMessageSend: (payload: MessagePayload & { file?: File }) => void;
	onTyping: () => void;
}

export const Footer = ({ onMessageSend, onTyping }: FormFooterProps) => {
	const [text, setText] = useState('');
	const [file, setFile] = useState<File | null>(null);

	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isTypingRef = useRef(false);

	useEffect(() => {
		if (!text || file) return;

		if (!isTypingRef.current) {
			isTypingRef.current = true;
			onTyping();
		}

		if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

		typingTimeoutRef.current = setTimeout(() => {
			isTypingRef.current = false;
		}, 250);
	}, [text]);

	const cleanTypers = () => {
		if (isTypingRef.current) {
			isTypingRef.current = false;
		}

		if (typingTimeoutRef.current) {
			clearTimeout(typingTimeoutRef.current);
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (file) {
			const _types = {
				image: MessageType.Image,
				file: MessageType.Document,
				audio: MessageType.Audio,
				video: MessageType.Video,
				sticker: MessageType.Sticker,
			};

			const type = _types[file.type.split('/')[0]] || MessageType.Document;

			onMessageSend({
				type,
				payload: {
					id: snowflake.nextId(),
					caption: text,
					mime_type: file.type,
				},
				file,
			});

			setFile(null);
			setText('');
		} else if (text) {
			onMessageSend({
				type: MessageType.Text,
				payload: { body: text },
			});
			setText('');
		}

		cleanTypers();
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const f = e.target.files?.[0];
		if (f) setFile(f);
	};

	const { startRecording, stopRecording, recording } = useVoiceRecorder({
		onComplete(file, duration) {
			onMessageSend({
				type: MessageType.Audio,
				payload: {
					id: file.name,
					caption: text,
					mime_type: file.type,
					duration,
				},
			});

			cleanTypers();
		},
	});

	// --- Render preview del archivo ---
	const renderPreview = () => {
		if (!file) return null;

		const type = file.type.split('/')[0];

		switch (type) {
			case 'image':
				return (
					<div className="max-w-30 max-h-30">
						<img
							src={URL.createObjectURL(file)}
							alt={file.name}
							className="object-contain max-w-full max-h-full rounded-md"
						/>
					</div>
				);
			case 'audio':
				return (
					<audio controls className="max-w-xs">
						<source src={URL.createObjectURL(file)} type={file.type} />
						Your browser does not support the audio element.
					</audio>
				);
			default:
				return (
					<div className="flex items-center gap-2 bg-neutral-700 p-2 rounded-md max-w-xs">
						<FileText size={24} />
						<span className="truncate">{file.name}</span>
					</div>
				);
		}
	};

	return (
		<div className="flex flex-col gap-2">
			{file && renderPreview()}
			<form onSubmit={handleSubmit} className="flex items-center gap-2">
				<label className="cursor-pointer p-2 hover:bg-neutral-700 rounded-full text-neutral-400 hover:text-white transition-colors">
					<Paperclip size={20} />
					<input type="file" className="hidden" onChange={handleFileSelect} />
				</label>

				<input
					type="text"
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="Write something..."
					className="flex-1 bg-neutral-800 px-5 py-3 rounded-xl text-neutral-300"
				/>

				{text || file ? (
					<button
						type="submit"
						className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-500 transition-colors"
					>
						<Send size={20} />
					</button>
				) : (
					<button
						type="button"
						onClick={recording ? stopRecording : startRecording}
						className={`p-2 rounded-full text-white transition-colors ${
							recording ? 'bg-red-500 animate-pulse' : 'bg-neutral-700 hover:bg-neutral-600'
						}`}
					>
						{recording ? <StopCircle size={20} /> : <Mic size={20} />}
					</button>
				)}
			</form>
		</div>
	);
};
