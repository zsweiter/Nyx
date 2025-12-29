import { MoreVertical, PackageMinus, Trash2 } from 'lucide-react';
import { memo, useState } from 'react';

interface Props {
	recipient: {
		avatar: string;
		name: string;
		status?: string;
	};
	isTyping: boolean;

	onDelete?: () => void;
	onCompress?: () => void;
}

const _Header = ({ recipient, isTyping, onDelete, onCompress }: Props) => {
	const [openMenu, setOpenMenu] = useState(false);
	return (
		<div className="w-full p-4 px-8 shadow-lg flex items-center gap-4 justify-between backdrop-blur bg-neutral-600/20">
			<div className='flex gap-4 items-center'>
				<div className="shrink-0 w-10 h-10 rounded-full overflow-hidden">
					<img
						className="object-cover w-full h-full rounded-full"
						src={recipient.avatar}
						alt={recipient.name}
					/>
				</div>
				<div>
					<h2 className="text-white font-medium text-lg leading-none">{recipient.name}</h2>
					<small className="text-green-500 leading-none text-[8px]">
						{isTyping ? 'Typing...' : recipient?.status}
					</small>
				</div>
			</div>
			<div>
				<button
					onClick={(e) => {
						e.stopPropagation();
						setOpenMenu((v) => !v);
					}}
					className="p-1 rounded hover:bg-neutral-800"
					title="Opciones"
				>
					<MoreVertical size={20} className="text-neutral-400" />
				</button>
			</div>

			{openMenu && (
				<div className="absolute right-4 mt-30 z-10 bg-neutral-900 border border-neutral-800 rounded-lg shadow-lg w-40">
					<button
						className="w-full flex items-center gap-2 px-3 py-3 text-sm text-neutral-300 hover:bg-neutral-800"
						onClick={(e) => {
							e.stopPropagation();
							setOpenMenu(false);
							onDelete?.();
						}}
					>
						<Trash2 size={16} className="text-red-400" />
						Delete chat
					</button>
					<button
						className="w-full flex items-center gap-2 px-3 py-3 text-sm text-neutral-300 hover:bg-neutral-800"
						onClick={(e) => {
							e.stopPropagation();
							setOpenMenu(false);
							onCompress?.();
						}}
					>
						<PackageMinus size={16} className="text-yellow-400" />
						Compress chat
					</button>
				</div>
			)}
		</div>
	);
};

export const Header = memo(_Header);
