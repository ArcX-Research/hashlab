export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function differentBits(expected: string, actual: string): boolean[] {
  const bits: boolean[] = [];
  for (let i = 0; i < 64; i++) {
    const xor = parseInt(expected[i], 16) ^ parseInt(actual[i], 16);
    for (let bit = 3; bit >= 0; bit--) bits.push(Boolean(xor & (1 << bit)));
  }
  return bits;
}

export function describeInput(id: string, bytes: number): string {
  if (id === 'kat-empty') return 'Empty input';
  if (id === 'kat-abc') return 'The text “abc”';
  if (id === 'kat-million-a') return 'One million “a” bytes';
  if (id === 'kat-multiblock') return 'A known 56-byte message';
  if (id.startsWith('boundary-') && id.endsWith('-zero'))
    return bytes === 1 ? 'One zero byte' : `${bytes.toLocaleString()} zero bytes`;
  if (id.startsWith('boundary-') && id.endsWith('-ff'))
    return `${bytes.toLocaleString()} bytes of FF`;
  if (id.startsWith('boundary-') && id.endsWith('-ramp')) return 'An increasing byte pattern';
  if (id.startsWith('random-')) return 'Repeatable random bytes';
  return `${bytes.toLocaleString()} input ${bytes === 1 ? 'byte' : 'bytes'}`;
}
