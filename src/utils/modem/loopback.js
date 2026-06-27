/**
 * Drives virtual loopback sample processing loops
 */
export function runVirtualLoopback({
    messageText,
    senderInstance,
    receiverInstance,
    orchestrator,
    loopbackSpeed,
    sharedAnalyser,
    onChunkProcessed,
    onComplete
}) {
    const sampleRate = receiverInstance.audioContext?.sampleRate || 44100;
    const virtualAudioSamples = senderInstance.generateLoopbackSamples(
        messageText,
        orchestrator.activeProtocol,
        sampleRate
    );

    const chunkSize = 512;

    if (loopbackSpeed === 'instant') {
        for (let i = 0; i < virtualAudioSamples.length; i += chunkSize) {
            const chunk = virtualAudioSamples.slice(i, i + chunkSize);
            orchestrator.ingestIncomingAudioSamples(chunk, sampleRate);
        }
        onComplete();
        return null;
    } 

    if (loopbackSpeed === 'realtime') {
        let currentSampleOffset = 0;
        const tickRateMs = (chunkSize / sampleRate) * 1000;

        const intervalId = setInterval(() => {
            if (currentSampleOffset >= virtualAudioSamples.length) {
                clearInterval(intervalId);
                onComplete();
                return;
            }

            const chunk = virtualAudioSamples.slice(currentSampleOffset, currentSampleOffset + chunkSize);
            const ctx = receiverInstance.audioContext;
            
            if (ctx && sharedAnalyser) {
                try {
                    const audioBuf = ctx.createBuffer(1, chunk.length, sampleRate);
                    audioBuf.getChannelData(0).set(chunk);
                    const bufferSource = ctx.createBufferSource();
                    bufferSource.buffer = audioBuf;
                    bufferSource.connect(sharedAnalyser);
                    bufferSource.start(0);
                } catch (e) {
                    console.warn("Scope visual injection skipped:", e);
                }
            }

            orchestrator.ingestIncomingAudioSamples(chunk, sampleRate);
            currentSampleOffset += chunkSize;
            if (onChunkProcessed) onChunkProcessed();
        }, tickRateMs);

        return intervalId;
    }
}

