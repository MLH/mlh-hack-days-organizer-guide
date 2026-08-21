# GitBook integration deployment

## Current status

The private **Hack Day Guide Tools** integration was published to the `mlh` GitBook organization and enabled for the Hack Days Organizer Guide space in August 2026.

It provides two interactive documentation blocks:

- `hack-day-schedule` — a tailored Hack Day run-of-show generator
- `hack-day-reimbursement-rate` — a searchable reimbursement-rate finder

## Privacy and permissions

- Visibility: private to the MLH GitBook organization
- Target: the Hack Days Organizer Guide space
- Requested GitBook API scopes: none (`scopes: []`)
- External services: none
- Stored visitor data: none
- Removal: disable the integration for the space or uninstall it from the organization

## Publishing an update

From this directory:

```bash
npm ci
npm run check
npx gitbook auth
npx gitbook whoami
npx gitbook integration publish .
```

`gitbook auth` uses a personal developer token from the publisher's GitBook Developer settings. The token represents that individual and must not be committed or shared.

Before publishing, confirm that `npx gitbook whoami` shows the intended MLH account and that `organization: mlh` remains correct in `gitbook-manifest.yaml`. A successful publish updates the existing private integration; it does not publish or edit the guide content.
