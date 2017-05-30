# FEIE Physical Presence Test Calculator

This is a calculator for the Physical Presence Test, part of the Foreign Earned Income Exclusion for US Citizens.

## Tasks

- [ ] Fix bug with trip ending 10th, trip starting 11th, and then adding trip from 10th to 11th (overnight in 1 country)
- [ ] Clean up timezones / hours. Calendar library doesn't like UTC, though.
- [ ] Help user visualize ideal 12-month period with their trips
- [ ] Edge case: Flying across intl date line (depart Jan-5, land Jan-4)
- [ ] Figure out which countries/territories don't count as "foreign"

## Example Calculation

![FEIE Screenshot](http://i.imgur.com/iJsciGn.png)

More info on page 15 https://www.irs.gov/pub/irs-pdf/p54.pdf

Assumptions we make: If your trip starts on day 1 and ends on day 2, we will assume the total travel time is less than 24 hours. If you are traveling east, your travel could end on the next day but be greater than 24 hours. It is a grey area according to pub54

