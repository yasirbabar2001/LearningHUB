# Next Phase: Virtual Sessions, Certificates and Emails

## Goal
Add a separate **Virtual Sessions** area where employees complete a whole online training on their own: pre-test, learning content, post-test, feedback, and a certificate they can download and share on LinkedIn. Emails go out at the key steps.

## Admin side (new "Virtual Sessions" tab)
- Create a virtual session from an existing training name (or a new one), with title, description, who it's for (departments/designations/employee IDs, same filters as today), open and close dates, and pass mark (default 60%).
- **Content builder:** add PDFs and videos (upload, up to 100 MB per video), put them in order, and give each a short title. Optionally make every item "must view" before the post-test unlocks.
- **Evaluation:** reuse the existing question bank for that training (same randomised MCQs, timer, screen-switch detection). Pre- and post-test use the same rules as today.
- **Certificate settings:** title, signatory name and designation, and an optional expiry period.
- **Progress report:** each assigned employee's step (not started, pre-test done, content viewed %, post-test score, feedback done, certificate issued), with Excel export. Added to "Download Full Report".

## Employee side (new "Virtual Sessions" menu item)
List of assigned sessions with status. Opening one shows a step tracker:

```text
1 Pre-test  ->  2 Learn (PDF/video)  ->  3 Post-test  ->  4 Feedback  ->  5 Certificate
```
- Steps unlock in order; progress is saved so employees can stop and continue later.
- PDFs open inside the portal; videos play inside the portal and record how much was watched.
- Post-test failed: the employee sees their score and can re-take after reviewing the content (admin sets the number of attempts, default 2).
- After feedback is submitted and the post-test was passed, a **certificate pops up** on screen with:
  - **Download PDF** (ABHI branding, employee name and ID, training, date, score, unique certificate number, QR code)
  - **Add to LinkedIn profile** (fills in LinkedIn's "Licenses & certifications" form)
  - **Share on LinkedIn** (opens a LinkedIn post with the certificate link)
- All earned certificates are also kept under "My Certificates".

## Certificate verification
- Each certificate has a public check page (by certificate number or QR code) that confirms name, training, date and that it's valid. LinkedIn links point here. It shows no other employee data.

## Emails
- Sent from the portal's own email address (needs a one-time sender domain setup, e.g. notify.abhibank.com or a Lovable-provided address).
- Emails: session assigned, reminder 3 days before the close date if not finished, certificate issued (with download link), post-test failed (with re-take info).
- The notification bell gets the same alerts.

## Points to know
- **LinkedIn:** LinkedIn doesn't let apps post on someone's behalf without a special company LinkedIn app approval. The buttons open LinkedIn pre-filled; the employee clicks "Post"/"Save" there. This needs no setup from the bank.
- **Storage:** videos use storage space; large libraries may need a bigger storage plan later.
- **Credits:** this is a large phase. You have about 79 credits, so it may be best to build it in two parts: (1) sessions, content, tests, feedback, certificate; (2) emails, verification page, reports.

## Technical details
- New tables (all with grants + RLS): `virtual_sessions` (training_id, audience filters, dates, pass mark, max attempts, certificate settings, status), `virtual_session_content` (type pdf/video, storage path, order, required), `virtual_session_progress` (per employee: step, content viewed, pre/post attempt ids, feedback id, timestamps), `virtual_content_views` (seconds watched / pages opened), `certificates` (cert number from sequence, employee snapshot, training, score, issued_at, expires_at, revoked).
- Private bucket `virtual-content` (employees read only content of sessions assigned to them; signed URLs). Certificate PDFs generated on the client with jsPDF + qrcode.
- Server functions (requireSupabaseAuth + requirePortalEmployee) for step transitions and certificate issuing; the server checks passed post-test + submitted feedback before issuing. Existing evaluation and feedback functions reused with a `virtual_session_id` link column.
- Public route `/verify/$certNo` with a server function using a narrow read (cert number, name, training, dates, status only).
- LinkedIn: `linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=...&organizationName=ABHI&issueYear=...&certId=...&certUrl=...` and `linkedin.com/sharing/share-offsite/?url=<verify page>`.
- Emails via Lovable's built-in email service (sender domain setup + transactional templates); reminder via a scheduled job calling a protected `/api/public/` route.
- New routes: `/virtual` (employee list), `/virtual/$id` (step player), `/certificates`, `/_authenticated/virtual-admin`, `/verify/$certNo`.
