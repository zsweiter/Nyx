import { memo, useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2 } from 'lucide-react';
import { AudioPayload } from '@/types';
import { UserContextType } from '@/context/AuthContext';
import { useMediaBucket } from '@/hooks/useMediaBucket';
import { Message } from '@/store/slices/messages.slice';
import { AudioWaveformCanvas } from '@/components/widgets/AudioWaveformCanvas';

interface Props {
	payload: AudioPayload;
	message: Message;
	auth: UserContextType;
}

const _AudioMessage = ({ payload, message }: Props) => {
	const audioContextRef = useRef<AudioContext | null>(null);
	const audioBufferRef = useRef<AudioBuffer | null>(null);
	const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(payload?.duration || 0);
	const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);

	const startTimeRef = useRef<number>(0);
	const pausedAtRef = useRef<number>(0);
	const animationFrameRef = useRef<number>(0);

	const { download, isDownloading, fromCache } = useMediaBucket();
	const [url, setUrl] = useState<string>(fromCache(message.conversation_id, payload.id));
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (url) return;
		const fetchAudio = async () => {
			setLoading(true);
			try {
				const objectUrl = await download(message.conversation_id, payload.id, message.conversation_id);
				setUrl(objectUrl);
			} catch (e) {
				console.error('Failed to load audio', e);
			} finally {
				setLoading(false);
			}
		};
		fetchAudio();
	}, [payload?.id, message.conversation_id]);

	useEffect(() => {
		if (!url) return;

		const initAudio = async () => {
			try {
				const response = await fetch(url);
				const arrayBuffer = await response.arrayBuffer();
				const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

				if (!audioContextRef.current) {
					audioContextRef.current = new AudioContext();
				}

				const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
				audioBufferRef.current = audioBuffer;
				setDuration(audioBuffer.duration);

				const samples = 50;
				const rawData = audioBuffer.getChannelData(0);
				const blockSize = Math.floor(rawData.length / samples);
				const peaks: number[] = [];

				for (let i = 0; i < samples; i++) {
					let max = 0;
					for (let j = 0; j < blockSize; j++) {
						const abs = Math.abs(rawData[i * blockSize + j]);
						if (abs > max) max = abs;
					}
					peaks.push(max);
				}

				console.log(peaks.length);

				setWaveformPeaks(peaks);
			} catch (error) {
				console.error('Error decoding audio', error);
			}
		};

		initAudio();
		return () => {
			stopPlayback();
			cancelAnimationFrame(animationFrameRef.current);
		};
	}, [url]);

	const updateProgress = () => {
		if (!isPlaying || !audioContextRef.current) return;

		const now = audioContextRef.current.currentTime;
		const elapsed = now - startTimeRef.current;

		if (elapsed >= (audioBufferRef.current?.duration || 0)) {
			setIsPlaying(false);
			setCurrentTime(0);
			pausedAtRef.current = 0;
			return;
		}

		setCurrentTime(elapsed);
		animationFrameRef.current = requestAnimationFrame(updateProgress);
	};

	useEffect(() => {
		if (isPlaying) {
			animationFrameRef.current = requestAnimationFrame(updateProgress);
		} else {
			cancelAnimationFrame(animationFrameRef.current);
		}
		return () => cancelAnimationFrame(animationFrameRef.current);
	}, [isPlaying]);

	const stopPlayback = () => {
		if (sourceNodeRef.current) {
			sourceNodeRef.current.stop();
			sourceNodeRef.current = null;
		}
	};

	const play = (fromTime: number) => {
		if (!audioContextRef.current || !audioBufferRef.current) return;

		stopPlayback();

		if (audioContextRef.current.state === 'suspended') {
			audioContextRef.current.resume();
		}

		const source = audioContextRef.current.createBufferSource();
		source.buffer = audioBufferRef.current;
		source.connect(audioContextRef.current.destination);

		source.start(0, fromTime);
		startTimeRef.current = audioContextRef.current.currentTime - fromTime;
		sourceNodeRef.current = source;
		setIsPlaying(true);

		source.onended = () => {
			const elapsed = audioContextRef.current!.currentTime - startTimeRef.current;
			if (elapsed >= audioBufferRef.current!.duration - 0.1) {
				setIsPlaying(false);
				setCurrentTime(0);
				pausedAtRef.current = 0;
			}
		};
	};

	const togglePlayback = () => {
		if (isPlaying) {
			pausedAtRef.current = currentTime;
			stopPlayback();
			setIsPlaying(false);
		} else {
			play(pausedAtRef.current);
		}
	};

	const progressPercent = (currentTime / duration) * 100;

	return (
		<div className="flex items-center space-x-2 py-1.5 px-2 rounded-xl bg-neutral-800 w-65">
			<button
				onClick={togglePlayback}
				disabled={loading || !url}
				className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 bg-neutral-700"
			>
				{loading || isDownloading === payload.id ? (
					<Loader2 size={20} className="animate-spin text-white" />
				) : isPlaying ? (
					<Pause size={20} className="-ml-1 text-white fill-current" />
				) : (
					<Play size={20} className="text-white fill-current translate-x-0.5" />
				)}
			</button>

			<div className="flex-1 flex flex-col justify-center space-y-1 relative">
				<AudioWaveformCanvas
					width={200}
					peaks={waveformPeaks}
					progress={progressPercent}
					onSeek={(percentage) => {
						if (!audioBufferRef.current) return;
						const newTime = percentage * audioBufferRef.current.duration;
						pausedAtRef.current = newTime;
						setCurrentTime(newTime);
						if (isPlaying) play(newTime);
					}}
				/>
			</div>
		</div>
	);
};

export const AudioMessage = memo(_AudioMessage);
