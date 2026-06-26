/**
 * KeyboardPianoController
 * Maps keyboard keys to simulate independent, polyphonic touch/mouse events 
 * on an interface container with coordinate-based element detection.
 */
export class Keyboard{
  constructor(options = {}) {
    this.wrapperSelector = options.wrapperSelector || '.interface-wrapper';
    this.keyMap = options.keyMap || {
      'q': { padStr: 'pad1', id: 'key-q' },
      'w': { padStr: 'pad2', id: 'key-w' },
      'e': { padStr: 'pad3', id: 'key-e' },
      'r': { padStr: 'pad4', id: 'key-r' }
    };
    
    this.activeKeys = new Set();
    this._keydownRef = null;
    this._keyupRef = null;
    this._blurRef = null;
  }

  /**
   * Starts listening to keyboard inputs and maps them to the UI container.
   */
  init() {
    this._keydownRef = this._handleKeyDown.bind(this);
    this._keyupRef = this._handleKeyUp.bind(this);
    this._blurRef = this._handleBlur.bind(this);

    window.addEventListener('keydown', this._keydownRef);
    window.addEventListener('keyup', this._keyupRef);
    window.addEventListener('blur', this._blurRef);
  }

  /**
   * Safely disposes and cleans up all active window listeners to prevent memory leaks.
   */
  destroy() {
    if (this._keydownRef) window.removeEventListener('keydown', this._keydownRef);
    if (this._keyupRef) window.removeEventListener('keyup', this._keyupRef);
    if (this._blurRef) window.removeEventListener('blur', this._blurRef);
    this.forceReleaseAll();
  }

  _dispatchCustomAudioEvent(eventType, config) {
    const pad = document.querySelector(`[data-pad="${config.padStr}"]`);
    const wrapper = document.querySelector(this.wrapperSelector);
    if (!pad || !wrapper) return;

    const rect = pad.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const customEvent = new Event(eventType, { bubbles: true, cancelable: true });
    
    // Inject custom multi-touch structure for your app's AudioEngine parser
    customEvent.changedTouches = [{
      identifier: config.id,
      clientX: x,
      clientY: y
    }];

    wrapper.dispatchEvent(customEvent);
  }

  _handleKeyDown(event) {
    if (event.repeat) return; // Completely blocks keyboard auto-repeat

    const key = event.key.toLowerCase();
    const config = this.keyMap[key];

    if (config && !this.activeKeys.has(key)) {
      this.activeKeys.add(key);
      this._dispatchCustomAudioEvent('mousedown', config);
    }
  }

  _handleKeyUp(event) {
    const key = event.key.toLowerCase();
    const config = this.keyMap[key];

    if (config && this.activeKeys.has(key)) {
      this.activeKeys.delete(key);
      this._dispatchCustomAudioEvent('mouseup', config);
    }
  }

  _handleBlur() {
    this.forceReleaseAll();
  }

  forceReleaseAll() {
    this.activeKeys.forEach((key) => {
      const config = this.keyMap[key];
      if (config) {
        this._dispatchCustomAudioEvent('mouseup', config);
      }
    });
    this.activeKeys.clear();
  }
}

