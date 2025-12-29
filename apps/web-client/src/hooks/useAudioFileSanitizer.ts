import { useCallback } from 'react'
import { attachPrivacyGraph } from './audioGraph'

const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const length = buffer.length * buffer.numberOfChannels * 2 + 44
    const arrayBuffer = new ArrayBuffer(length)
    const view = new DataView(arrayBuffer)
    const channels = []
    let offset = 0
    let pos = 0

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true)
        pos += 2
    }
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true)
        pos += 4
    }

    setUint32(0x46464952) // "RIFF"
    setUint32(length - 8) // file length - 8
    setUint32(0x45564157) // "WAVE"
    setUint32(0x20746d66) // "fmt " chunk
    setUint32(16) // length = 16
    setUint16(1) // PCM (uncompressed)
    setUint16(buffer.numberOfChannels)
    setUint32(buffer.sampleRate)
    setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels) // avg. bytes/sec
    setUint16(buffer.numberOfChannels * 2) // block-align
    setUint16(16) // 16-bit
    setUint32(0x61746164) // "data" - chunk
    setUint32(length - pos - 4) // chunk length

    for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i))

    while (pos < length) {
        for (let i = 0; i < buffer.numberOfChannels; i++) {
            let sample = Math.max(-1, Math.min(1, channels[i][offset]))
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff
            view.setInt16(pos, sample, true)
            pos += 2
        }
        offset++
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' })
}

export const useAudioFileSanitizer = () => {
    const sanitize = useCallback(async (file: File): Promise<File> => {
        // 1. Decodificar en un contexto temporal
        const tempCtx = new AudioContext()
        const arrayBuffer = await file.arrayBuffer()
        const audioBuffer = await tempCtx.decodeAudioData(arrayBuffer)
        tempCtx.close()

        // 2. Crear OfflineAudioContext
        // Este contexto NO tiene createMediaStreamDestination, pero tiene .destination (buffer)
        const offlineCtx = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        )

        const source = offlineCtx.createBufferSource()
        source.buffer = audioBuffer

        // 3. Usar el grafo agnóstico
        const lastNode = attachPrivacyGraph(offlineCtx, source)

        // 4. Conectar AL DESTINO DEL OFFLINE CONTEXT
        lastNode.connect(offlineCtx.destination)

        source.start()

        // 5. Renderizar
        const renderedBuffer = await offlineCtx.startRendering()

        const wavBlob = audioBufferToWav(renderedBuffer)

        return new File([wavBlob], file.name.replace(/\.\w+$/, '_anon.wav'), {
            type: 'audio/wav',
        })
    }, [])

    return { sanitize }
}
