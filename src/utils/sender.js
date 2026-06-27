//export class AudioSender {
//    constructor() {
//        this.audioContext = null;
//        this.gainNode = null;
//        this.oscillator = null;
//        this.isRunning = false;
//    }
//
//    init(sharedContext) {
//        this.audioContext = sharedContext || new (window.AudioContext || window.webkitAudioContext)();
//        this.gainNode = this.audioContext.createGain();
//        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
//        this.gainNode.connect(this.audioContext.destination);
//    }
//
//    // --- NEW: GENERATE INTERNAL SAMPLES FOR TESTING ---
//    generateLoopbackSamples(text, protocolInstance, sampleRate = 44100) {
//        const encoder = new TextEncoder();
//        const bitStream = [];
//        const dataBytes = encoder.encode(text);
//
//        // Standard UART Frame Assembly
//        for (let byte of dataBytes) {
//            bitStream.push(0); // Start Bit
//            for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
//                bitStream.push((byte >> bitPosition) & 1);
//            }
//            bitStream.push(1); // Stop Bit
//        }
//
//        const baudRate = protocolInstance.config.baud;
//        const samplesPerBit = Math.floor(sampleRate / baudRate);
//        const totalSamples = bitStream.length * samplesPerBit;
//        const outBuffer = new Float32Array(totalSamples);
//
//        let phase = 0;
//        let sampleIdx = 0;
//
//        for (let bit of bitStream) {
//            const frequency = protocolInstance.getFrequencyForBit(bit);
//            
//            // Generate standard continuous-phase sine wave samples for this bit interval
//            for (let i = 0; i < samplesPerBit; i++) {
//                outBuffer[sampleIdx] = 0.15 * Math.sin(phase);
//                phase += (2 * Math.PI * frequency) / sampleRate;
//                
//                // Keep phase bounded to prevent floating point accuracy loss over long strings
//                if (phase > 2 * Math.PI) {
//                    phase -= 2 * Math.PI;
//                }
//                sampleIdx++;
//            }
//        }
//        return outBuffer;
//    }
//
//    // Physical Hardware Transmission (Unchanged)
//    transmitString(text, protocolInstance) {
//        if (!this.audioContext) this.init();
//        if (this.audioContext.state === 'suspended') {
//            this.audioContext.resume();
//        }
//
//        const encoder = new TextEncoder();
//        const bitStream = [];
//        const dataBytes = encoder.encode(text);
//
//        for (let byte of dataBytes) {
//            bitStream.push(0);
//            for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
//                bitStream.push((byte >> bitPosition) & 1);
//            }
//            bitStream.push(1);
//        }
//        this.playToneSequence(bitStream, protocolInstance);
//    }
//
//    playToneSequence(bitStream, protocolInstance) {
//        const startTime = this.audioContext.currentTime + 0.05;
//        const baudRate = protocolInstance.config.baud;
//        const bitDuration = 1 / baudRate;
//
//        this.stopTone();
//        this.oscillator = this.audioContext.createOscillator();
//        this.oscillator.type = 'sine';
//        this.oscillator.connect(this.gainNode);
//        
//        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
//        this.gainNode.gain.linearRampToValueAtTime(0.15, startTime);
//
//        let runningTimeline = startTime;
//        for (let bitIndex = 0; bitIndex < bitStream.length; bitIndex++) {
//            const activeBit = bitStream[bitIndex];
//            const targetedFrequency = protocolInstance.getFrequencyForBit(activeBit);
//            this.oscillator.frequency.setValueAtTime(targetedFrequency, runningTimeline);
//            runningTimeline += bitDuration;
//        }
//
//        this.gainNode.gain.setValueAtTime(0.15, runningTimeline);
//        this.gainNode.gain.linearRampToValueAtTime(0, runningTimeline + 0.01);
//
//        this.oscillator.start(startTime);
//        this.oscillator.stop(runningTimeline + 0.02);
//        this.isRunning = true;
//        this.oscillator.onended = () => { this.isRunning = false; };
//    }
//
//    stopTone() {
//        if (this.oscillator) {
//            try { this.oscillator.stop(); this.oscillator.disconnect(); } catch (e) {}
//            this.oscillator = null;
//        }
//        this.isRunning = false;
//    }
//}

