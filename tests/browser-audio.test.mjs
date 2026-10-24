import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toWav } from '../standby-app/src/lib/concierge.ts';

test('browser audio becomes mono PCM WAV with correct header and samples', async () => {
  let closed = false;
  globalThis.AudioContext = class {
    async decodeAudioData() { return { length: 3, duration: .0001, sampleRate: 48000, numberOfChannels: 2, getChannelData: () => new Float32Array([-1, 0, 1]) }; }
    async close() { closed = true; }
  };
  const wav = await toWav(new Blob(['fixture']));
  const data = new DataView(await wav.arrayBuffer());
  assert.equal(wav.type, 'audio/wav'); assert.equal(data.byteLength, 50);
  assert.equal(data.getUint16(22, true), 1); assert.equal(data.getUint32(24, true), 48000);
  assert.equal(data.getInt16(44, true), -32768); assert.equal(data.getInt16(48, true), 32767);
  assert.equal(closed, true);
});
test('overlong audio is rejected locally and the decoder closes', async () => {
  let closed = false;
  globalThis.AudioContext = class {
    async decodeAudioData() { return { length: 200, duration: 121 }; }
    async close() { closed = true; }
  };
  await assert.rejects(toWav(new Blob(['fixture'])), /120 seconds/);
  assert.equal(closed, true);
});
