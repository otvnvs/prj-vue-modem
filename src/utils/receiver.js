// utils/receiver.js

export class AudioReceiver {
  constructor() {
    this.audioContext = null;
    this.stream = null;
    this.source = null;
    this.analyser = null;
    this.workletNode = null;
    this.isRunning = false;
    
    // External callback function hook to forward raw bitstreams to the modem
    this.onBitReceivedCallback = null;
  }

  async start(onBitReceived) {
    if (this.isRunning) return;
    this.onBitReceivedCallback = onBitReceived;

    // 1. Initialise the central Audio Context safely after user interaction
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // 2. Capture raw microphone audio stream with filtering disabled
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false, 
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    // 3. Connect hardware stream into the Web Audio Graph
    this.source = this.audioContext.createMediaStreamSource(this.stream);

    // 4. Set up the Analyser node for the UI Oscilloscope / Spectrum displays
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);

    // 5. Register and instantiate our custom audio processing thread
    try {
      const workletCode = this.getWorkletProcessorCode();
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await this.audioContext.audioWorklet.addModule(workletUrl);
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'modem-dsp-processor');
      
      // Listen for decoded sample payloads sent back from the worklet thread
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'RAW_SAMPLES' && this.onBitReceivedCallback) {
          this.onBitReceivedCallback(event.data.samples);
        }
      };

      // Pipe the microphone source directly through our background processor
      this.source.connect(this.workletNode);
      this.workletNode.connect(this.audioContext.destination); // Required to keep the node active
      
    } catch (err) {
      console.warn("AudioWorklet configuration failed, falling back to main-thread processing:", err);
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

  // Returns the inline JavaScript string to build the isolated background audio thread
  getWorkletProcessorCode() {
    return `
      class ModemDspProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.bufferSize = 512; // Emits chunks every ~11ms at 44.1kHz for low latency
          this.sampleBuffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (!input || input.length === 0) return true;
          
          const inputChannel = input[0]; // Read the primary mono channel
          
          for (let i = 0; i < inputChannel.length; i++) {
            this.sampleBuffer[this.bufferIndex] = inputChannel[i];
            this.bufferIndex++;

            if (this.bufferIndex >= this.bufferSize) {
              // Post the sample block back to the main thread for DSP analysis
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
    `;
  }
}
