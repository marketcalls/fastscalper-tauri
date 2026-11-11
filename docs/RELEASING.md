# Releasing FastScalper

Releases are built and published by GitHub Actions from a version tag. Nothing is built on a
developer machine, and the same workflow produces every platform's installers.

- `.github/workflows/ci.yml` checks every pull request and every push to `master`.
- `.github/workflows/release.yml` builds and publishes a release when a `vX.Y.Z` tag is pushed.
- `.github/release-notes.md` is the template for the release description.
- `scripts/check-version.mjs` checks that all version numbers agree.

## Versions

`package.json` is the single source of the app version. `src-tauri/tauri.conf.json` reads it
directly (`"version": "../package.json"`), and `src-tauri/Cargo.toml` must carry the same number.
Use plain `X.Y.Z` versions: the Windows MSI installer does not accept suffixes such as `-beta.1`.

Check the versions at any time:

```sh
node scripts/check-version.mjs
```

It compares `package.json`, `package-lock.json`, `src-tauri/Cargo.toml` and `src-tauri/Cargo.lock`
and tells you how to fix any mismatch. CI runs it on every pull request.

## Cutting a release

The example releases version `0.1.2`.

1. On a new branch, bump the version everywhere:

   ```sh
   npm version 0.1.2 --no-git-tag-version   # updates package.json and package-lock.json
   ```

   Then set `version = "0.1.2"` in the `[package]` table of `src-tauri/Cargo.toml` and refresh
   the lock file:

   ```sh
   cd src-tauri
   cargo update --workspace
   cd ..
   node scripts/check-version.mjs
   ```

2. Run the same checks as CI:

   ```sh
   npm run lint
   npm run format:check
   npm run typecheck
   npm test
   npm run build
   cd src-tauri
   cargo fmt --check
   cargo clippy --all-targets -- -D warnings
   cargo test
   ```

3. Read `.github/release-notes.md`. It becomes the top of the release description, so make sure
   the upgrade notes still apply. GitHub appends the list of merged changes and the full
   changelog link automatically.

4. Open a pull request, wait for CI to pass, and merge it into `master`.

5. Tag the merge commit and push the tag:

   ```sh
   git switch master
   git pull
   git tag -a v0.1.2 -m "FastScalper 0.1.2"
   git push origin v0.1.2
   ```

6. Follow the run under Actions, Release. It usually takes 20 to 30 minutes. When every job is
   green, the release is public on the Releases page.

To rebuild a tag that already exists (for example after fixing a workflow problem), open
Actions, Release, Run workflow, and enter the tag, for example `v0.1.2`.

## What the release workflow does

1. **Verify tag and version** fails within seconds if the tag is not exactly `v` plus the
   `package.json` version, or if any version number disagrees.
2. **Create draft release** creates one draft release named `FastScalper X.Y.Z` with the notes
   from `.github/release-notes.md`. On a re-run it reuses the existing draft. It refuses to
   continue if a published release already has that tag.
3. **Build** runs one job per platform. Each job builds with `tauri-apps/tauri-action` and
   uploads its files to the draft:

   | Platform            | Runner             | Files                                                  |
   | ------------------- | ------------------ | ------------------------------------------------------ |
   | macOS Apple Silicon | `macos-latest`     | `_aarch64.dmg`, `_aarch64.app.tar.gz`                  |
   | macOS Intel         | `macos-26-intel`   | `_x64.dmg`, `_x64.app.tar.gz`                          |
   | Windows x64         | `windows-latest`   | `_x64-setup.exe` (NSIS), `_x64_en-US.msi`              |
   | Linux x64           | `ubuntu-22.04`     | `_amd64.deb`, `-1.x86_64.rpm`, `_amd64.AppImage`       |
   | Linux arm64         | `ubuntu-22.04-arm` | `_arm64.deb`, `-1.aarch64.rpm`, `_aarch64.AppImage`    |

   Every file name starts with `FastScalper_X.Y.Z` (rpm files: `FastScalper-X.Y.Z`). Linux builds
   run on Ubuntu 22.04 on purpose: its older glibc lets the packages run on more distributions.
   When GitHub retires its Intel macOS runners, change the Intel runner to `macos-latest`; the
   build already passes `--target x86_64-apple-darwin`, so it becomes a cross-compile.

4. **Publish release** runs only when every build succeeded. It checks that every file named in
   `.github/release-notes.md` is attached, then makes the draft public. If any build fails, the
   release stays a draft and nobody sees it.

### Bundle settings that keep upgrades from 0.1.0 working

Version 0.1.0 was built with Tauri 1 under the product name `fastscalper`. The `bundle` section of
`src-tauri/tauri.conf.json` compensates for the rename to `FastScalper`:

- `windows.wix.upgradeCode` is pinned to the code 0.1.0 used (a UUID v5 of
  `fastscalper.exe.app.x64`), so the MSI upgrades 0.1.0 in place instead of installing a second
  copy. Never change this value.
