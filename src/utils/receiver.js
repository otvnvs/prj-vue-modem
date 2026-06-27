//// utils/receiver.js
//
//export class AudioReceiver {
//  constructor() {
//    this.audioContext = null;
//    this.stream = null;
//    this.source = null;
//    this.analyser = null;
//    this.workletNode = null;
//    this.isRunning = false;
//    
//    // External callback function hook to forward raw bitstreams to the modem
//    this.onBitReceivedCallback = null;
//  }
//
//  async start(onBitReceived) {
//    if (this.isRunning) return;
//    this.onBitReceivedCallback = onBitReceived;
//
//    // 1. Initialise the central Audio Context safely after user interaction
//    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
//
//    // 2. Capture raw microphone audio stream with filtering disabled
//    this.stream = await navigator.mediaDevices.getUserMedia({
//      audio: {
//        echoCancellation: false, 
//        noiseSuppression: false,
//        autoGainControl: false
//      }
//    });
//
//    // 3. Connect hardware stream into the Web Audio Graph
//    this.source = this.audioContext.createMediaStreamSource(this.stream);
//
//    // 4. Set up the Analyser node for the UI Oscilloscope / Spectrum displays
//    this.analyser = this.audioContext.createAnalyser();
//    this.analyser.fftSize = 2048;
//    this.source.connect(this.analyser);
//
//    // 5. Register and instantiate our custom audio processing thread
//    try {
//      const workletCode = this.getWorkletProcessorCode();
//      const blob = new Blob([workletCode], { type: 'application/javascript' });
//      const workletUrl = URL.createObjectURL(blob);
//      
//      await this.audioContext.audioWorklet.addModule(workletUrl);
//      
//      this.workletNode = new AudioWorkletNode(this.audioContext, 'modem-dsp-processor');
//      
//      // Listen for decoded sample payloads sent back from the worklet thread
//      this.workletNode.port.onmessage = (event) => {
//        if (event.data.type === 'RAW_SAMPLES' && this.onBitReceivedCallback) {
//          this.onBitReceivedCallback(event.data.samples);
//        }
//      };
//
//      // Pipe the microphone source directly through our background processor
//      this.source.connect(this.workletNode);
//      this.workletNode.connect(this.audioContext.destination); // Required to keep the node active
//      
//    } catch (err) {
//      console.warn("AudioWorklet configuration failed, falling back to main-thread processing:", err);
//    }
//
//    this.isRunning = true;
//    return this.analyser;
//  }
//
//  stop() {
//    if (!this.isRunning) return;
//
//    if (this.stream) {
//      this.stream.getTracks().forEach(track => track.stop());
//    }
//    if (this.workletNode) {
//      this.workletNode.disconnect();
//      this.workletNode = null;
//    }
//    if (this.audioContext) {
//      this.audioContext.close();
//    }
//
//    this.isRunning = false;
//    this.analyser = null;
//    this.source = null;
//  }
//
//  // Returns the inline JavaScript string to build the isolated background audio thread
//  getWorkletProcessorCode() {
//    return `
//      class ModemDspProcessor extends AudioWorkletProcessor {
//        constructor() {
//          super();
//          this.bufferSize = 512; // Emits chunks every ~11ms at 44.1kHz for low latency
//          this.sampleBuffer = new Float32Array(this.bufferSize);
//          this.bufferIndex = 0;
//        }
//
//        process(inputs, outputs, parameters) {
//          const input = inputs[0];
//          if (!input || input.length === 0) return true;
//          
//          const inputChannel = input[0]; // Read the primary mono channel
//          
//          for (let i = 0; i < inputChannel.length; i++) {
//            this.sampleBuffer[this.bufferIndex] = inputChannel[i];
//            this.bufferIndex++;
//
//            if (this.bufferIndex >= this.bufferSize) {
//              // Post the sample block back to the main thread for DSP analysis
//              this.port.postMessage({
//                type: 'RAW_SAMPLES',
//                samples: this.sampleBuffer
//              });
//              this.bufferIndex = 0;
//            }
//          }
//          return true;
//        }
//      }
//      registerProcessor('modem-dsp-processor', ModemDspProcessor);
//    `;
//  }
//}
export class AudioReceiver {
    constructor() {
        this.audioContext = null;
        this.stream = null;
        this.source = null;
        this.analyser = null;
        this.workletNode = null;
        this.isRunning = false;
        this.onBitReceivedCallback = null;
    }

