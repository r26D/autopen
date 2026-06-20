# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Debian APT repository signing: `autopen debian sign-release` (GPG clearsign + detached signature) and `autopen debian pubkey` (export binary public key)
- GPG passphrase delivery via stdin pipe (`--passphrase-fd 0`) for secure signing without disk/CLI exposure
- Fingerprint discovery after key import with single-key enforcement
- `R26D_DEBIAN_SIGNING_PASSWORD` environment variable check in `autopen doctor`
- Per-app Tauri updater signing key management (keygen, pubkey, sign tasks) with SOPS-encrypted private keys
- Initial project setup
