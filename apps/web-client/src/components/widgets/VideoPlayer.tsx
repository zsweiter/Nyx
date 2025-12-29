import { useRef, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
	src: string;
	className?: string;
}

export const VideoPlayer = ({ src,className = "" }: Props) => {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [duration, setDuration] = useState("0:00");
	const [hover, setHover] = useState(true);
	const [posterUrl, setPosterUrl] = useState("");

	useEffect(() => {
		const interval = setInterval(() => {
			if (videoRef.current && isPlaying) {
				const current = videoRef.current.currentTime;
				const total = videoRef.current.duration;
				setProgress((current / total) * 100);
			}
		}, 500);

		return () => clearInterval(interval);
	}, [isPlaying]);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;

		const handleLoadedMetadata = () => {
			video.currentTime = video.duration / 2; // Reset to start
			video.volume = 0.5;

			const dur = Math.floor(video.duration);
			const minutes = Math.floor(dur / 60);
			const seconds = dur % 60;
			setDuration(`${minutes}:${seconds.toString().padStart(2, "0")}`);
		};

		const handleSeeked = () => {
			capturePoster();
		};

		video.addEventListener("loadedmetadata", handleLoadedMetadata);
		video.addEventListener("seeked", handleSeeked);

		return () => {
			video.removeEventListener("loadedmetadata", handleLoadedMetadata);
			video.removeEventListener("seeked", handleSeeked);
		};
	}, [src]);

	const togglePlay = () => {
		if (!videoRef.current) return;
		if (videoRef.current.paused) {
			videoRef.current.play();
			setIsPlaying(true);
		} else {
			videoRef.current.pause();
			setIsPlaying(false);
		}
	};

	const capturePoster = () => {
		if (videoRef.current && canvasRef.current && !posterUrl) {
			canvasRef.current.width = videoRef.current.videoWidth;
			canvasRef.current.height = videoRef.current.videoHeight;
			const ctx = canvasRef.current.getContext("2d");
			ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
			canvasRef.current.toBlob((blob) => {
				if (blob) {
					setPosterUrl(URL.createObjectURL(blob));
				}
			}, "image/jpeg");
		}
	};

	const handleEnded = () => {
		setIsPlaying(false);
		setProgress(100);
	};

	return (
		<div
			className={`relative rounded-lg overflow-hidden ${className}`}
			style={{ backgroundColor: 'var(--secondary-bg)' }}
			onMouseEnter={() => setHover(true)}
			onMouseLeave={() => setHover(false)}
		>
			{src ? (
				<video
					ref={videoRef}
					src={src}
					poster={posterUrl}
					onEnded={handleEnded}
					className="w-full h-auto aspect-video"
					
				/>
			) : (
				<video onEnded={handleEnded} className="w-full h-auto aspect-video" />
			)}
			<canvas ref={canvasRef} style={{ display: "none" }}></canvas>
			{!isPlaying && (
				<button onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/50">
					<Play className="w-12 h-12 rounded-full bg-slate-400/25 p-3" style={{ color: 'var(--panel-text-color)' }} />
				</button>
			)}

			<div
				className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
					hover ? "opacity-0" : "opacity-100"
				} ${isPlaying ? "opacity-100" : "opacity-0"}`}
			>
				<div className="flex items-center justify-between px-3 py-2 bg-black/60">
					<button onClick={togglePlay} className="p-2 rounded-full" style={{ backgroundColor: 'var(--panel-text-color)', color: 'var(--panel-bg-color)' }}>
						{isPlaying ? <Pause size={16} /> : <Play size={16} />}
					</button>
					<div className="text-xs" style={{ color: 'var(--panel-text-color)' }}>{duration}</div>
				</div>
				<div className="h-1" style={{ backgroundColor: 'var(--text-muted)' }}>
					<div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: 'var(--panel-text-color)' }}></div>
				</div>
			</div>
		</div>
	);
};
