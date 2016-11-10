/* Monophonic Synth
 * based on work by Chris Lowis (2013)
 */

$(function() {

  const doc = $(document);

  /*
   * Virtual Keyboard
   */
  var keyboard = new QwertyHancock({
    id: 'keyboard',
    startNote: 'A1',
    width: 800,
    height: 120,
    octaves: 2
  });

  keyboard.keyDown = (note, frequency) => {
    console.log(note, frequency);
    doc.trigger('frequency', [frequency] );
    doc.trigger('gateOn');
  };

  /*
   * Envelope Knobs
   */
  $("#attack").knob({
    'release': (v) => { doc.trigger('setAttack', v / 100); }
  });

  $("#sustain").knob({
    'release': (v) => { doc.trigger('setSustain', v / 100); }
  });

  $("#decay").knob({
    'release': (v) => { doc.trigger('setDecay', v / 100); }
  });

  $("#release").knob({
    'release': (v) => { doc.trigger('setRelease', v / 100); }
  });


  class VCO {
    /*
     * Voltage Controlled Oscillator
     */

    constructor(ctx, f, type) {
      this.ctx = ctx;
      this.osc = ctx.createOscillator();
      this.osc.type = type;
      this.osc.frequency.value = f;
      this.osc.start(0);

      this.input = this.osc;
      this.output = this.osc;

      doc.on('frequency', (_, f) => {
        this.setFrequency(f);
      });
    }

    setFrequency(f) {
      this.osc.frequency.setValueAtTime(f, this.ctx.currentTime);
    }

    connect(node) {
      /*
       * inherited from OscillatorNode
       */
      if (node.hasOwnProperty('input')) {
        this.output.connect(node.input);
      } else {
        this.output.connect(node);
      }
    }

  }

  class VCA {
    /*
     * Voltage Controlled Amplifier
     */

    constructor(ctx) {
      this.ctx = ctx;
      this.gain = ctx.createGain();
      this.gain.gain.value = 0;
      this.input = this.gain;
      this.output = this.gain;
      this.amplitude = this.gain.gain;
    }

    connect(node) {
      /**
       * inherited from GainNode
       */
      if (node.hasOwnProperty('input')) {
        this.output.connect(node.input);
      } else {
        this.output.connect(node);
      }
    }

  }

  class ASDR {

    constructor(ctx) {
      this.ctx = ctx;
      this.attackTime = 0.1;
      this.sustainTime = 0.1;
      this.decayTime = 0.1;
      this.decayValue = 0.6667;
      this.releaseTime = 0.1;

      doc.on('gateOn', (_) => {
        this.trigger();
      });
      doc.on('setAttack', (_, value) => {
        this.attackTime = value;
      });
      doc.on('setSustain', (_, value) => {
        this.sustainTime = value;
      });
      doc.on('setDecay', (_, value) => {
        this.decayTime = value;
      });
      doc.on('setRelease', (_, value) => {
        this.releaseTime = value;
      });
    }

    trigger() {
      let now = this.ctx.currentTime;
      this.param.cancelScheduledValues(now);
      this.param.setValueAtTime(0, now);
      this.param.linearRampToValueAtTime(1, now + this.attackTime);
      this.param.linearRampToValueAtTime(1, now + this.attackTime + this.sustainTime);
      this.param.linearRampToValueAtTime(this.decayValue, now + this.attackTime + this.sustainTime + this.decayTime);
      this.param.linearRampToValueAtTime(0, now + this.attackTime + this.sustainTime + this.decayTime + this.releaseTime);
    }

    connect(param) {
      this.param = param;
    }

  }

  const context = new AudioContext();

  var vco = new VCO(context, 440, 'sine');
  var vca = new VCA(context);
  var asdr = new ASDR(context);

  vco.connect(vca);
  asdr.connect(vca.amplitude);
  vca.connect(context.destination);

});

