# Fix LinkedIn certificate sharing

## Change
- Replace the framed LinkedIn navigation with an explicit top-level browser launch.
- Keep the same certificate verification link and the single Share on LinkedIn action.
- If the browser blocks a new tab, redirect the top-level page rather than loading LinkedIn inside the portal frame.

## Verification
- Confirm the share action targets LinkedIn outside the embedded preview.
- Check the app build for errors.
