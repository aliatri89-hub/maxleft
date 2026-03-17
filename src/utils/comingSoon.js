/**
 * Compute "coming soon" status from air_date instead of a stored flag.
 * An item is "coming soon" if it has a future air_date.
 *
 * Uses date-only comparison (no time component) so items are considered
 * "arrived" on their air_date day, not the day after.
 */
export function isComingSoon(item) {
  if (!item?.air_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const airDate = new Date(item.air_date + "T00:00:00");
  return airDate > today;
}
