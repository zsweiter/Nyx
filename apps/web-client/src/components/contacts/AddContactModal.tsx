import { useState } from 'react'
import { BsPersonPlus } from 'react-icons/bs'
import { useAppDispatch } from '../../store/hooks'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { upsertConversationByUserCode } from '../../store/slices/conversation.slice'

export const AddContactModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [code, setCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()

    if (!isOpen) return null

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const conversation = await dispatch(upsertConversationByUserCode(code)).unwrap()
            onClose()
            // Navigate to chat with this user
            navigate(`/chat/${conversation._id}`)
        } catch (err) {
            setError('Usuario no encontrado o código inválido')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/20 backdrop-blur-sm'>
            <div className='bg-neutral-800 rounded-xl p-6 w-96 shadow-xl relative border border-neutral-700'>
                <button onClick={onClose} className='absolute top-4 right-4 text-neutral-400 hover:text-white'>
                    <X size={24} />
                </button>

                <h3 className='text-xl font-bold text-white mb-4 flex items-center gap-2'>
                    <BsPersonPlus /> Add new contact
                </h3>

                <form onSubmit={handleSearch}>
                    <div className='mb-4'>
                        <label className='block text-neutral-400 text-sm mb-2'>Connect with code</label>
                        <input
                            type='text'
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            className='w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 px-4 text-white focus:outline-none focus:border-neutral-600'
                            placeholder='Ej: 1234567890'
                            required
                        />
                        {error && <p className='text-red-500 text-sm mt-2'>{error}</p>}
                    </div>

                    <button
                        type='submit'
                        disabled={loading}
                        className='w-full bg-neutral-700 text-white py-2 rounded-lg hover:bg-neutral-600 transition-colors disabled:opacity-50'
                    >
                        {loading ? 'Buscando...' : 'Buscar y Chatear'}
                    </button>
                </form>
            </div>
        </div>
    )
}
