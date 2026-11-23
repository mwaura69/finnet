# Git workflow

The repository was initialized locally on `main`. Implementation commits were created incrementally on `feat/fintrack-foundation`. Commit author `FinTrack Scaffold <scaffold@fintrack.local>` explicitly identifies generated starter work; it does not impersonate you. Set your own author identity for your subsequent commits.

```sh
git log --oneline --all --graph
git status
git config user.name "YOUR NAME"
git config user.email "YOUR VERIFIED EMAIL"
```

Create an **empty** repository under your own GitHub/GitLab/Bitbucket account. Do not initialize another README remotely; that would create an unrelated history. Then:

```sh
git remote add origin YOUR_REPOSITORY_GIT_URL
git push -u origin main
git push -u origin feat/fintrack-foundation
```

Open a pull request from `feat/fintrack-foundation` into `main` on your provider. Explain the frontend-complete scaffold, demo adapter and remaining business service honestly. Review and merge it through that provider. This is the assessment's hosted feature-branch/PR requirement; the scaffold does not fabricate a PR URL or a merge.

For your business API work:

```sh
git switch main
git pull --ff-only
git switch -c feat/production-portfolio-api
# Implement and test each coherent change, then commit it.
git add backend/src/api/v1/portfolios/portfolio.service.ts
git commit -m "feat(api): implement owned portfolio CRUD"
```

Commit additional transaction and summary behavior separately when it works. Run `npm run check` before pushing. Never commit `.env`, database files or tokens. Record the eventual merged PR URL in `docs/DEPLOYMENT.md`. Make your final assessment commit before the deadline stated in the brief.
