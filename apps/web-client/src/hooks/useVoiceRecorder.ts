import { useRef, useState, useCallback, useEffect } from 'react'
import { attachPrivacyGraph } from './audioGraph'

export const useVoiceRecorder = ({ onComplete }: { onComplete: (file: File, duration: number) => void }) => {
    const mediaStreamRef = useRef<MediaStream | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const ctxRef = useRef<AudioContext | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const startTimeRef = useRef<number>(0)
    const [recording, setRecording] = useState(false)

    useEffect(() => {
        return () => cleanup()
    }, [])

    const cleanup = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop())
        }
        if (ctxRef.current && ctxRef.current.state !== 'closed') {
            ctxRef.current.close()
        }
    }

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            mediaStreamRef.current = stream

            // Usamos AudioContext estándar (Tiempo Real)
            const ctx = new AudioContext()
            ctxRef.current = ctx

            const source = ctx.createMediaStreamSource(stream)

            // 1. Obtener el último nodo del grafo
            const lastNode = attachPrivacyGraph(ctx, source)

            // 2. Crear ESPECÍFICAMENTE el destino de Stream (Solo disponible en AudioContext)
            const streamDestination = ctx.createMediaStreamDestination()

            // 3. Conectar grafo -> Stream Destination
            lastNode.connect(streamDestination)

            // Configurar MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'

            const recorder = new MediaRecorder(streamDestination.stream, { mimeType })

            startTimeRef.current = Date.now()
            recorderRef.current = recorder
            chunksRef.current = []

            recorder.ondataavailable = e => {
                if (e.data.size > 0) chunksRef.current.push(e.data)
            }

            recorder.onstop = () => {
                const duration = (Date.now() - startTimeRef.current) / 1000
                const blob = new Blob(chunksRef.current, { type: mimeType })
                const ext = mimeType.split('/')[1].replace(';codecs=opus', '')

                onComplete(new File([blob], `voice_anon.${ext}`, { type: mimeType }), duration)
                cleanup()
            }

            recorder.start()
            setRecording(true)
        } catch (error) {
            console.error('Error accessing microphone:', error)
            cleanup()
        }
    }, [onComplete])

    const stopRecording = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop()
            setRecording(false)
        }
    }, [])

    return { startRecording, stopRecording, recording }
}
