# Spending forecast

The Teen Overview includes a forecast of available spending budget through the current allowance renewal. It shows a solid recorded-balance line, a dashed projected line when enough history exists, an estimated run-out date if depletion is before renewal, and a keyboard-accessible timeline slider for inspecting balances. The chart labels US dollars and period dates, and includes a text description for assistive technology. It uses native SVG and adds no charting dependency or API calls.

## Calculation

Daily spending pace is confirmed spending assigned to the current allowance period divided by elapsed 24-hour days since that period began. The denominator includes days without purchases. At least two completed purchases and 24 hours of history are required; daily allowances use six hours. Current available budget is allowance plus previously released spending capacity minus confirmed spending and all processing reservations, including reservations carried from an older period.

Projected budget equals current availability minus daily pace multiplied by future elapsed days. The estimate ends at renewal and never goes below zero. Depletion exactly at renewal is treated as on track; a date is warned about only when depletion is earlier. The daily guide divides availability by time left, capped at currently available money and rounded down to whole cents. It is guidance, not permission to bypass category limits or parent controls.

Pending payments reduce availability but do not increase spending pace. Requests awaiting approval, ready checkouts, blocked and declined purchases, and paid purchases from previous periods do not count toward the rate. Soft Decline purchases count once at their total price; their category allocations are not additional spending. Private vault balances are excluded. Only money already released into the spending budget increases forecast capacity.

## History and limitations

The solid line reconstructs balances from the current spending capacity and dated purchases. A payment appears at its attempted time, or request time for older records. The app does not have a timestamped ledger of every budget edit or vault release, so historical balances are not a bank-account ledger: changing the current budget or released capacity shifts the reconstructed history. This limitation appears under **How this estimate works**, alongside the formula and snapshot time.

The forecast is a transparent constant-pace calculation, not an AI prediction or a promise about future spending. New purchases, changed habits, pending-payment outcomes, parental decisions, and allowance changes can alter it. A future allowance is never assumed before renewal.

New accounts and insufficient histories show recorded information without a projected line, run-out date, or estimated renewal balance. Frozen spending suppresses future projections. An exhausted budget, money entirely tied up in reservations, and a period waiting for pending payments before vault renewal have separate messages. Renewal starts a new observation window, while unresolved reservations still reduce availability.

## Verification and demo

Unit tests cover depletion timing, on-track balances, exact renewal boundaries, recorded-step inspection, projected interpolation, sparse history, daily and 30-day periods, reservations, pauses, exhausted availability, rollover delays, released budget, and Soft Decline accounting. PostgreSQL integration tests verify selected-child ownership, snapshot totals, carried reservations, paused spending, reset history after renewal, and delayed vault renewals.

For a reproducible demonstration, use a synthetic account with a $100 allowance, a period starting two days ago, and two confirmed $30 payments at different times. The observed pace is approximately $30/day, availability is $40, and the projection runs out about 1.33 days later, before renewal. The daily guide is about $8/day for the remaining five days. Use the slider to inspect past and projected balances. A fresh account should instead explain its minimum history requirement. Synthetic QA records must not be presented as real PayPal captures.
