import { useNavigate } from 'react-router-dom';
import { Fragment, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AddContactModal } from './../contacts/AddContactModal';
import { Copy, LogOut, Plus, Settings } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import type { Conversation } from '@/store/slices/conversation.slice';
import type { User } from '@/store/slices/user.slice';
import { Dialog } from '../shared/Dialog';
import { SettingsPanel } from '../settings/SettingsPanel';

interface Props {
	conversations: Conversation[];
	user: User;
	currentConversation: Conversation | null;
	loading: boolean;
}

const ConversationItemSkeleton = () => {
	return (
		<div className="flex items-center gap-3 px-4 py-3 rounded-lg w-full">
			<div className="w-10 h-10 rounded-full bg-neutral-800 animate-pulse" />
			<div className="flex-1 space-y-2">
				<div className="h-4 w-2/3 bg-neutral-800 rounded animate-pulse" />
				<div className="h-3 w-1/3 bg-neutral-800 rounded animate-pulse" />
			</div>
			<div className="w-6 h-6 bg-neutral-800 rounded animate-pulse" />
		</div>
	);
};

const RenderList = ({
	conversations,
	currentConversation,
	loading,
	goToConversation,
}: Props & {
	goToConversation: (id: string) => void;
}) => {
	if (conversations.length === 0)
		return (
			<div className="flex items-center flex-col justify-center h-32 text-sm text-neutral-500">
				Empty conversations
			</div>
		);

	return (
		<ul className="flex-1 overflow-y-auto py-2 h-full">
			<AnimatePresence mode="popLayout">
				{loading ? (
					<div className="flex items-center flex-col justify-center h-32 text-sm text-neutral-500">
						{Array.from({ length: 4 }).map((_, index) => (
							<ConversationItemSkeleton key={index} />
						))}
					</div>
				) : (
					conversations.map((item) => (
						<ConversationItem
							key={item._id}
							conversation={item}
							isActive={currentConversation?._id == item._id}
							onClick={goToConversation}
						/>
					))
				)}
			</AnimatePresence>
		</ul>
	);
};

export const ConversationList = ({ conversations, user, currentConversation, loading }: Props) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [openSettings, setOpenSettings] = useState(false);
	const navigate = useNavigate();

	const goToConversation = (id: string) => {
		if (id !== currentConversation?._id) navigate(`/chat/${id}`);
	};

	const handleLogout = () => {
		localStorage.removeItem('auth-token');
		localStorage.removeItem('user');
		navigate('/auth/login');
	};

	return (
		<Fragment>
			<div className="flex items-center justify-between px-4 py-5 border-b border-neutral-800">
				<div>
					<p className="text-[14px] inline-flex items-center gap-3 px-3 py-2 rounded-lg bg-teal-500/10 text-teal-400">
						<span className=" select-all">{user?.code || '...'}</span>
						<Copy className="cursor-pointer hover:text-amber-500" size={16} onClick={() => navigator.clipboard.writeText(user?.code || '')} />
					</p>
				</div>

				<button
					onClick={() => setIsModalOpen(true)}
					className="cursor-pointer p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition"
					title="Agregar contacto"
				>
					<Plus size={20} className="text-teal-500" />
				</button>
			</div>

			<Dialog isOpen={openSettings} onClose={() => setOpenSettings(false)}>
				<SettingsPanel onClose={() => setOpenSettings(false)} />
			</Dialog>

			<div className="flex flex-col h-full justify-between">
				<div className='w-full' style={{ maxHeight: `calc(var(--viewport-height) - 25vh)`}}>
					<RenderList
						conversations={conversations}
						currentConversation={currentConversation}
						loading={loading}
						goToConversation={goToConversation}
						user={user}
					/>
				</div>

				<div className="py-3 border-t border-neutral-800 flex flex-col gap-2 items-center justify-between self-end w-full">
					<button
						onClick={() => setOpenSettings(true)}
						className="w-full cursor-pointer px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 inline-flex items-center gap-2"
						title="Ajustes"
					>
						<Settings size={16} className="text-teal-500" />
						Settings
					</button>
					<button
						onClick={handleLogout}
						className="w-full cursor-pointer px-4 py-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 inline-flex items-center gap-2"
						title="Salir"
					>
						<LogOut size={16} className="text-teal-500" />
						Logout
					</button>
				</div>
			</div>

			<AddContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
		</Fragment>
	);
};
