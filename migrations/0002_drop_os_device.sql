-- Drop unused os and device columns from pageview_events.
-- Neither field is read by the dashboard or any rollup; UA parsing now
-- returns only browser. Safe to drop.

ALTER TABLE pageview_events DROP COLUMN os;
ALTER TABLE pageview_events DROP COLUMN device;
