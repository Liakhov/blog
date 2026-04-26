import { sequence } from 'astro:middleware';
import { guard } from '@/lib/analytics/guard';
import { track } from '@/lib/analytics/track';

export const onRequest = sequence(guard, track);
