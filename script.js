class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.5;
        this.oscillators = {};
    }

    setVolume(value) {
        this.masterGain.gain.setValueAtTime(value, this.ctx.currentTime);
    }

    playTone(note, frequency) {
        if (this.oscillators[note]) this.stopTone(note);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle'; // Smooth sound
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        // Envelope
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.02); // Attack
        gain.gain.exponentialRampToValueAtTime(0.5, this.ctx.currentTime + 0.5); // Decay

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        this.oscillators[note] = { osc, gain };
    }

    stopTone(note) {
        if (this.oscillators[note]) {
            const { osc, gain } = this.oscillators[note];
            
            // Release
            gain.gain.cancelScheduledValues(this.ctx.currentTime);
            gain.gain.setValueAtTime(gain.gain.value, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
            
            osc.stop(this.ctx.currentTime + 0.1);
            delete this.oscillators[note];
        }
    }
    
    resume() {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const KEY_MAP = {
    'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E', 'f': 'F', 
    't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A', 'u': 'A#', 'j': 'B', 'k': 'C2'
};

class PianoUI {
    constructor() {
        this.engine = new AudioEngine();
        this.piano = document.getElementById('piano');
        this.octave = 4;
        this.baseOctave = 4;
        
        this.initControls();
        this.renderPiano();
        this.initInput();
    }

    getFrequency(note, octave) {
        const noteIndex = NOTES.indexOf(note);
        // A4 = 440Hz. A is index 9.
        // Formula: f = 440 * 2^((n-49)/12) where n is key number
        // Simpler relative to A4:
        // Distance from A4 in semitones
        let semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9);
        return 440 * Math.pow(2, semitonesFromA4 / 12);
    }

    renderPiano() {
        this.piano.innerHTML = '';
        // Render range: C to B (one octave) + High C
        // Let's do 1.5 octaves for better playability: C to G next octave
        
        const startOctave = this.octave;
        const numKeys = 13; // C to C (inclusive)

        for (let i = 0; i < numKeys; i++) {
            const noteIndex = i % 12;
            const currentOctave = startOctave + Math.floor(i / 12);
            const note = NOTES[noteIndex];
            const isBlack = note.includes('#');
            
            const key = document.createElement('div');
            key.className = `key ${isBlack ? 'black' : 'white'}`;
            key.dataset.note = note;
            key.dataset.octave = currentOctave;
            
            // For layout, black keys are placed visually but in DOM they are sequential
            // We handle positioning in CSS using margins for black keys
            
            this.piano.appendChild(key);
        }
    }

    playKey(keyElement) {
        if (!keyElement) return;
        this.engine.resume();
        keyElement.classList.add('active');
        const note = keyElement.dataset.note;
        const octave = parseInt(keyElement.dataset.octave);
        const freq = this.getFrequency(note, octave);
        this.engine.playTone(`${note}${octave}`, freq);
    }

    stopKey(keyElement) {
        if (!keyElement) return;
        keyElement.classList.remove('active');
        const note = keyElement.dataset.note;
        const octave = parseInt(keyElement.dataset.octave);
        this.engine.stopTone(`${note}${octave}`);
    }

    initControls() {
        document.getElementById('octave-up').onclick = () => {
            if (this.octave < 7) {
                this.octave++;
                this.updateOctaveDisplay();
                this.renderPiano();
            }
        };
        document.getElementById('octave-down').onclick = () => {
            if (this.octave > 1) {
                this.octave--;
                this.updateOctaveDisplay();
                this.renderPiano();
            }
        };
        document.getElementById('volume-slider').oninput = (e) => {
            this.engine.setVolume(e.target.value);
        };
    }

    updateOctaveDisplay() {
        document.getElementById('current-octave').textContent = `Octave: ${this.octave}`;
    }

    initInput() {
        // Mouse
        this.piano.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('key')) {
                this.playKey(e.target);
                // Allow dragging to play other keys
                this.isDragging = true;
            }
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            document.querySelectorAll('.key.active').forEach(k => this.stopKey(k));
        });

        this.piano.addEventListener('mouseover', (e) => {
            if (this.isDragging && e.target.classList.contains('key')) {
                this.playKey(e.target);
            }
        });
        
        this.piano.addEventListener('mouseout', (e) => {
             if (this.isDragging && e.target.classList.contains('key')) {
                this.stopKey(e.target);
            }
        });

        // Touch
        this.piano.addEventListener('touchstart', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                if (target && target.classList.contains('key')) {
                    this.playKey(target);
                    target.dataset.touchId = touch.identifier;
                }
            }
        }, { passive: false });

        this.piano.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                // Find key with this touch ID
                const activeKeys = document.querySelectorAll('.key.active');
                activeKeys.forEach(key => {
                    if (key.dataset.touchId == touch.identifier) {
                        this.stopKey(key);
                        delete key.dataset.touchId;
                    }
                });
            }
        });

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            const noteBase = KEY_MAP[e.key.toLowerCase()];
            if (noteBase) {
                // Map keyboard keys to current octave
                // Simple mapping: C to C
                // We need to find the specific key element
                // This is a bit tricky since we regenerate keys.
                // Let's map by index relative to C
                
                // Find the key element based on note name and octave
                // For simplicity, let's just find the first matching key in the DOM
                // Or better, calculate the target note
                
                let targetNote = noteBase;
                let targetOctave = this.octave;
                if (noteBase === 'C2') {
                    targetNote = 'C';
                    targetOctave = this.octave + 1;
                }
                
                const selector = `.key[data-note="${targetNote}"][data-octave="${targetOctave}"]`;
                const key = document.querySelector(selector);
                if (key) this.playKey(key);
            }
        });

        window.addEventListener('keyup', (e) => {
            const noteBase = KEY_MAP[e.key.toLowerCase()];
             if (noteBase) {
                let targetNote = noteBase;
                let targetOctave = this.octave;
                if (noteBase === 'C2') {
                    targetNote = 'C';
                    targetOctave = this.octave + 1;
                }
                const selector = `.key[data-note="${targetNote}"][data-octave="${targetOctave}"]`;
                const key = document.querySelector(selector);
                if (key) this.stopKey(key);
             }
        });
    }
}

// Start
window.addEventListener('DOMContentLoaded', () => {
    new PianoUI();
});
