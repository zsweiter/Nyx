import { CircleArrowDown } from 'lucide-react'
import { DocumentPayload } from '@/types'
import { memo } from 'react'

export interface DocumentMessageProps {
    payload: DocumentPayload
    time: string
    size?: string
}

const documentUrl = (id: string) => {
    return `/files/${id}`
}

const _DocumentMessage = ({ payload, time, size = '100KB' }: DocumentMessageProps) => {
    const { id, filename } = payload
    const type = filename.split('.').pop()

    return (
        <div style={{ color: 'var(--panel-text-color)' }}>
            <div
                className='flex items-start p-2 gap-2 justify-between rounded-lg'
                style={{ backgroundColor: 'var(--compose-input-background)' }}
            >
                <div className='shrink-0'>
                    <div
                        className='w-10 h-11 rounded-md flex flex-col items-center justify-center'
                        style={{ backgroundColor: 'var(--text-muted)' }}
                    >
                        <span className='text-xs font-medium' style={{ color: 'var(--panel-text-color)' }}>
                            PDF
                        </span>
                    </div>
                </div>

                <div className='flex-1 overflow-hidden'>
                    <div className='text-sm font-semibold truncate'>{filename}</div>
                    <div className='text-xs' style={{ color: 'var(--text-secondary)' }}>
                        {size} · {type}
                    </div>
                </div>

                <a
                    href={documentUrl(id)}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='p-1 rounded-full transition'
                    style={{ backgroundColor: 'var(--menu-hover)' }}
                    download={filename}
                >
                    <CircleArrowDown style={{ color: 'var(--whatsapp-primary)' }} />
                </a>
            </div>

            {payload.caption && (
                <div className='text-sm px-2 pt-1.5' style={{ color: 'var(--panel-text-color)' }}>
                    <span>{payload.caption}</span>
                    <span className='invisible text-sm'>{time}</span>
                </div>
            )}
        </div>
    )
}

export const DocumentMessage = memo(_DocumentMessage)
