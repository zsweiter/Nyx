import { memo, useEffect, useState } from 'react'
import { VideoPayload } from '@/types'
import { VideoPlayer } from '@/components/widgets/VideoPlayer'
import { UserContextType } from '@/context/AuthContext'
import { Message } from '@/store/slices/messages.slice'
import { useMediaBucket } from '@/hooks/useMediaBucket'
import { Loader } from 'lucide-react'

interface Props {
    message: Message
    payload: VideoPayload
    auth: UserContextType
}

const _VideoMessage = ({ message, payload }: Props) => {
    const { download, fromCache, isDownloading } = useMediaBucket()
    const content = message.payload as any
    const [url, setUrl] = useState<string>(fromCache(message.conversation_id, payload.id))

    useEffect(() => {
        if (url) return

        download(message.conversation_id, payload.id, message.conversation_id).then(fileUrl => {
            setUrl(fileUrl)
        })
    }, [])

    return (
        <div>
            {isDownloading === payload.id && (
                <div className='flex items-center justify-center'>
                    <Loader className='w-6 h-6 text-panel-text-color' />
                </div>
            )}
            <VideoPlayer src={url} />
            {content.caption && (
                <div className='pt-1 pl-2' style={{ color: 'var(--panel-text-color)' }}>
                    {content.caption}
                </div>
            )}
        </div>
    )
}

export const VideoMessage = memo(_VideoMessage)
