import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'

interface Props {
    children: React.ReactNode
    isOpen?: boolean
}
export const Portal = ({ children, isOpen = false }: Props) => {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'auto'
        }
    }, [isOpen])

    return mounted && isOpen
        ? createPortal(
              <AnimatePresence>
                  <div>{children}</div>
              </AnimatePresence>,
              document.body
          )
        : null
}
