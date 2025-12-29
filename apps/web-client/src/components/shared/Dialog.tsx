import { useEffect } from 'react'
import { Portal } from './Portal'
import { motion } from 'framer-motion'

interface DialogProps {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode

    maxWidth?: string
    closeOnOverlayClick?: boolean
}

export const Dialog = ({ isOpen, onClose, children, maxWidth = '32rem', closeOnOverlayClick = true }: DialogProps) => {
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    return (
        <Portal isOpen={isOpen}>
            {isOpen && (
                <div
                    className='fixed inset-0 z-50 flex items-center justify-center p-4'
                    role='dialog'
                    aria-modal='true'
                >
                    <motion.div
                        className='absolute inset-0 bg-black/60 backdrop-blur-sm'
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeOnOverlayClick ? onClose : undefined}
                    />

                    <motion.div
                        className='relative w-full rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl'
                        style={{ maxWidth }}
                        initial={{ opacity: 0, scale: 0.96, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                    >
                        {children}
                    </motion.div>
                </div>
            )}
        </Portal>
    )
}
