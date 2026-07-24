# RankCues GitHub App setup

RankCues uses a platform-owned GitHub App. Customers install the app on selected
repositories; they are never asked for a personal access token.

## Registration

- Homepage URL: `https://rankcues-preview.bricy957711.workers.dev`
- Setup URL: `https://rankcues-preview.bricy957711.workers.dev/api/integrations/github/callback`
- Redirect on update: enabled
- Webhooks: disabled for the first release
- Public app: enabled when onboarding customers outside the owning GitHub account

Repository permissions:

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read-only (implicit)

No organization or account permissions are required.

## Cloudflare configuration

Set the following as server-side configuration. Never expose the private key
through a `NEXT_PUBLIC_*` variable.

- `GITHUB_APP_ID`
- `GITHUB_APP_SLUG`
- `GITHUB_APP_PRIVATE_KEY` (the complete PEM private key)
- `GITHUB_STATE_SECRET` (a separate random value)

After configuration, redeploy the Worker. The Settings page will change from
“Platform setup” to “Ready to install”.

## Safety model

RankCues creates a `rankcues/*` branch and opens a Draft Pull Request. It does
not merge the Pull Request, edit workflow files, or deploy production.
