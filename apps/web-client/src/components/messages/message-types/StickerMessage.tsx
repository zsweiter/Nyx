import { memo } from 'react'
import { StickerPayload } from '@/types'

interface Props {
    payload: StickerPayload
}

const _StickerMessage = ({ payload }: Props) => {
    return (
        <div className='flex justify-center'>
            <img src={`/stickers/${payload.id}.webp`} alt='Sticker' className='w-32 h-32 object-contain' />
        </div>
    )
}

export const StickerMessage = memo(_StickerMessage)
