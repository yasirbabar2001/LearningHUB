# Employee login and portal layout

## What will change
- Make the employee sign-in page the first screen for signed-out visitors.
- After a successful employee sign-in, open the Leaderboard.
- Match the attached employee view with the navy left navigation, top Leaderboard header, and centered social feed.
- Keep the existing compact notifications, Home, Log out, and profile controls.
- Show each employee’s uploaded profile photo beside their approved posts; use initials when no photo exists.

## Technical details
- Make the home route session-aware and redirect signed-out employees to sign-in and signed-in employees to Leaderboard.
- Add a reusable employee navigation shell to the Leaderboard without changing admin screens.
- Safely expose signed-in employees’ profile photos through the private photo storage rules and post-author data.
- Preserve pending-post privacy and existing moderation rules.
- Verify sign-in redirection, desktop/mobile layout, post avatars, and compilation.
