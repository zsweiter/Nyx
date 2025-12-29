import { memo, useEffect, useState } from 'react'
import { ImagePayload } from '@/types'
import { motion } from 'framer-motion'
import { Portal } from '@/components/shared/Portal'
import { UserContextType } from '@/context/AuthContext'
import { useMediaBucket } from '@/hooks/useMediaBucket'
import { Message } from '@/store/slices/messages.slice'
import { Loader2 } from 'lucide-react'

interface Props {
    payload: ImagePayload
    message: Message
    time: string
    user: UserContextType
}

const _ImageMessage = ({ payload, message, time }: Props) => {
    const { download, isDownloading, fromCache } = useMediaBucket()

    const [url, setUrl] = useState<string | null>(fromCache(message.conversation_id, payload.id))
    const [showPreview, setShowPreview] = useState(false)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (url) return

        const fetchImage = async () => {
            setLoading(true)
            try {
                const objectUrl = await download(message.conversation_id, payload.id, message.conversation_id)
                setUrl(objectUrl)
            } catch (e) {
                console.error('Failed to load image', e)
            } finally {
                setLoading(false)
            }
        }

        fetchImage()
    }, [payload.id, message])

    return (
        <>
            <div
                className='w-50 cursor-pointer relative min-h-37.5 bg-neutral-800 rounded-md flex items-center justify-center'
                onClick={() => url && setShowPreview(true)}
            >
                {loading || isDownloading === payload.id ? (
                    <div className='flex flex-col items-center gap-2 text-neutral-400'>
                        <Loader2 className='animate-spin' />
                        <span className='text-xs'>Descifrando...</span>
                    </div>
                ) : url ? (
                    <img
                        src={url}
                        alt={payload.caption || 'Image'}
                        className='w-full rounded-md h-full object-cover'
                        style={{ width: '13rem', height: 'auto' }}
                    />
                ) : (
                    <div className='text-xs text-red-400'>Error loading image</div>
                )}

                {payload.caption && (
                    <div className='absolute bottom-0 w-full bg-black/50 text-white text-sm px-2 py-1 rounded-b-md backdrop-blur-sm'>
                        <span>{payload.caption}</span>
                        <span className='invisible text-sm ml-2'>{time}</span>
                    </div>
                )}
            </div>

            <Portal isOpen={showPreview && !!url}>
                <motion.div
                    className='fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4'
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowPreview(false)}
                >
                    <motion.img
                        src={url!}
                        alt='Preview'
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className='max-w-full max-h-full rounded-lg shadow-lg'
                        onClick={e => e.stopPropagation()}
                    />
                </motion.div>
            </Portal>
        </>
    )
}

export const ImageMessage = memo(_ImageMessage)
