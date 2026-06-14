# Improvements

Improvement ideas and feedback: changes that would make the product or workflow better, from reviews, users, or conversation. Use `improve:` or `feedback:`. Move sections to `ITERATION.md` when scheduling work.

**Last id:** IMP-3

## Sign a Mac app over SSH

**Id:** IMP-1

**Date:** 2026-06-10

**Why:** Enables remote signing workflows so developers can sign and notarize macOS apps from headless or remote machines without needing physical access to the signing host.

**Issue:** Currently there is no support for performing macOS app signing over an SSH connection, which limits CI/CD and remote build workflows.

**Suggestion:** Add support for signing a Mac app over SSH, handling keychain access and codesign/notarization in a remote session.

## Add a CLI wrapper for the signing process

**Id:** IMP-3

**Date:** 2026-06-13

**Why:** Clients currently need to know the repo path to invoke signing, which exposes internal directory structure and tempts them to poke around in the repo. A standalone binary/wrapper callable from anywhere eliminates both problems.

**Issue:** The signing process requires callers to know the path to this repo and run scripts from within it. This leaks implementation details and creates a risk of clients modifying or inspecting repo internals.

**Suggestion:** Create a binary or wrapper script that can be installed on the PATH (or invoked from anywhere) to perform signing operations, abstracting away the repo location and internals from client workflows.
