export interface PageviewEvent {
  visitorId: string;
  path: string;
  referrer: string | null;
  country: string | null;
  browser: string | null;
  os: string | null;
  device: 'desktop' | 'mobile' | 'tablet';
  createdAt: string;
}
