# Mac Setup TODO

Steps to finish setup on a macOS machine.

- [ ] Run `bundle install` in `apple/` to generate `Gemfile.lock` (commit it)
- [ ] Create the Match secrets repo (`r26d-apple-match-secrets`) if it doesn't exist
- [ ] Set env vars: `R26D_MATCH_PASSWORD`, `R26D_MATCH_GIT_URL`, `R26D_FASTLANE_TEAM_ID`
- [ ] Run `task apple:doctor` to verify prerequisites
- [ ] Run `R26D_SIGNING_ADMIN_CONFIRM=yes task apple:match:admin` for first-time cert setup
- [ ] Test the full flow: `task apple:prepare` → build → `task apple:cleanup`
