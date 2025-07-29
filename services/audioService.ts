
// This service assumes Tone.js is loaded from a CDN.
// We declare 'Tone' to satisfy TypeScript, as it will be globally available at runtime.
declare const Tone: any;

let isInitialized = false;

// Using lazy initialization for synths to ensure Tone.js is ready
let moveSynth: any;
let restSynth: any;
let countdownSynth: any;
let finishedSynth: any;

const initializeSynths = () => {
  if (typeof Tone !== 'undefined' && !isInitialized) {
    moveSynth = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
    restSynth = new Tone.Synth({ oscillator: { type: 'triangle8' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 } }).toDestination();
    countdownSynth = new Tone.MembraneSynth().toDestination();
    finishedSynth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: 'fatsawtooth' }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 0.5 } }).toDestination();
    isInitialized = true;
  }
};

const startAudioContext = async (): Promise<void> => {
  if (typeof Tone !== 'undefined' && Tone.context.state !== 'running') {
    await Tone.start();
    console.log('Audio context started');
  }
  initializeSynths();
};

const playMoveSound = (): void => {
  if (!isInitialized) return;
  moveSynth.triggerAttackRelease('C4', '8n');
};

const playRestSound = (): void => {
  if (!isInitialized) return;
  restSynth.triggerAttackRelease('G3', '8n');
};

const playCountdownBeep = (): void => {
  if (!isInitialized) return;
  countdownSynth.triggerAttackRelease('C4', '16n');
};

const playFinishedSound = (): void => {
  if (!isInitialized) return;
  const now = Tone.now();
  finishedSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '8n', now);
  finishedSynth.triggerAttackRelease(['G4', 'B4', 'D5'], '8n', now + 0.2);
  finishedSynth.triggerAttackRelease(['C5', 'E5', 'G5'], '4n', now + 0.4);
};

export const audioService = {
  startAudioContext,
  playMoveSound,
  playRestSound,
  playCountdownBeep,
  playFinishedSound,
};
