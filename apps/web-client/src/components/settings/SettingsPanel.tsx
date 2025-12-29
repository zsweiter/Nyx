import { useState, useMemo } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setTheme, setBackground, setSuperAnonymous, Background, Theme } from '@/store/slices/settings.slice'
import { User, updateProfile } from '@/store/slices/user.slice'
import { Copy, Paperclip } from 'lucide-react'

interface Props {
    onClose: () => void
}

export const SettingsPanel = ({ onClose }: Props) => {
    const dispatch = useAppDispatch()
    const user = useAppSelector(state => state.users.user) as User
    const settings = useAppSelector(state => state.settings)

    const [username, setUsername] = useState(user?.username || '')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const avatarPreview = useMemo(() => {
        if (avatarFile) return URL.createObjectURL(avatarFile)
        return user?.avatar
    }, [avatarFile, user?.avatar])

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null
        setAvatarFile(file)
    }

    const handleSaveProfile = async () => {
        try {
            await dispatch(updateProfile({ username, avatar: avatarFile || undefined })).unwrap()
        } catch (e) {
            const nextUser = { ...user, username }
            localStorage.setItem('user', JSON.stringify(nextUser))
        } finally {
            onClose()
        }
    }

    const applyTheme = (theme: Theme) => {
        dispatch(setTheme(theme))
    }
    const applyBackground = (bg: Background) => {
        dispatch(setBackground(bg))
    }
    const toggleSuperAnonymous = (value: boolean) => {
        dispatch(setSuperAnonymous(value))
    }

    const p2pCode = user?.code || ''

    return (
        <div className='p-4 space-y-6'>
            <div className='flex items-center justify-between'>
                <h3 className='text-sm font-semibold text-neutral-300'>Settings</h3>
                <button className='text-xs text-neutral-400 hover:text-white cursor-pointer' onClick={onClose}>
                    Close
                </button>
            </div>

            <section className='space-y-3'>
                <h4 className='text-xs text-neutral-400'>Profile</h4>
                <div className='flex items-center gap-3'>
                    <div className='h-12 w-12 rounded-full overflow-hidden bg-neutral-800'>
                        {avatarPreview ? (
                            <img src={avatarPreview} alt='avatar' className='h-full w-full object-cover' />
                        ) : (
                            <div className='h-full w-full flex items-center justify-center text-neutral-500'>?</div>
                        )}
                    </div>
                    <label className='text-xs px-2 py-1 rounded bg-neutral-800 text-neutral-300 cursor-pointer inline-flex items-center gap-2'>
                        <Paperclip size={14} />
                        Avatar
                        <input type='file' accept='image/*' className='hidden' onChange={handleAvatarChange} />
                    </label>
                </div>
                <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder='Username'
                    className='w-full px-3 py-2 rounded bg-neutral-800 text-neutral-200 text-sm'
                />
                <button
                    className='text-xs px-3 py-1 rounded bg-teal-600 text-black hover:bg-teal-500'
                    onClick={handleSaveProfile}
                >
                    Save profile
                </button>
            </section>

            <section className='space-y-3'>
                <h4 className='text-xs text-neutral-400'>Appearance</h4>
                <div className='flex items-center gap-2'>
                    <button
                        className={`text-xs px-3 py-1 rounded ${
                            settings.theme === 'dark' ? 'bg-teal-600 text-black' : 'bg-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => applyTheme('dark')}
                    >
                        Dark
                    </button>
                    <button
                        className={`text-xs px-3 py-1 rounded ${
                            settings.theme === 'light' ? 'bg-teal-600 text-black' : 'bg-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => applyTheme('light')}
                    >
                        Light
                    </button>
                </div>
                <div className='flex items-center gap-2'>
                    <button
                        className={`text-xs px-3 py-1 rounded ${
                            settings.background === 'paper'
                                ? 'bg-teal-600 text-black'
                                : 'bg-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => applyBackground('paper')}
                    >
                        Background: Paper
                    </button>
                    <button
                        className={`text-xs px-3 py-1 rounded ${
                            settings.background === 'womanDraft'
                                ? 'bg-teal-600 text-black'
                                : 'bg-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => applyBackground('womanDraft')}
                    >
                        Background: Draft
                    </button>
                    <button
                        className={`text-xs px-3 py-1 rounded ${
                            settings.background === 'woman'
                                ? 'bg-teal-600 text-black'
                                : 'bg-neutral-800 text-neutral-300'
                        }`}
                        onClick={() => applyBackground('woman')}
                    >
                        Background: Woman
                    </button>
                </div>
            </section>

            <section className='space-y-3'>
                <h4 className='text-xs text-neutral-400'>Privacy</h4>
                <label className='flex items-center gap-2 text-xs text-neutral-300'>
                    <input
                        type='checkbox'
                        checked={settings.superAnonymous}
                        onChange={e => toggleSuperAnonymous(e.target.checked)}
                    />
                    Super anonymous (hides previews)
                </label>
            </section>

            <section className='space-y-3'>
                <h4 className='text-xs text-neutral-400'>Code</h4>
                <div className='flex items-center gap-2 px-3 rounded-md bg-neutral-800 text-neutral-200 text-sm'>
                    <input
                        value={p2pCode}
                        readOnly
                        className='flex-1 py-2 rounded bg-neutral-800 text-neutral-200 text-sm select-all'
                    />

                    <button
                        className='text-xs cursor-pointer text-teal-500'
                        onClick={() => navigator.clipboard.writeText(p2pCode)}
                    >
                        <Copy size={16} />
                    </button>
                </div>
            </section>
        </div>
    )
}
