import { UAParser } from 'ua-parser-js';

export interface ParsedUA {
  browser: string | null;
}

export function parseUA(ua: string): ParsedUA {
  const { browser } = new UAParser(ua).getResult();
  return { browser: browser.name ?? null };
}