export class AudioSender {
    constructor() {
        this.audioContext = null;
        this.gainNode = null;
        this.oscillator = null;
        this.isRunning = false;
        this.streamIntervalId = null; // 🌟 Tracks the live stream scheduler clock
    }

    init(sharedContext) {
        this.audioContext = sharedContext || new (window.AudioContext || window.webkitAudioContext)();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.connect(this.audioContext.destination);
    }

    // Loopback Math Generator (Unchanged)
    generateLoopbackSamples(text, protocolInstance, sampleRate = 44100) {
        const encoder = new TextEncoder();
        const bitStream = [];
        const dataBytes = encoder.encode(text);

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
            for (let i = 0; i < samplesPerBit; i++) {
                outBuffer[sampleIdx] = 0.15 * Math.sin(phase);
                phase += (2 * Math.PI * frequency) / sampleRate;
                if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
                sampleIdx++;
            }
        }
        return outBuffer;
    }

    // 🌟 REFACTORED: Dynamic, Real-Time Streaming Transmission Engine
    transmitString(text, orchestratorInstance) {
        if (!this.audioContext) this.init();
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.stopTone(); // Reset any previous active playback blocks

        const encoder = new TextEncoder();
        const bitStream = [];
        const dataBytes = encoder.encode(text);

        // Standard UART Frame Assembly
        for (let byte of dataBytes) {
            bitStream.push(0); // Start bit
            for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
                bitStream.push((byte >> bitPosition) & 1);
            }
            bitStream.push(1); // Stop bit
        }

        // Initialize Web Audio oscillator node hardware primitives
        this.oscillator = this.audioContext.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.connect(this.gainNode);
        
        const startTime = this.audioContext.currentTime + 0.02;
        this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.15, startTime);
        this.oscillator.start(startTime);
        this.isRunning = true;

        let currentBitIndex = 0;
        
        // Dynamic Ticker Loop: Pulls whatever protocol is currently active in the UI
        const runStreamingTick = () => {
            if (currentBitIndex >= bitStream.length) {
                this.stopTone();
                return;
            }

            const activeBit = bitStream[currentBitIndex];
            
            // 🌟 CRITICAL FIX: Always query the LIVE orchestrator instance.
            // If you change the protocol architecture midway on the UI dashboard, 
            // orchestratorInstance.activeProtocol points to the NEW modem model instantly!
            const currentActiveProtocol = orchestratorInstance.activeProtocol;
            const targetFrequency = currentActiveProtocol.getFrequencyForBit(activeBit);
            
            // Immediately swing the oscillator node frequency to match the new protocol logic
            this.oscillator.frequency.setValueAtTime(targetFrequency, this.audioContext.currentTime);
            
            // Re-schedule the next bit duration tick using the live configuration baud rate
            const liveBaudRate = currentActiveProtocol.config.baud || 300;
            const bitDurationMs = (1 / liveBaudRate) * 1000;
            currentBitIndex++;

            this.streamIntervalId = setTimeout(runStreamingTick, bitDurationMs);
        };

        // Fire the initial scheduling tracker frame
        runStreamingTick();
    }

    stopTone() {
        if (this.streamIntervalId) {
            clearTimeout(this.streamIntervalId);
            this.streamIntervalId = null;
        }
        if (this.oscillator) {
            try {
                this.gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
                this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.01);
                this.oscillator.stop(this.audioContext.currentTime + 0.02);
                this.oscillator.disconnect();
            } catch (e) {}
            this.oscillator = null;
        }
        this.isRunning = false;
    }
}

