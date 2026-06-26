<script setup>
import { onMounted } from 'vue'

const AudioUtilsModule = {
  // --- HARMONIC STATE ---
  currentKeyIndex: 0,
  keys: [
    { name: 'C Major',  rootMidi: 60, type: 'major' },
    { name: 'A Minor',  rootMidi: 57, type: 'minor' },
    { name: 'G Major',  rootMidi: 67, type: 'major' },
    { name: 'F Major',  rootMidi: 65, type: 'major' }
  ],
  
  currentChordKey: 'I',
  
  // Clean text representations to protect structural layout notes from compilation bugs
  progressionMatrix: {
    I:   { name: 'Tonic (I)',             rawIntervals: '0,4,7',    next: ['IV', 'ii', 'V'] },
    IV:  { name: 'Subdominant (IV)',      rawIntervals: '5,9,12',   next: ['I64', 'V'] },
    ii:  { name: 'Supertonic (ii)',       rawIntervals: '2,5,9',    next: ['I64', 'V'] },
    I64: { name: 'Cadential I64 (Tonic)', rawIntervals: '7,12,16',  next: ['V'] },
    V:   { name: 'Dominant (V)',          rawIntervals: '7,11,14',  next: ['I', 'vi_seq'] },
    vi_seq: { name: 'Submediant (vi)',    rawIntervals: '9,12,16',  next: ['ii_seq'] },
    ii_seq: { name: 'Supertonic (ii)',    rawIntervals: '2,5,9',    next: ['V_seq'] },
    V_seq:  { name: 'Dominant (V)',       rawIntervals: '7,11,14',  next: ['I_mod'] },
    I_mod:  { name: 'Tonic / Modulation', rawIntervals: '0,4,7',    next: ['I'] } 
  },

  lastMidiPerPad: { 1: 48, 2: 60, 3: 67, 4: 76 },
  
  activePadSet: new Set(),
  chordWindowTimeout: null,
  windowDurationMs: 45,
  chordInitiated: false,

  midiToFreq(midi) {
    return 880 * Math.pow(2, (midi - 69) / 12);
  },

  advanceProgression() {
    const currentConfig = this.progressionMatrix[this.currentChordKey];
    const options = currentConfig.next;
    let nextChordKey = options[Math.floor(Math.random() * options.length)];
    
    if (nextChordKey === 'I_mod') {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      this.currentChordKey = 'I';
      console.log(`MOD: Shifting focus to global Key center: ${this.keys[this.currentKeyIndex].name} `);
    } else {
      this.currentChordKey = nextChordKey;
    }

    const activeKey = this.keys[this.currentKeyIndex];
    const targetChord = this.progressionMatrix[this.currentChordKey];
    console.log(`FUN: ${activeKey.name} -> ${targetChord.name} `);
  },

  getVoiceLeadingMidi(padIndex) {
    const keyConfig = this.keys[this.currentKeyIndex];
    const chordConfig = this.progressionMatrix[this.currentChordKey];

    // Read default layout strings
    let rawIntervalString = chordConfig.rawIntervals;

    // ACCIDENTALS RULE: If current target is minor, overwrite strings instead of running array literals
    if (keyConfig.type === 'minor') {
      if (this.currentChordKey === 'I' || this.currentChordKey === 'I_mod' || this.currentChordKey === 'I64') {
        rawIntervalString = '0,3,7'; // Minor Tonic conversion
      }
      if (this.currentChordKey === 'IV') {
        rawIntervalString = '5,8,12'; // Minor iv Subdominant conversion
      }
      if (this.currentChordKey === 'V' || this.currentChordKey === 'V_seq') {
        rawIntervalString = '7,11,14'; // Enforce major V chord in minor mode
      }
    }

    // Safely transform the isolated text string configuration into clear functional integers
    const intervals = rawIntervalString.split(',').map(num => parseInt(num, 10));

    let structuralBaseRegister = 60;
    if (padIndex === 1) structuralBaseRegister = 48;
    if (padIndex === 2) structuralBaseRegister = 60;
    if (padIndex === 3) structuralBaseRegister = 67;
    if (padIndex === 4) structuralBaseRegister = 76;

    const validNotesInContext = [];
    for (let octaveOffset = -2; octaveOffset <= 2; octaveOffset++) {
      for (const interval of intervals) {
        const structuralMidiNote = keyConfig.rootMidi + interval + (octaveOffset * 12);
        validNotesInContext.push(structuralMidiNote);
      }
    }

    const historicalAnchor = this.lastMidiPerPad[padIndex] || structuralBaseRegister;

    let optimizedMidi = validNotesInContext.reduce((previousChoice, currentChoice) => {
      return Math.abs(currentChoice - historicalAnchor) < Math.abs(previousChoice - historicalAnchor) ? currentChoice : previousChoice;
    });

    if (padIndex === 1 && optimizedMidi > 55) optimizedMidi -= 12;
    if (padIndex === 4 && optimizedMidi < 69) optimizedMidi += 12;

    this.lastMidiPerPad[padIndex] = optimizedMidi;
    return optimizedMidi;
  },

  getInstrumentFrequency(instrumentNumber) {
    this.activePadSet.add(instrumentNumber);
    
    if (!this.chordInitiated) {
      this.chordInitiated = true;
      this.advanceProgression();
    }

    if (this.chordWindowTimeout) {
      clearTimeout(this.chordWindowTimeout);
    }

    this.chordWindowTimeout = setTimeout(() => {
      if (document.querySelectorAll('.pad-btn.pressed').length === 0) {
        AudioUtilsModule.activePadSet.clear();
        AudioUtilsModule.chordInitiated = false;
       // console.log("Harmony engine returned to rest state.");
      }
    }, this.windowDurationMs);

    const targetMidiPitch = this.getVoiceLeadingMidi(instrumentNumber);
    //console.log(`Pad ${instrumentNumber} note MIDI: ${targetMidiPitch} (${Math.round(this.midiToFreq(targetMidiPitch))} Hz)`);
    
    return this.midiToFreq(targetMidiPitch);
  }
}

onMounted(() => {
  window.AudioUtils = AudioUtilsModule;
  console.log("String-Encapsulated Classical Progression Engine Loaded Securely.");
})
</script>

<template>
  <span style="display: none;"></span>
</template>