- Tauri names Linux packages after the product name in kebab case, so the package is now
  `fast-scalper`. The deb declares `Conflicts` and `Replaces: fastscalper` and the rpm declares
  `Obsoletes: fastscalper`, so apt and dnf remove 0.1.0 instead of failing on the shared
  `/usr/bin/fastscalper`.
- `publisher` is deliberately unset. It defaults to `fastscalper` (from the identifier), the
  value 0.1.0 used, and the Windows NSIS installer stores its install location under a registry
  key named after it.

Settings moved to a new storage location in 0.1.1, so users re-enter them after upgrading. The
release notes say so.

## Code signing

Builds are unsigned today, and the release notes explain how to open them. Signing turns on
automatically once the secrets below exist (Settings, Secrets and variables, Actions, New
repository secret). The workflow never passes empty secrets to the build.

After you enable signing for a platform, remove its part of the "Opening FastScalper the first
time" section from `.github/release-notes.md`.

### macOS

Without secrets the app gets an ad-hoc signature (`bundle.macOS.signingIdentity` is `"-"`).
Apple Silicon Macs refuse to launch an app with no signature at all, so this is what makes the
unsigned builds usable.

Signing needs a paid Apple Developer account and a "Developer ID Application" certificate.

| Secret                       | Value                                                                       |
| ---------------------------- | --------------------------------------------------------------------------- |
| `APPLE_CERTIFICATE`          | The certificate exported from Keychain Access as `.p12`, base64 encoded     |
| `APPLE_CERTIFICATE_PASSWORD` | The password chosen when exporting the `.p12`                               |
| `APPLE_SIGNING_IDENTITY`     | The certificate name, for example `Developer ID Application: Name (TEAMID)` |
| `APPLE_ID`                   | Apple Account email, for notarization                                       |
| `APPLE_PASSWORD`             | An app-specific password from account.apple.com, not the account password   |
| `APPLE_TEAM_ID`              | The 10-character team ID from the developer account                         |

The first three sign the app; all three are required together. Adding the last three also
notarizes it, which removes the Gatekeeper warning completely.

```sh
base64 -i certificate.p12 | gh secret set APPLE_CERTIFICATE
gh secret set APPLE_CERTIFICATE_PASSWORD
gh secret set APPLE_SIGNING_IDENTITY
```

### Windows

The workflow supports a code signing certificate exported as a password-protected `.pfx` file.
It imports the certificate on the runner and passes its thumbprint to Tauri, which signs the
executable and both installers with SHA-256 and the DigiCert timestamp server configured in
`bundle.windows`.

| Secret                         | Value                                    |
| ------------------------------ | ---------------------------------------- |
| `WINDOWS_CERTIFICATE`          | The `.pfx` file, base64 encoded          |
| `WINDOWS_CERTIFICATE_PASSWORD` | The password that protects the `.pfx`    |

```sh
base64 -w0 certificate.pfx | gh secret set WINDOWS_CERTIFICATE
gh secret set WINDOWS_CERTIFICATE_PASSWORD
```

Certificates issued since mid-2023 usually live on a hardware token or in a cloud service and
cannot be exported as `.pfx`. For those (for example Azure Artifact Signing), set
`bundle.windows.signCommand` as described in the Tauri guide
(https://v2.tauri.app/distribute/sign/windows/) and replace the "Import Windows signing
certificate" step in `release.yml` with the provider's login step.

## Troubleshooting

**Verify fails with "Tag vX.Y.Z does not match package.json version".** The tag points at a
commit with a different version. Delete the tag, fix the version on `master`, and tag again:

```sh
git push --delete origin v0.1.2
git tag -d v0.1.2
```

**One platform failed.** The release stays a draft. Open the run and choose Re-run failed jobs.
The other platforms' files stay on the draft, and re-uploaded files replace the old ones. Most
one-off failures (a dmg that fails with "Resource busy", a download timeout while building the
AppImage) pass on the second attempt.

**"Release vX.Y.Z is already published".** Published releases are never overwritten. Bump the
version and release again. To withdraw a bad release, delete it and its tag:
`gh release delete v0.1.2 --cleanup-tag`.

**Publish fails with "Named in the release notes but not uploaded".** A build produced a
different file name than the notes promise, or did not produce the file at all. Compare the
draft's assets with `.github/release-notes.md`, fix whichever is wrong, and re-run.

**macOS says the app "is damaged and can't be opened".** The app has no signature at all. Check
that `bundle.macOS.signingIdentity` is still `"-"` in `src-tauri/tauri.conf.json`.

**Windows build fails on the MSI step with a version error.** The version has a suffix such as
`-beta.1`. MSI only accepts plain `X.Y.Z`.

**"Resource not accessible by integration".** The release jobs request `contents: write`
themselves. If an organization policy limits the workflow token to read-only, allow write access
under Settings, Actions, General, Workflow permissions.

**macOS signing fails with "certificate ... does not match provided identity".**
`APPLE_SIGNING_IDENTITY` must match the name of the certificate in `APPLE_CERTIFICATE` exactly.
