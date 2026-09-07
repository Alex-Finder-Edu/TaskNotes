# Tutorial: Fix Calendar View

Implements `prompts/26_fix_calendar_view.txt` — three fixes to the Log
Calendar built in
[`23_log_view_implementation.md`](./23_log_view_implementation.md):

1. Only the interval grid (`.cal-body`) scrolls; the Topbar and the Log
   page's own header (tabs, Log Event button, date nav, hint) stay fixed on
   screen instead of scrolling away with the rest of the document.
2. The "Log Event" button now sits under the List/Calendar tabs rather than
   beside them.
3. Clicking a calendar interval to log an event now defaults End to exactly
   30 minutes after Start (matching the highlighted half-hour slot), instead
   of always defaulting to an hour later.

## Making only `.cal-body` scroll

The bug: `.app-content` (in `index.css`) only set `min-height: 100svh` on
its flex column, so when the calendar grid's natural content height
(16 hours × 60px = 960px) was taller than the viewport, the whole
`app-content` box simply grew past the viewport instead of stopping there -
the browser then scrolled the *entire document*, carrying the Topbar and the
page's own header off-screen with it.

The fix has two parts:

- `index.css`: `.app-content` changed from `min-height: 100svh` to
  `height: 100svh` - a page with short content still fills the viewport
  exactly as before, but this also gives the flex column an actual size to
  distribute between its children instead of an open-ended minimum.
- `LogCalendar.css`: a new `.log-calendar-page` modifier (added alongside
  the shared `.log-page` class only on this page, not on the List page)
  sets `min-height: 0; overflow: hidden;`. Flex items default to
  `min-height: auto`, which means "never shrink below your own content size"
  - without overriding that, the calendar page would still balloon past its
  allotted share of `100svh` exactly as before. With `min-height: 0`, it
  shrinks to whatever height `.app-content`'s flex layout actually gives it
  (viewport height minus the Topbar), and `.cal-body` (`flex: 1; min-height:
  0; overflow-y: auto`) absorbs all of that page's remaining space and
  scrolls internally once its own content (the hour grid) doesn't fit.

The List page (`Log.jsx`) deliberately keeps plain `.log-page` with no
`min-height: 0` - its content is meant to grow and scroll the whole
document the way Tasks' list already does, so it was left alone.

## Log Event button placement

`.log-page-header` (in `Log.css`, shared by both List and Calendar) was
`flex-direction: row; justify-content: space-between`, putting the tabs and
the button side by side. Changed to `flex-direction: column;
align-items: flex-start;` so the button renders on its own line under the
tabs, with `.log-page-header .btn { width: fit-content; }` so it doesn't
stretch to the header's full width.

## End time matching the clicked interval

`LogEventModal`'s `initialFormState` previously always defaulted End to
"now + 1 hour," even when opened from a calendar slot click (via
`initialStart`) - so clicking the highlighted 9:00-9:30 slot produced an
End of 10:00 instead of 9:30. The default duration now depends on how the
modal was opened: 30 minutes when `initialStart` is set (matching the
half-hour interval actually highlighted on the calendar), 1 hour otherwise
(the plain "Log Event" button, with no slot context to match). Both branches
now compute `endDate`/`endTime` from the same `start + duration` `Date`
object rather than pairing a fixed date with a separately-computed time -
which also fixes a latent midnight-rollover bug where a `now + 1h` default
crossing midnight could have produced an End time earlier than Start.

## Follow-up: the 6 AM-10 PM window itself was the bug

After the scrolling fix above, a second look showed the actual complaint:
the grid was still hard-limited to a `DAY_START = 6` / `DAY_END = 22` window
- content outside 6 AM-10 PM wasn't just off-screen, it didn't exist in the
DOM at all, so there was no way to scroll to or click a slot before 6 AM or
after 10 PM. `LogCalendar.jsx` now generates the full 24 hours
(`DAY_START = 0`, `DAY_END = 24`), so `HOURS`/`SLOTS` (and therefore every
click target) cover midnight to midnight.

Showing the full day meant a freshly-opened calendar would otherwise open
scrolled to the very top (midnight) every time, which is a worse default
than the old fixed 6 AM start. A `calBodyRef` + `useEffect` keyed on
`dateStr` scrolls `.cal-body` to the current time (if viewing today) or
`DEFAULT_SCROLL_HOUR` (6 AM, for any other day) each time the selected day
changes - so the visible-on-load behavior is unchanged, but scrolling
further up or down now actually reaches real, interactive slots instead of
hitting the edge of a truncated grid.

## Commands reference

No new commands were introduced in this step.
