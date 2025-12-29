import { memo, useState } from 'react'
import { ContactsPayload } from '@/types'
import { User, ChevronDown, ChevronUp, Phone } from 'lucide-react'

interface Props {
    payload: ContactsPayload
    time: string
}

const _ContactsMessage = ({ payload, time }: Props) => {
    const [expanded, setExpanded] = useState(false)
    const contacts = payload.contacts || []

    const toggleExpand = () => {
        setExpanded(!expanded)
    }

    return (
        <div className='p-2 max-w-xs'>
            <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center'>
                    <User size={20} style={{ color: 'var(--text-secondary)' }} className='mr-2' />
                    <span className='font-medium' style={{ color: 'var(--panel-text-color)' }}>
                        {contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}
                    </span>
                </div>
                <button
                    onClick={toggleExpand}
                    className='p-1 rounded-full transition-colors'
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--menu-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>

            {expanded && (
                <div className='mt-2 space-y-3'>
                    {contacts.map((contact, index) => (
                        <div
                            key={index}
                            className='rounded-lg p-2'
                            style={{ backgroundColor: 'var(--compose-input-background)' }}
                        >
                            <div className='flex items-center mb-1'>
                                <div
                                    className='w-8 h-8 rounded-full flex items-center justify-center mr-2'
                                    style={{ backgroundColor: 'var(--text-muted)' }}
                                >
                                    <User size={16} style={{ color: 'var(--panel-text-color)' }} />
                                </div>
                                <span className='font-medium' style={{ color: 'var(--panel-text-color)' }}>
                                    {contact.name.formatted_name}
                                </span>
                            </div>

                            {contact.phones &&
                                contact.phones.map((phone, phoneIndex) => (
                                    <div key={phoneIndex} className='flex items-center justify-between pl-10 pr-2 py-1'>
                                        <div>
                                            <div className='text-sm' style={{ color: 'var(--panel-text-color)' }}>
                                                {phone.phone}
                                            </div>
                                            {phone.type && (
                                                <div className='text-xs' style={{ color: 'var(--text-secondary)' }}>
                                                    {phone.type}
                                                </div>
                                            )}
                                        </div>
                                        <a
                                            href={`tel:${phone.phone}`}
                                            className='p-2 rounded-full transition-colors'
                                            style={{ backgroundColor: 'var(--whatsapp-primary)' }}
                                        >
                                            <Phone size={14} style={{ color: 'white' }} />
                                        </a>
                                    </div>
                                ))}
                        </div>
                    ))}
                </div>
            )}

            <div className='text-right text-xs mt-1' style={{ color: 'var(--text-secondary)' }}>
                {time}
            </div>
        </div>
    )
}

export const ContactsMessage = memo(_ContactsMessage)
