# Hack Day Guide Tools — private GitBook integration

This folder contains two review-ready custom GitBook blocks for the Hack Days Organizer Guide: a schedule generator and a searchable reimbursement-rate finder.

## What organizers see

The interactive block:

- accepts event lengths from 4 to 12 hours in 15-minute increments;
- rounds start times and schedule boundaries to practical quarter hours;
- keeps check-in, opening remarks, project submission, demos, judging, winner marking, gallery publication, and closing in every schedule;
- presents one clear build block, with team formation and idea alignment explained underneath; a four-hour event with six teams gets 2 hours and 45 minutes of build time;
- places project submission inside the final part of build time so one team member can submit while the rest keep working;
- shows food availability around the event midpoint by default, so organizers can provide a meal or snacks without pausing building;
- combines judging and winner declaration with project demos, with judges scoring as teams present, marking winners, and publishing the project gallery before closing;
- can reserve up to 90 minutes for demos in events of 7 hours or more, displays the actual available minutes per team, and offers science-fair-style judging when whole-room demos become impractical;
- warns when a configuration leaves too little building time or exceeds the recommended 4–6 hour format; and
- copies a plain-text schedule for use in organizer communications.

The reimbursement-rate finder:

- searches the reviewed country list without displaying an unwieldy full-page table;
- estimates the allowance for 1–50 verified OrganizerHQ check-ins;
- shows the per-hacker rate and maximum allowance at 50 check-ins; and
- reminds organizers that reimbursement cannot exceed approved, itemized spending.

The integration stores no personal data, uses no external services, and requests no GitBook API scopes.

## Local review

Open the guide's existing local preview and navigate to **Plan Your Event → Recommended Schedule**. The preview loads the same HTML and JavaScript that the GitBook webframe will serve.

You can also open `src/webframe.html` or `src/rate-webframe.html` directly in a browser.

## Validate locally

```bash
npm install
npm run check
```

`npm run check` embeds the browser assets, type-checks the ContentKit integration, runs schedule-generation tests, and validates the GitBook manifest.

## Later activation — not performed for this review

1. Confirm the `organization` value in `gitbook-manifest.yaml` is the MLH GitBook organization ID or subdomain.
2. Authenticate the GitBook CLI with a personal developer token using `npx gitbook auth`.
3. Run `npx gitbook integration publish .`. The integration remains private because the manifest sets `visibility: private`.
4. Send the returned installation link to an MLH GitBook administrator.
5. The administrator installs the integration in the MLH organization.
6. A Creator enables it for the Hack Days space.
7. Insert the blocks with the Markdown code fences `hack-day-schedule` and `hack-day-reimbursement-rate`.

## How it works

The manifest maps each fenced Markdown block to a GitBook ContentKit component. When GitBook renders the page, the component returns an isolated webframe served by the integration's public content endpoint. The HTML and JavaScript are bundled into the published integration version and execute in the visitor's browser.

Neither tool reads the GitBook space, calls an external API, stores visitor information, or requests a GitBook API scope. Disabling the integration removes the rendered tools; the fenced Markdown remains in the source.

Publishing or installation is intentionally outside the local review workflow.
