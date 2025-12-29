export const useAudioPrivacyPipeline = (ctx: AudioContext, source: AudioNode) => {
    const destination = ctx.createMediaStreamDestination()

    // Formant distortion
    const formant = ctx.createBiquadFilter()
    formant.type = 'bandpass'
    formant.frequency.value = 900 + Math.random() * 400
    formant.Q.value = 1.1

    // Pitch drift
    const pitch = ctx.createBiquadFilter()
    pitch.type = 'lowshelf'
    pitch.frequency.value = 200
    pitch.gain.value = Math.random() * 4 - 2

    // Time jitter
    const delay = ctx.createDelay()
    delay.delayTime.value = Math.random() * 0.004

    // Micro noise
    const noise = ctx.createBufferSource()
    noise.buffer = ctx.createBuffer(1, 4096, ctx.sampleRate)
    noise.connect(destination)
    noise.start()

    source.connect(formant).connect(pitch).connect(delay).connect(noise).connect(destination)

    return destination
}
