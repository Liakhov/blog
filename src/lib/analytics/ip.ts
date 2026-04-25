export function anonymiseIp(ip: string): string {
  if (ip.includes(':')) {
    const parts = expandIpv6(ip);
    return parts.slice(0, 4).concat(['0', '0', '0', '0']).join(':');
  }
  const parts = ip.split('.');
  parts[3] = '0';
  return parts.join('.');
}

function expandIpv6(ip: string): string[] {
  const halves = ip.split('::');
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length > 1 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  const mid = halves.length > 1 ? Array(missing).fill('0') : [];
  return [...head, ...mid, ...tail];
}
