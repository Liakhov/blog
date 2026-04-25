import { UAParser } from 'ua-parser-js';

export interface ParsedUA {
  browser: string | null;
  os: string | null;
  device: 'desktop' | 'mobile' | 'tablet';
}

export function parseUA(ua: string): ParsedUA {
  const parser = new UAParser(ua);
  const result = parser.getResult();

  const deviceType = result.device.type;
  const device =
    deviceType === 'mobile' ? 'mobile' : deviceType === 'tablet' ? 'tablet' : 'desktop';

  return {
    browser: result.browser.name ?? null,
    os: result.os.name ?? null,
    device
  };
}
