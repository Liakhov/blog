import { anonymiseIp } from './ip';

export async function visitorHash(ip: string, userAgent: string, salt: string): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const anonIp = anonymiseIp(ip);
  const raw = `${anonIp}|${userAgent}|${today}|${salt}`;
  const encoded = new TextEncoder().encode(raw);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 16);
}
