# Changesets

Changes to the published `@larry-labs/palm-agents-relay` package should include a changeset.

Run:

```sh
pnpm changeset
```

Select `@larry-labs/palm-agents-relay`, choose the appropriate semantic version bump, and write
a concise user-facing summary. Commit the generated Markdown file with the
change. Repository-only changes that do not affect the published package do
not need a changeset.

Do not edit the package version or changelog manually. On pushes to `main`, the
release workflow creates or updates a release pull request. Merging that pull
request publishes the new version to npm and creates a matching GitHub release.

The workflow uses npm Trusted Publishing when it is configured for
`Larry-Labs/palm-agents` and `.github/workflows/release.yml`. A repository
`NPM_TOKEN` secret remains supported as a fallback. GitHub Actions must also
be allowed to create pull requests in the repository workflow settings.
