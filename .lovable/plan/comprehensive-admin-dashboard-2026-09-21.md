# Comprehensive Admin Dashboard

## Goal
Replace the four overlapping Overview entries with one **Dashboard** that keeps their useful statistics, analysis, management summary, and downloads in a single screen.

## What will change
- Keep one **Dashboard** item under Overview and remove **Analytics**, **Executive Summary**, and **Reports** from the admin sidebar and mobile menu.
- Preserve the old `/analytics`, `/executive`, and `/reports` addresses by redirecting them to `/dashboard`, so saved links do not break.
- Expand `/dashboard` into one filtered workspace with:
  - headline training and feedback figures;
  - management insights, strengths, and attention areas;
  - rating comparisons and trends;
  - trainer, training, venue, organisation, gender, recommendation, and comment analysis;
  - selectable training-, trainer-, department-, region-, location-, wing-, designation-, gender-, type-, and month-wise reports;
  - CSV, Excel, PDF/print, full dashboard workbook, MIS, evaluation, and survey downloads.
- Organize the detailed content with clear internal tabs so the page remains usable instead of becoming one very long screen.
- Keep the existing global filters and make every section/report follow them.

## Technical details
- Reuse the existing analytics calculations and export functions rather than introducing new data sources.
- Move the unique Analytics and Reports controls into the Dashboard route; remove duplicated executive-only presentation where the same information already exists.
- Give the consolidated Dashboard route complete page metadata.
- Verify the dashboard renders, filters work, tabs switch, downloads remain available, old links redirect, and desktop/mobile navigation shows only one Overview destination.
