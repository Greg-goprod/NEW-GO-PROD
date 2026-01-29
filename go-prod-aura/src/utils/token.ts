function getCrypto(): Crypto | null {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as Crypto;
  }
  return null;
}

export function generateInviteToken(length = 48): string {
  const cryptoRef = getCrypto();
  if (cryptoRef?.getRandomValues) {
    const bytes = new Uint8Array(length);
    cryptoRef.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback pseudo random (dev only)
  let token = '';
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < length; i += 1) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoRef = getCrypto();

  if (cryptoRef?.subtle?.digest) {
    const hashBuffer = await cryptoRef.subtle.digest('SHA-256', encoder.encode(token));
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  // Fallback pour environnements Node (dev tools)
  const nodeCrypto = await import('crypto');
  return nodeCrypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

