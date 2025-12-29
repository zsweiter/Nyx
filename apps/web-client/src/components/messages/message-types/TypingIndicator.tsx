import { motion } from 'framer-motion'

interface TypingIndicatorProps {}

const TypingIndicator: React.FC<TypingIndicatorProps> = () => {
    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1],
            }}
            className='flex justify-start self-start p-1'
        >
            <div
                className='px-3 py-2 rounded-xl rounded-bl-none shadow-md bg-neutral-800'
                style={{
                    maxWidth: '60px',
                    boxShadow: '0 2px 4px rgb(0 0 0 / 15%)',
                }}
            >
                <div className='flex space-x-1 items-center h-3'>
                    <motion.div
                        className='w-2 h-2 rounded-full bg-neutral-500'
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0,
                        }}
                    />
                    <motion.div
                        className='w-2 h-2 rounded-full bg-neutral-500'
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0.1,
                        }}
                    />
                    <motion.div
                        className='w-2 h-2 rounded-full bg-neutral-500'
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            delay: 0.2,
                        }}
                    />
                </div>
            </div>
        </motion.div>
    )
}

export default TypingIndicator
