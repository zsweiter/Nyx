import { memo } from 'react'
import { LocationPayload } from '@/types'
import { MapPin } from 'lucide-react'

interface Props {
    payload: LocationPayload
    time: string
}

const _LocationMessage = ({ payload, time }: Props) => {
    const getGoogleMapsUrl = (latitude: number, longitude: number) => {
        return `https://www.google.com/maps?q=${latitude},${longitude}`
    }

    const mapUrl = getGoogleMapsUrl(payload.latitude, payload.longitude)

    return (
        <div className='p-1 max-w-xs'>
            <a href={mapUrl} target='_blank' rel='noopener noreferrer' className='block'>
                <div className='relative rounded-lg overflow-hidden'>
                    <div
                        className='w-70 h-45 flex items-center justify-center'
                        style={{ backgroundColor: 'var(--compose-input-background)' }}
                    >
                        <MapPin size={36} style={{ color: 'var(--text-muted)' }} />
                    </div>

                    <div
                        className='absolute bottom-0 left-0 right-0 p-3'
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', color: 'white' }}
                    >
                        <div className='rounded-full p-2' style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
                            <MapPin size={24} style={{ color: 'white' }} />
                        </div>
                    </div>
                </div>
            </a>

            <div className='mt-1 px-2'>
                {payload.name && (
                    <div className='font-medium text-sm' style={{ color: 'var(--panel-text-color)' }}>
                        {payload.name}
                    </div>
                )}
                {payload.address && (
                    <div className='text-xs' style={{ color: 'var(--text-secondary)' }}>
                        {payload.address}
                    </div>
                )}
                <div className='text-xs' style={{ color: 'var(--text-muted)' }}>
                    {payload.latitude.toFixed(6)}, {payload.longitude.toFixed(6)}
                </div>
                <div className='text-right text-[11px] mt-1' style={{ color: 'var(--text-secondary)' }}>
                    {time}
                </div>
            </div>
        </div>
    )
}

export const LocationMessage = memo(_LocationMessage)
