# Derived Schedule Placement From Release Windows

Schedule View placement and ordering will be derived from Release Windows and the current date rather than fixed by a manually assigned section. The stored Source Schedule Section preserves imported or maintainer intent and remains the fallback when the available dates cannot determine placement; it is not the effective Schedule Section displayed to readers.

The effective sections, in display order, are Now Showing, Upcoming, Awaiting Renewal or Cancellation, and Finished. A future release is Upcoming. A release that has started and whose known finale has not passed is Now Showing. Once its known finale has passed, a Season without a terminal Lifecycle Status moves to Awaiting Renewal or Cancellation, while a Season known to be cancelled, ended, completed, or final moves to Finished. A complete set of dated Episode rows can supply the finale when the Season has no explicit finale date.

Exact dates, Release Seasons, and year-only values can all participate in placement and ordering by using an approximate midpoint for imprecise periods while preserving the original precision and Date Confidence for display and filtering. Release Seasons use Northern Hemisphere meteorological windows. When the source omits a year because the page supplies chronological context, the source update date anchors that year inference.

Release Pattern distinguishes weekly, bulk, and unknown seasons. Bulk streaming releases stay Now Showing for a Current Grace Period, initially five weeks, before moving to Awaiting Renewal or Cancellation or Finished according to Lifecycle Status. For an imported bulk row that was recorded as current without a release date, the source update date is the conservative start of that grace period.
