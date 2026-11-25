# Git workflow and review evidence

Repository: https://github.com/mwaura69/finnet (public).

Feature branches and meaningful incremental commits are present. Hosted merged PRs were verified through GitHub's public API, including [mail/seed work, PR #4](https://github.com/mwaura69/finnet/pull/4), [Google terms fix, PR #3](https://github.com/mwaura69/finnet/pull/3), and [deployment configuration, PR #1](https://github.com/mwaura69/finnet/pull/1). This satisfies the feature-branch-through-PR requirement.

For later changes, branch from the current main, commit coherent changes, push, and open a PR. Run `npm run check` before merging. The assessment completion revision also includes CI for pull requests and main/feature pushes. Confirm the GitHub Actions run succeeds on the commit actually deployed.

```sh
git status
git log --oneline --graph --all
npm run check
git push origin HEAD
```

Do not commit `.env`, database files, email outbox files, API keys or session tokens. A credential was previously exposed in example-file history and credentials were also shared in chat; they must be revoked/rotated with their providers. Removing current values does not invalidate old credentials. No history rewrite is performed automatically because it would disrupt the shared repository and existing PRs.

The brief's deadline is 25 November 2026, 23:59 EAT. Its submission guidance asks for no later commits. The candidate reviews and submits the repository, deployed URLs, demo credentials, approximate hours and reviewer notes.
