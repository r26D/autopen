# Source

**Repository:** https://github.com/obra/superpowers
**Version:** v5.1.0 (commit `f2cbfbe`)
**Date fetched:** 2026-05-26
**License:** MIT (Jesse Vincent)

## How to update

```bash
git clone --depth=1 https://github.com/obra/superpowers /tmp/superpowers-update
rsync -av --delete --exclude='SOURCE.md' /tmp/superpowers-update/skills/ skills/superpowers/
git -C /tmp/superpowers-update log --format="%h %s" -1
```

Then update **Version** and **Date fetched** above with the output from the last command.
