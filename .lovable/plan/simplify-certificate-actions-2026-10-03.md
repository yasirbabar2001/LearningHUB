# Simplify Certificate Actions

## What will change
- Replace the two LinkedIn choices with one **Share on LinkedIn** button.
- Add a **View Certificate** button that opens the full certificate inside the portal.
- Keep **Download PDF** as a separate action.
- Apply the same action set wherever certificates appear, including My Certificates and Virtual Sessions.

## Technical details
- Reuse the existing certificate dialog and PDF generator.
- Separate the certificate preview content from its action buttons to avoid duplicate or nested dialogs.
- Preserve the certificate signature, verification number, and existing download layout.
- Verify the page builds and that the preview opens and closes correctly.
