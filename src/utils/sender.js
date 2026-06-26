// utils/sender.js

export class AudioSender {
  constructor() {
    this.audioContext = null;
    this.gainNode = null;
    this.oscillator = null;
    this.isRunning = false;
  }

  init(sharedContext) {
    // Shared execution graph logic loops prevent memory leaks across contexts
    this.audioContext = sharedContext || new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.connect(this.audioContext.destination);
  }

  // Encodes incoming textual strings directly into raw, time-quantized continuous sound vectors
  
  
 // Locate inside utils/sender.js -> transmitString Method

transmitString(text, protocolInstance) {
  if (!this.audioContext) this.init();
  
  if (this.audioContext.state === 'suspended') {
    this.audioContext.resume();
  }

  const encoder = new TextEncoder();
  const bitStream = [];
  const dataBytes = encoder.encode(text);

  for (let byte of dataBytes) {
    // 1. INJECT START BIT: Always a logical 0 to pull the channel low
    bitStream.push(0);

    // 2. INJECT 8 DATA BITS: Read from Least Significant Bit (LSB) first for standard UART format
    for (let bitPosition = 0; bitPosition < 8; bitPosition++) {
      bitStream.push((byte >> bitPosition) & 1);
    }

    // 3. INJECT STOP BIT: Always a logical 1 to park the line high until the next symbol
    bitStream.push(1);
  }

  // Pass our new padded frame bitstream into the continuous audio scheduling timeline
  this.playToneSequence(bitStream, protocolInstance);
}

  
  
  

  playToneSequence(bitStream, protocolInstance) {
    const startTime = this.audioContext.currentTime + 0.05; // 50ms scheduling pad
    const baudRate = protocolInstance.config.baud;
    const bitDuration = 1 / baudRate;

    // Tear down any existing oscillator infrastructure gracefully to prevent collision audio leaks
    this.stopTone();

    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.connect(this.gainNode);

    // Fade up system volume smoothly to avoid initial phase clicks
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.15, startTime); // Keep audio levels comfortable (15%)

    let runningTimeline = startTime;

    for (let bitIndex = 0; bitIndex < bitStream.length; bitIndex++) {
      const activeBit = bitStream[bitIndex];
      // Delegate specific target pitches (e.g. AFSK frequencies) directly to the isolated schema mapper
      const targetedFrequency = protocolInstance.getFrequencyForBit(activeBit);
      
      // Schedule the frequency transition exactly at the boundary of the symbol duration
      this.oscillator.frequency.setValueAtTime(targetedFrequency, runningTimeline);
      runningTimeline += bitDuration;
    }

    // Gracefully fade volume level back down to zero once transmission ends
    this.gainNode.gain.setValueAtTime(0.15, runningTimeline);
    this.gainNode.gain.linearRampToValueAtTime(0, runningTimeline + 0.01);
    
    this.oscillator.start(startTime);
    this.oscillator.stop(runningTimeline + 0.02);
    this.isRunning = true;

    this.oscillator.onended = () => {
      this.isRunning = false;
    };
  }

  stopTone() {
    if (this.oscillator) {
      try {
        this.oscillator.stop();
        this.oscillator.disconnect();
      } catch (e) {
        // Handle cases where the oscillator was already halted
      }
      this.oscillator = null;
    }
    this.isRunning = false;
  }
}