    async start(onBitReceived) {
        if (this.isRunning) return;
        this.onBitReceivedCallback = onBitReceived;
        
        // Instantiate modern AudioContext if missing
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Explicitly strip away voice processing layers to secure raw acoustic waveforms
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        this.source = this.audioContext.createMediaStreamSource(this.stream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.source.connect(this.analyser);

        try {
            // Bundle combined DSP worker code blocks
            const workletCode = this.getWorkletProcessorCode();
            const blob = new Blob([workletCode], { type: 'application/javascript' });
            const workletUrl = URL.createObjectURL(blob);
            
            // Register modules onto the browser hardware engine loop thread
            await this.audioContext.audioWorklet.addModule(workletUrl);
            
            // Bind the incoming receiver worker node
            this.workletNode = new AudioWorkletNode(this.audioContext, 'modem-dsp-processor');
            this.workletNode.port.onmessage = (event) => {
                if (event.data.type === 'RAW_SAMPLES' && this.onBitReceivedCallback) {
                    this.onBitReceivedCallback(event.data.samples);
                }
            };
            
            this.source.connect(this.workletNode);
            this.workletNode.connect(this.audioContext.destination);
            
        } catch (err) {
            console.warn("AudioWorklet configuration failed, falling back to main-thread loops:", err);
        }

        this.isRunning = true;
        return this.analyser;
    }

    stop() {
        if (!this.isRunning) return;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.workletNode) {
            this.workletNode.disconnect();
            this.workletNode = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.isRunning = false;
        this.analyser = null;
        this.source = null;
    }

    // Router method that stores the pure thread-isolated source text code
// Inside src/utils/receiver.js

    getWorkletProcessorCode() {
        return `
            // ========================================================
            // 🎙️ NODE A: RECEIVER HARDWARE INGESTION ENGINE
            // ========================================================
            class ModemDspProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.bufferSize = 512;
                    this.sampleBuffer = new Float32Array(this.bufferSize);
                    this.bufferIndex = 0;
                }

                process(inputs, outputs, parameters) {
                    const input = inputs[0];
                    if (!input || input.length === 0) return true;
                    const inputChannel = input[0];

                    for (let i = 0; i < inputChannel.length; i++) {
                        this.sampleBuffer[this.bufferIndex] = inputChannel[i];
                        this.bufferIndex++;

                        if (this.bufferIndex >= this.bufferSize) {
                            this.port.postMessage({ 
                                type: 'RAW_SAMPLES', 
                                samples: this.sampleBuffer 
                            });
                            this.bufferIndex = 0;
                        }
                    }
                    return true;
                }
            }
            registerProcessor('modem-dsp-processor', ModemDspProcessor);


            // ========================================================
            // 📡 NODE B: TRANSMITTER HARDWARE CONSUMER ENGINE
            // ========================================================
            class ModemTxProcessor extends AudioWorkletProcessor {
                constructor() {
                    super();
                    this.bitQueue = [];
                    this.samplesPerBit = 1411.2; 
                    this.sampleCount = 0;
                    this.currentFrequency = 0;
                    this.phase = 0;
                    this.baud = 300;
                    this.sampleRate = 44100;
                    this.bitsPerCharacter = 10; 
                    this.totalBitsProcessed = 0;

                    this.port.onmessage = (event) => {
                        if (event.data.type === 'INITIALIZE_STREAM') {
                            this.sampleRate = event.data.sampleRate;
                            this.baud = event.data.baud;
                            this.samplesPerBit = this.sampleRate / this.baud;
                            
                            // Unpack individual string characters into binary framed bits
                            const rawBytes = event.data.payloadBytes;
                            const expandedBits = [];
                            
                            for (let byte of rawBytes) {
                                expandedBits.push(0); // UART Start Bit
                                for (let i = 0; i < 8; i++) {
                                    expandedBits.push((byte >> i) & 1);
                                }
                                expandedBits.push(1); // UART Stop Bit
                            }

                            this.bitQueue = expandedBits;
                            this.sampleCount = 0;
                            this.totalBitsProcessed = 0;
                            
                        } else if (event.data.type === 'ABORT_TRANSMISSION') {
                            this.bitQueue = [];
                            this.sampleCount = 0;
                        }
                    };
                }

                process(inputs, outputs, parameters) {
                    const output = outputs[0];
                    if (!output || output.length === 0) return true;
                    const channel = output[0];

                    const currentConfig = parameters;

                    for (let i = 0; i < channel.length; i++) {
                        // Character consumption index calculator triggers on bit boundaries
                        if (this.sampleCount >= this.samplesPerBit || this.sampleCount === 0) {
                            this.sampleCount = 0;

                            if (this.bitQueue.length > 0) {
                                const activeBit = this.bitQueue.shift();
                                
                                // Calculate character index for the parent highlight tracker array
                                const currentCharIndex = Math.floor(this.totalBitsProcessed / this.bitsPerCharacter);
                                this.port.postMessage({ 
                                    type: 'BIT_CONSUMED', 
                                    index: currentCharIndex 
                                });

                                // Basic FSK translation layer - can map configuration settings
                                if (activeBit === 1) {
                                    this.currentFrequency = 2200; // Mock frequency constants
                                } else {
                                    this.currentFrequency = 1200;
                                }

                                this.totalBitsProcessed++;
                            } else {
                                this.currentFrequency = 0; // Quiet baseline line state when queue is empty
                            }
                        }

                        // Write mathematical signal data directly onto the soundcard output stream buffer
                        if (this.currentFrequency > 0) {
                            channel[i] = 0.15 * Math.sin(this.phase);
                            this.phase += (2 * Math.PI * this.currentFrequency) / this.sampleRate;
                            if (this.phase > 2 * Math.PI) this.phase -= 2 * Math.PI;
                        } else {
                            channel[i] = 0;
                        }

                        this.sampleCount++;
                    }
                    return true;
                }
            }
            registerProcessor('modem-tx-processor', ModemTxProcessor);
        `;
    }

}

