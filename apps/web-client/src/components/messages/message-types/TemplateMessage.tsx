import { TemplatePayload } from '@/types'
import { Copy, ExternalLink, Phone, Check } from 'lucide-react'
import { memo, useState } from 'react'
import { Message } from '@/store/slices/messages.slice'

type ReplyContext = {
    message_id: string
    name: string
    payload: string
}
interface Props {
    message: Message
    payload: TemplatePayload
    quickReply?: (context: ReplyContext) => void
}

const styles = {
    base: 'btn flex items-center gap-2 text-sm px-4 py-2.25 rounded-lg text-cyan-500 bg-[var(--incoming-background)] w-full justify-center font-semibold !no-underline',
}

interface ButtonProps {
    children: React.ReactNode
    href?: string
    onClick?: (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => void
    clickable?: boolean
    [otherProps: string]: any
}

export const ActionButton = ({ children, href, onClick, clickable = false, ...otherProps }: ButtonProps) => {
    if (href) {
        return (
            <a className={styles.base} href={href} onClick={clickable ? onClick : undefined} {...otherProps}>
                {children}
            </a>
        )
    }

    return (
        <button className={styles.base} onClick={onClick} {...otherProps}>
            {children}
        </button>
    )
}

const _TemplateMessage = ({ message, payload, quickReply: _quickReply }: Props) => {
    const { components } = payload
    const [copied, setCopied] = useState(false)

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
    }
    const createdAt = formatTime(new Date(message.created_at as string))
    // !TODO support html
    // const parts = {
    //     header: components?.header,
    //     body: components?.body,
    //     footer: components?.footer,
    // }

    // const bodyHtml = parts.body ? DOMPurify.sanitize(parseWhatsAppText(parts.body)) : "";

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        })
    }

    const quickReply = (name: string, buttonIndex: number) => {
        // buttonState.markButtonAsClicked(message.messageId as string, buttonIndex, name, "QUICK_REPLY");
        _quickReply?.({ message_id: message._id as string, payload: name, name })
        console.log('Quick reply:', { message_id: message._id as string, payload: name, name, buttonIndex })
    }

    const buttonHandler = (
        isClicked: boolean,
        messageId: string,
        buttonIndex: number,
        type: string,
        text: string,
        url?: string,
        event?: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>
    ) => {
        if (isClicked) return

        if (type === 'URL') {
            if (event) {
                event.preventDefault()
            }

            if (String(url).includes('COPY_CODE')) {
                const _url = new URL(String(url))
                handleCopy(String(_url.searchParams.get('code') || '').replace('otp:', ''))
            } else {
                window.open(url, '_blank')
            }
        }

        console.log('Button clicked:', { messageId, buttonIndex, text, type })
        // buttonState.markButtonAsClicked(messageId, buttonIndex, text, type as any);
    }

    return (
        <div className='rounded-md max-w-md'>
            <div
                className='rounded-lg p-2 px-2.5 relative template-message'
                style={{ backgroundColor: 'var(--incoming-background)', color: 'var(--panel-text-color)' }}
            >
                {components?.header && (
                    <div className='text-base mb-2' style={{ color: 'var(--panel-text-color)' }}>
                        {components.header}
                    </div>
                )}
                {components?.body && (
                    // <div
                    // 	className="text-base mb-2"
                    // 	dangerouslySetInnerHTML={{ __html: bodyHtml }}
                    // />
                    <div>{components.body}</div>
                )}
                {components?.footer && (
                    <div className='text-xs mt-2' style={{ color: 'var(--text-muted)' }}>
                        {components.footer}
                    </div>
                )}
                <p className='text-right text-[11px] mt-1 absolute bottom-1 right-2 text-(--bubble-meta) flex gap-1'>
                    <span className='self-end leading-[1.1]'>{createdAt}</span>
                </p>
            </div>

            {components?.buttons && (
                <div className='flex flex-col gap-1 mt-1 template-buttons'>
                    {components.buttons.map((btn, idx) => {
                        // const isClicked = buttonState.isButtonClicked(message.messageId as string, idx);
                        const isClicked = false
                        let buttonAction

                        switch (btn.type) {
                            case 'URL':
                                buttonAction = (
                                    <ActionButton
                                        href={isClicked ? undefined : btn.url}
                                        target={isClicked ? undefined : '_blank'}
                                        rel={isClicked ? undefined : 'noopener noreferrer'}
                                        onClick={event => {
                                            buttonHandler(
                                                isClicked,
                                                message._id as string,
                                                idx,
                                                btn.type,
                                                btn.text,
                                                btn.url,
                                                event
                                            )
                                        }}
                                        style={{
                                            opacity: isClicked ? 0.5 : 1,
                                            color: isClicked && 'gray',
                                            cursor: isClicked ? 'default' : 'pointer',
                                            pointerEvents: isClicked ? 'none' : 'auto',
                                        }}
                                    >
                                        {isClicked ? <Check size={16} /> : <ExternalLink size={16} />}
                                        {btn.text}
                                    </ActionButton>
                                )
                                break
                            case 'PHONE_NUMBER':
                                buttonAction = (
                                    <ActionButton
                                        href={isClicked ? undefined : `tel:${btn.phone_number}`}
                                        onClick={
                                            isClicked
                                                ? undefined
                                                : () => {
                                                      // buttonState.markButtonAsClicked(
                                                      // 	message.messageId as string,
                                                      // 	idx,
                                                      // 	btn.text,
                                                      // 	"PHONE_NUMBER"
                                                      // );
                                                  }
                                        }
                                        style={{
                                            opacity: isClicked ? 0.5 : 1,
                                            cursor: isClicked ? 'default' : 'pointer',
                                            color: isClicked && 'gray',
                                            pointerEvents: isClicked ? 'none' : 'auto',
                                        }}
                                    >
                                        {isClicked ? <Check size={16} /> : <Phone size={16} />}
                                        {btn.text}
                                    </ActionButton>
                                )
                                break
                            case 'OTP_CODE':
                                buttonAction = (
                                    <ActionButton
                                        onClick={
                                            isClicked
                                                ? undefined
                                                : () => {
                                                      // buttonState.markButtonAsClicked(
                                                      // 	message.messageId as string,
                                                      // 	idx,
                                                      // 	btn.text,
                                                      // 	"OTP_CODE"
                                                      // );
                                                      handleCopy(btn.otp_code || '')
                                                  }
                                        }
                                        style={{
                                            opacity: isClicked ? 0.5 : 1,
                                            cursor: isClicked ? 'default' : 'pointer',
                                            color: isClicked && 'gray',
                                            pointerEvents: isClicked ? 'none' : 'auto',
                                        }}
                                    >
                                        {isClicked ? <Check size={16} /> : <Copy size={16} />}
                                        {btn.text}
                                        {copied && <span className='text-xs ml-2'>Copied!</span>}
                                    </ActionButton>
                                )
                                break
                            default: // QUICK_REPLY
                                buttonAction = (
                                    <ActionButton
                                        onClick={isClicked ? undefined : () => quickReply(btn.text, idx)}
                                        style={{
                                            opacity: isClicked ? 0.5 : 1,
                                            cursor: isClicked ? 'default' : 'pointer',
                                            color: isClicked && 'gray',
                                            pointerEvents: isClicked ? 'none' : 'auto',
                                        }}
                                    >
                                        {isClicked && <Check size={16} />}
                                        {btn.text}
                                    </ActionButton>
                                )
                        }

                        return (
                            <div key={idx} className='block w-full'>
                                {buttonAction}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export const TemplateMessage = memo(_TemplateMessage)
