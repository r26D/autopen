# Creating APT Repository Signing Keys

This guide walks through generating a GPG keypair for Debian APT repository signing and adding it to the autopen vault.

## Background

`autopen debian sign-release` expects two files in the vault under `debian/`:

| File | Format | Encrypted? | Purpose |
|------|--------|------------|---------|
| `repo-signing-key.gpg.enc` | SOPS-encrypted armored GPG private key | Yes | Decrypted at runtime to sign Release files |
| `repo-signing-key.pub` | Binary GPG public key | No | Distributed to clients for signature verification |

The private key is passphrase-protected. The passphrase is stored as `R26D_DEBIAN_SIGNING_PASSWORD` in the vault's `.env.signing` (also SOPS-encrypted).

## Prerequisites

- `gpg` installed
- `sops` installed and configured with access to the vault's encryption key (age or KMS)
- Write access to the vault git repository

## Steps

### 1. Generate the GPG key

Use an isolated keyring so the key never touches your personal GPG setup:

```bash
export GNUPGHOME=$(mktemp -d)
chmod 700 "$GNUPGHOME"

PASSPHRASE="<your-passphrase>"

gpg --batch --gen-key <<EOF
Key-Type: RSA
Key-Length: 4096
Name-Real: R26D APT Repository
Name-Email: apt@r26d.com
Passphrase: ${PASSPHRASE}
%commit
EOF
```

### 2. Get the fingerprint

```bash
FPR=$(gpg --batch --with-colons --list-secret-keys \
  | grep '^fpr:' | head -1 | cut -d: -f10)
echo "$FPR"
```

### 3. Export the private key (armored)

```bash
gpg --batch --armor --pinentry-mode loopback \
    --passphrase "$PASSPHRASE" \
    --export-secret-keys "$FPR" > repo-signing-key.gpg
```

### 4. Export the public key (binary)

Binary format is what APT expects for keyring files:

```bash
gpg --batch --export "$FPR" > repo-signing-key.pub
```

### 5. Add to the vault repository

```bash
cd <vault-repo>
mkdir -p debian

# Public key is stored unencrypted
cp /path/to/repo-signing-key.pub debian/repo-signing-key.pub

# SOPS-encrypt the private key
sops encrypt /path/to/repo-signing-key.gpg > debian/repo-signing-key.gpg.enc

# Register it for decryption during vault open
echo "debian/repo-signing-key.gpg.enc" >> encrypted_files.txt
```

### 6. Store the passphrase

The same passphrase used during key generation must be stored as `R26D_DEBIAN_SIGNING_PASSWORD` in the vault's `.env.signing`. Since that file is SOPS-encrypted:

```bash
sops edit .env.signing.enc
# Add the line:
#   R26D_DEBIAN_SIGNING_PASSWORD=<your-passphrase>
```

### 7. Commit and push the vault

```bash
git add debian/repo-signing-key.gpg.enc debian/repo-signing-key.pub encrypted_files.txt
git commit -m "Add Debian APT repository signing keypair"
git push
```

### 8. Clean up

Remove the plaintext private key and the temporary keyring:

```bash
rm repo-signing-key.gpg
rm -rf "$GNUPGHOME"
unset GNUPGHOME PASSPHRASE FPR
```

## Verification

After adding the key, confirm everything works:

```bash
# Sign a test Release file
autopen debian sign-release --release-file /path/to/Release

# Export the public key
autopen debian pubkey --output /tmp/r26d-archive-keyring.gpg

# Verify the signature using the exported public key
gpg --no-default-keyring --keyring /tmp/r26d-archive-keyring.gpg \
    --verify /path/to/Release.gpg /path/to/Release
```

## How it fits together

1. `autopen debian sign-release` opens the vault (`withVault`)
2. The vault session reads `encrypted_files.txt` and SOPS-decrypts each `.enc` file
3. `debian/repo-signing-key.gpg.enc` becomes `debian/repo-signing-key.gpg`
4. The passphrase is loaded from `.env.signing` as `R26D_DEBIAN_SIGNING_PASSWORD`
5. The private key is imported into a temporary GPG keyring
6. The Release file is clearsigned (InRelease) and detach-signed (Release.gpg)
7. The temporary keyring is deleted

## Key rotation

To rotate the signing key, repeat steps 1-8 with a new keypair. Clients will need the updated public key. During a transition period, you may want to sign with both old and new keys — this requires modifying the autopen code to support multiple signing keys.
