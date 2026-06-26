export class AudioSender {
    constructor() {
        this.audioContext = null;
        this.gainNode = null;
        this.oscillator = null;
        this.isRunning = false;
    }

    init(sharedContext) {
        this.audioContext = sharedContext || new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.connect(this.audioContext.destination);
    }

    // --- NEW: GENERATE INTERNAL SAMPLES FOR TESTING ---
    generateLoopbackSamples(text, protocolInstance, sampleRate = 44100) {
        const encoder = new TextEncoder();
        const bitStream = [];
        const dataBytes = encoder.encode(text);

        // Standard UART Frame Assembly
        for (let byte of dataBytes) {
            bitStream.push(0); // Start Bit
            for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
                bitStream.push((byte >> bitPosition) & 1);
            }
            bitStream.push(1); // Stop Bit
        }

        const baudRate = protocolInstance.config.baud;
        const samplesPerBit = Math.floor(sampleRate / baudRate);
        const totalSamples = bitStream.length * samplesPerBit;
        const outBuffer = new Float32Array(totalSamples);

        let phase = 0;
        let sampleIdx = 0;

        for (let bit of bitStream) {
            const frequency = protocolInstance.getFrequencyForBit(bit);
            
            // Generate standard continuous-phase sine wave samples for this bit interval
            for (let i = 0; i < samplesPerBit; i++) {
                outBuffer[sampleIdx] = 0.15 * Math.sin(phase);
                phase += (2 * Math.PI * frequency) / sampleRate;
                
                // Keep phase bounded to prevent floating point accuracy loss over long strings
                if (phase > 2 * Math.PI) {
                    phase -= 2 * Math.PI;
                }
                sampleIdx++;
            }
        }
        return outBuffer;
    }

    // Physical Hardware Transmission (Unchanged)
    transmitString(text, protocolInstance) {
        if (!this.audioContext) this.init();
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const encoder = new TextEncoder();
        const bitStream = [];
        const dataBytes = encoder.encode(text);

        for (let byte of dataBytes) {
            bitStream.push(0);
            for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
                bitStream.push((byte >> bitPosition) & 1);
            }
            bitStream.push(1);
        }
        this.playToneSequence(bitStream, protocolInstance);
    }

    playToneSequence(bitStream, protocolInstance) {
        const startTime = this.audioContext.currentTime + 0.05;
        const baudRate = protocolInstance.config.baud;
        const bitDuration = 1 / baudRate;

        this.stopTone();
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.connect(this.gainNode);
        
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.15, startTime);

        let runningTimeline = startTime;
        for (let bitIndex = 0; bitIndex < bitStream.length; bitIndex++) {
            const activeBit = bitStream[bitIndex];
            const targetedFrequency = protocolInstance.getFrequencyForBit(activeBit);
            this.oscillator.frequency.setValueAtTime(targetedFrequency, runningTimeline);
            runningTimeline += bitDuration;
        }

        this.gainNode.gain.setValueAtTime(0.15, runningTimeline);
        this.gainNode.gain.linearRampToValueAtTime(0, runningTimeline + 0.01);

        this.oscillator.start(startTime);
        this.oscillator.stop(runningTimeline + 0.02);
        this.isRunning = true;
        this.oscillator.onended = () => { this.isRunning = false; };
    }

    stopTone() {
        if (this.oscillator) {
            try { this.oscillator.stop(); this.oscillator.disconnect(); } catch (e) {}
            this.oscillator = null;
        }
        this.isRunning = false;
    }
}

