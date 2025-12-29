// export const attachPrivacyGraph = (ctx: AudioContext, source: AudioNode) => {
//     const destination = ctx.createMediaStreamDestination()

//     // 1. Efecto "Ring Modulator" (Voz Robótica)
//     // Multiplica la señal por un oscilador para destruir el timbre original
//     const oscillator = ctx.createOscillator()
//     oscillator.type = 'sine'
//     oscillator.frequency.value = 50 // Frecuencias bajas (30-60Hz) engrosan la voz, altas (400Hz+) la robotizan.

//     const ringModGain = ctx.createGain()
//     ringModGain.gain.value = 0 // El oscilador controla la ganancia

//     // Conexión Ring Mod: Oscilador -> Gain.gain
//     // La señal de audio pasa por el Gain, modulada por el Oscilador
//     oscillator.connect(ringModGain.gain)

//     // 2. Filtro LowPass (Ocultar características nasales/agudas)
//     const lowPass = ctx.createBiquadFilter()
//     lowPass.type = 'lowpass'
//     lowPass.frequency.value = 1000 // Cortamos frecuencias altas identificables
//     lowPass.Q.value = 0.5

//     // 3. Compresor (Para igualar el volumen después de filtrar)
//     const compressor = ctx.createDynamicsCompressor()
//     compressor.threshold.value = -20
//     compressor.knee.value = 40
//     compressor.ratio.value = 12

//     // CONEXIONES
//     source.connect(ringModGain) // Entrada -> Modulador
//     ringModGain.connect(lowPass) // Modulador -> Filtro
//     lowPass.connect(compressor) // Filtro -> Compresor
//     compressor.connect(destination) // Compresor -> Salida

//     oscillator.start()

//     return { destination, outputNode: compressor }
// }

export const attachPrivacyGraph = (ctx: BaseAudioContext, source: AudioNode): AudioNode => {
    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = 50

    const ringModGain = ctx.createGain()
    ringModGain.gain.value = 0

    oscillator.connect(ringModGain.gain)

    // 2. Filtro LowPass
    const lowPass = ctx.createBiquadFilter()
    lowPass.type = 'lowpass'
    lowPass.frequency.value = 1000
    lowPass.Q.value = 0.5

    // 3. Compresor
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -20
    compressor.knee.value = 40
    compressor.ratio.value = 12

    // CONEXIONES INTERNAS
    source.connect(ringModGain)
    ringModGain.connect(lowPass)
    lowPass.connect(compressor)

    // Iniciamos osciladores
    oscillator.start()

    return compressor
}
