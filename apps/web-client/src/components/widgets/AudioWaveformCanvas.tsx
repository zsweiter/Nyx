import { useEffect, useRef, useMemo } from 'react'

interface Props {
    peaks: number[]
    progress: number // 0 a 100
    width?: number
    height?: number
    barWidth?: number
    gap?: number
    onSeek?: (percentage: number) => void
    colorPlayed?: string
    colorRemaining?: string
}

export const AudioWaveformCanvas = ({
    peaks,
    progress,
    width = 180,
    height = 40,
    barWidth = 2,
    gap = 6,
    onSeek,
    colorPlayed = '#2dd4bf',
    colorRemaining = '#525252',
}: Props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const waveformPath = useMemo(() => {
        const path = new Path2D()
        const gap = Math.round(width / peaks.length)

        peaks.forEach((peak, i) => {
            const x = i * gap
            const barHeight = Math.max(4, peak * (height - 6))
            const y = (height - barHeight) / 2

            if (typeof path.roundRect === 'function') {
                path.roundRect(x, y, barWidth, barHeight, [2])
            } else {
                path.rect(x, y, barWidth, barHeight)
            }
        })
        return path
    }, [peaks, width, height, barWidth, gap])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d', { alpha: true })
        if (!ctx) return

        const dpr = window.devicePixelRatio || 1
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`

        ctx.clearRect(0, 0, width, height)

        ctx.fillStyle = colorRemaining
        ctx.fill(waveformPath)

        ctx.globalCompositeOperation = 'source-atop'

        ctx.fillStyle = colorPlayed
        const playWidth = width * (progress / 100)
        ctx.fillRect(0, 0, playWidth, height)

        ctx.globalCompositeOperation = 'source-over'
    }, [progress, waveformPath, width, height, colorPlayed, colorRemaining])

    const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
        if (!canvasRef.current || !onSeek) return

        const rect = canvasRef.current.getBoundingClientRect()
        let clientX = 0

        if ('touches' in e) {
            clientX = e.touches[0].clientX
        } else {
            clientX = (e as React.MouseEvent).clientX
        }

        const x = clientX - rect.left
        const percentage = Math.max(0, Math.min(1, x / rect.width)) * 100
        onSeek(percentage)
    }

    return (
        <canvas
            ref={canvasRef}
            className='cursor-pointer touch-none select-none'
            onClick={handleInteraction}
            onTouchStart={handleInteraction}
        />
    )
}
