# ABHI IDEAS – Employee Innovation Module

The module is big, so it's built in 3 phases. Each phase works on its own and doesn't change any existing screens.

## Phase 1 – Employee experience + core admin (build first)
- **Floating "ABHI IDEAS" button** (navy with a sea-green accent, tooltip "Have an idea? Keh Do ABHI!") on every signed-in employee screen, placed above the mascot so nothing overlaps. It only shows when an admin has switched the module on.
- **Landing page**: the headline, the supporting text, and 3 cards: Submit an Idea / My Ideas / Explore Ideas. Explore Ideas only shows if the admin allows it.
- **3-step form with a progress bar**:
  1. Basic Idea: category cards (the 18 ABHI categories A–R, with examples), idea type, title, problem, solution
  2. Benefits: expected benefits, who benefits, expected impact
  3. Optional Details: where it applies, complexity, an attachment (PDF/Word/Excel/image, up to 10 MB), and "submit anonymously" if the admin allows it
- **Your details are filled in automatically** from your login: ID, name, designation, department, location, region, wing and line manager. You can't edit them.
- **Similar-idea check** before you submit. It shows a "We found similar ideas already submitted" list (title, category, date, status), but you can still submit.
- **Confirmation screen** with the automatic reference number ABI-IDEA-000001, plus buttons: View My Idea / Submit Another / Back.
- **My Ideas**: count cards (total, under review, shortlisted, implemented, not pursued) and a list showing status, the latest comment the admin marked as visible, and the outcome.
- **Admin > ABHI IDEAS > All Ideas**: search (reference, title, text, employee, department, keywords), the full set of filters combined, and Excel export.
- **Admin idea review page**: all idea details and the attachment, 11 statuses with a required comment, assessment ratings (7 Low/Medium/High scales, cost, saving, revenue, time), reviewer comments (internal or visible to the employee), and assignment (function, owner, target date).
- **Full history per idea**: every change records who, what, when, the old value and the new value.
- **Notifications** (using the existing bell): submitted, status changed, comment, shortlisted, approved, implemented for the employee; new idea and assignment for reviewers.

## Phase 2 – Management analytics
- **Dashboard** KPI cards: total, new, under review, shortlisted, in pilot, implemented, potential savings, potential revenue, plus "ideas that created value".
- **Charts**: ideas over time (daily, weekly, monthly or quarterly, with a date range); ideas by category, department, region, wing, designation and status.
- **Heatmaps**: Region × Category, Department × Category, Wing × Category.
- **ABHI IDEA INSIGHTS**: AI analysis of recent ideas that finds emerging trends, recurring problems, groups of similar ideas (never merged automatically), opportunity areas, quiet areas and cross-functional ideas.
- **Monthly and Quarterly reports** as Excel downloads.

## Phase 3 – Implementation, impact and recognition
- **Implementation tracker**: owner, supporting department, dates, budget and actual cost, estimated and actual benefit, notes.
- **Impact measurement**: financial, operational, customer, people and risk results, all as numbers.
- **Recognition**: Idea of the Month, Idea of the Quarter, Spotlight, High Impact and similar badges. Admins assign these manually. An optional Ideas Leaderboard can be switched on or off.
- **Settings**: turn the module on or off; manage categories, types, benefits and recognition types; switch anonymous submissions, Explore visibility, the leaderboard and whether employees can see comments on or off; name the reviewers. Every change is recorded in the audit log.

## Roles
- **Employee**: submits ideas and sees only their own, plus approved public ideas if the admin has allowed that.
- **Reviewer**: a new "Reviewer" role the admin gives to named employees. Reviewers see the ideas assigned to them and can assess and comment.
- **Admin and Owner**: full access. Admins see who submitted an anonymous idea; nobody else does.

## Technical details
- Tables: idea_categories, idea_types, idea_benefit_types, ideas (reference number from a sequence via trigger, snapshot of the submitter's details, arrays of benefit ids), idea_assessments, idea_comments (with an is_internal flag), idea_assignments, idea_implementations, idea_impacts, idea_recognitions, idea_reviewers, idea_attachments, idea_audit (filled by triggers), idea_settings (stored as app_settings keys). All tables get grants and row-level access rules. Admin checks use user_roles, and reviewer checks use a helper function. Anonymous ideas hide the submitter's details from everyone except admins by reading through a limited view.
- Private storage bucket for attachments, one folder per user.
- Server functions handle submission (the submitter comes from the login, never from the form), similarity scoring with Postgres trigram matching, status changes and notifications. Insights use the built-in AI service.
- Existing pieces are reused: EmployeeShell, AdminShell (a new "ABHI IDEAS" menu group), the notify_user function, the exceljs export, and the recharts charts already used on the dashboard.

Estimated effort: Phase 1 is the largest. Phases 2 and 3 are moderate. After approval I'll start with Phase 1 and continue through the other phases.
