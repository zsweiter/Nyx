import { TextPayload } from '@/types'
import { UserContextType } from '@/context/AuthContext'
import { memo } from 'react'

interface Props {
    payload: TextPayload
    time: string
    isOwner: boolean
    user: UserContextType
}

const _TextMessage = ({ payload, user: _ }: Props) => {
    const handleMessageClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        event.preventDefault()
        if ((event.target as HTMLElement).closest('a')) {
            window.open((event.target as HTMLElement).closest('a')?.href, '_blank')
        }
    }

    return (
        <div onClick={handleMessageClick} className='bg-neutral-800 px-3 py-2 rounded-lg'>
            {/* {payload.context && (
				<div className="text-xs bg-gray-700 p-1.5 mb-1 rounded-md text-gray-300">
					<div className="font-medium text-blue-400">
						{payload.context.from === "bot" ? "En respuesta a ti" : "En respuesta a"} 
					</div>
					<div className="truncate">ID: {payload.context.message_id}</div>
				</div>
			)}
			 */}
            <div className='relative' style={{ overflowWrap: 'break-word' }}>
                {/* <span className="message-inner-content" style={{ color: 'var(--panel-text-color)' }} dangerouslySetInnerHTML={{ __html: html }}></span> */}

                {payload.body}
                {/* <span
                    className={`invisible text-sm inline-block select-none text-[12px] px-1${
                        isOwner ? ' pr-6' : ' pr-1'
                    }`}
                    style={{
                        width: `calc(${time.length}ch + 1.25rem)`,
                        lineHeight: '0',
                        overflow: 'hidden',
                        maxHeight: 14,
                        height: 14,
                        background: 'red',
                        verticalAlign: 'top',
                        float: 'right',
                    }}
                ></span> */}
            </div>
        </div>
    )
}

export const TextMessage = memo(_TextMessage)
