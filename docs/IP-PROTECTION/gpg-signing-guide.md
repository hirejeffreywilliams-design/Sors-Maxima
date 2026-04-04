# GPG-Signed Commits Setup Guide
## For Jeffrey W Williams (Jeffrey W Williams LLC)

---

### Why GPG-Sign Your Commits

- **Proves commits were made by you (non-repudiation)** — A GPG signature cryptographically ties each commit to your private key, which only you hold. No one can forge a commit in your name.
- **GitHub shows a "Verified" badge on signed commits** — Every signed commit in your repository will display a green "Verified" badge, visible to investors, legal teams, and collaborators.
- **Stronger legal evidence than unsigned commits** — GPG-signed commits are timestamped and authenticated, making them significantly more defensible in IP disputes or patent proceedings.
- **Git dates can be forged; GPG signatures cannot** — Anyone can alter the author date of an unsigned commit. A GPG signature is mathematically bound to the exact content and cannot be backdated.

---

### Step 1: Generate a GPG Key

```bash
gpg --full-generate-key
# Select: (1) RSA and RSA
# Key size: 4096
# Expiration: 0 (does not expire) or 2y
# Real name: Jeffrey W Williams
# Email: hirejeffreywilliams@gmail.com
# Comment: Jeffrey W Williams LLC
```

When prompted, enter a strong passphrase. Store this passphrase securely — losing it means losing the ability to sign with this key.

---

### Step 2: Get Your Key ID

```bash
gpg --list-secret-keys --keyid-format=long
# Look for the key ID after "sec rsa4096/"
# Example: sec rsa4096/ABC123DEF456 2026-04-04
```

The key ID is the alphanumeric string immediately after `rsa4096/`. Copy it — you'll need it in the next step.

---

### Step 3: Configure Git to Use GPG

```bash
git config --global user.signingkey YOUR_KEY_ID
git config --global commit.gpgsign true  # Sign ALL commits automatically
git config --global tag.gpgsign true     # Sign ALL tags automatically
```

Replace `YOUR_KEY_ID` with the key ID you copied in Step 2. Setting `commit.gpgsign true` means every future commit is signed without needing the `-S` flag.

---

### Step 4: Add GPG Key to GitHub

```bash
gpg --armor --export YOUR_KEY_ID
# Copy the output (from -----BEGIN PGP PUBLIC KEY BLOCK----- to -----END)
# Go to GitHub → Settings → SSH and GPG Keys → New GPG Key → Paste
```

GitHub will verify the key and associate it with your account. From this point forward, commits signed with this key will appear as "Verified" on GitHub.

---

### Step 5: Verify It Works

```bash
git commit -S -m "test: verify GPG signing"
git log --show-signature -1
# Should show "gpg: Good signature from Jeffrey W Williams"
```

If the signature is valid, you'll see output like:

```
gpg: Signature made Sat Apr  4 13:37:00 2026 EDT
gpg:                using RSA key ABC123DEF456
gpg: Good signature from "Jeffrey W Williams (Jeffrey W Williams LLC) <hirejeffreywilliams@gmail.com>"
```

---

### Step 6: Sign All Previous Tags

Tag signed releases create immutable, verifiable milestones in the IP chain.

```bash
git tag -s v1.0.0 -m "4everacy Platform v1.0.0 - Signed Release"
git push origin v1.0.0
```

For Sors Maxima:

```bash
git tag -s v1.0.0 -m "Sors Maxima v1.0.0 - Signed Release"
git push origin v1.0.0
```

Use annotated, signed tags (`-s`) rather than lightweight tags for maximum legal weight.

---

### Step 7: Export and Back Up Your Key

Never store your private key only on a single machine. Back it up securely:

```bash
# Export private key (store this somewhere secure — encrypted drive, password manager)
gpg --armor --export-secret-keys YOUR_KEY_ID > jeffrey-williams-llc-private.asc

# Export public key (safe to share)
gpg --armor --export YOUR_KEY_ID > jeffrey-williams-llc-public.asc
```

---

### Troubleshooting

| Problem | Fix |
|---|---|
| GPG hangs when committing | `export GPG_TTY=$(tty)` — add this to your `~/.bashrc` or `~/.zshrc` |
| Mac pinentry issues | `brew install pinentry-mac`, then add `pinentry-program /usr/local/bin/pinentry-mac` to `~/.gnupg/gpg-agent.conf` |
| Commit fails with GPG error | `git config --global gpg.program gpg2` |
| "No secret key" error | Re-run `gpg --list-secret-keys` to confirm key is present on current machine |
| Wrong email associated | Ensure the email on your GPG key matches your GitHub-verified email (`hirejeffreywilliams@gmail.com`) |

---

### How This Fits Into the Layer 7 IP Chain

```
GPG-Signed Commit (you, authenticated)
    ↓
GitHub records commit hash + signature
    ↓
GitHub Actions workflow triggers
    ↓
SHA-256 hash of full source tree generated
    ↓
OpenTimestamps (.ots) proof submitted to Bitcoin blockchain
    ↓
Immutable public record of authorship + content at a specific moment in time
```

Each layer reinforces the others. GPG signing proves *who* made the commit. The SHA-256 hash proves *what* was in the repository. The OpenTimestamps proof proves *when* it existed. Together, these create a legally robust, cryptographically verifiable IP chain for Jeffrey W Williams LLC.

---

*© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.*
