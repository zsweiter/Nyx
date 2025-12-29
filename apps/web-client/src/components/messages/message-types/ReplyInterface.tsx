import { memo, useState } from "react";
import { Reply } from "lucide-react";
import { Message } from "@/store/slices/messages.slice";

interface ReplyInterfaceProps {
	message: Message;
	onReply: (message: Message) => void;
}

const _ReplyInterface = ({ message, onReply }: ReplyInterfaceProps) => {
	const [showReply, setShowReply] = useState(false);

	const handleReply = () => {
		onReply(message);
		setShowReply(false);
	};

	return (
		<div className="relative">
			<button
				onClick={() => setShowReply(!showReply)}
				className="absolute -left-10 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
				style={{ backgroundColor: "var(--compose-input-background)" }}
				onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--menu-hover)")}
				onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--compose-input-background)")}
			>
				<Reply size={16} style={{ color: "var(--panel-text-color)" }} />
			</button>

			{showReply && (
				<div
					className="absolute top-0 left-full ml-2 rounded-lg p-2 shadow-lg z-10 w-37.5"
					style={{ backgroundColor: "var(--panel-bg-color)" }}
				>
					<button
						onClick={handleReply}
						className="w-full text-left p-2 rounded transition-colors"
						style={{ color: "var(--panel-text-color)" }}
						onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--menu-hover)")}
						onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
					>
						Responder
					</button>
				</div>
			)}
		</div>
	);
};

export const ReplyInterface = memo(_ReplyInterface);
