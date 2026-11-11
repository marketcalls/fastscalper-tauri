<!--
Release body template, rendered by .github/workflows/release.yml, which
replaces the VERSION placeholder in double curly braces with the version.
Every file name written in its own code span must be a real release asset:
the publish job refuses to publish the release if one is missing.
-->

FastScalper {{VERSION}}, the compact order pad for placing market orders through your own OpenAlgo server.

## Which file do I download?

### Windows 10 and 11 (64-bit)

| File | Choose it if |
| --- | --- |
| `FastScalper_{{VERSION}}_x64-setup.exe` | You are not sure. Installs for your user account only, no administrator rights needed. |
| `FastScalper_{{VERSION}}_x64_en-US.msi` | You install software centrally (Intune, Group Policy) or for all users. Needs administrator rights. |

### macOS 10.15 Catalina or later

Not sure which Mac you have? Open the Apple menu, then About This Mac. "Chip: Apple M1" (or M2, M3 and so on) means Apple Silicon; "Processor: Intel" means Intel.

| File | Choose it if |
| --- | --- |
| `FastScalper_{{VERSION}}_aarch64.dmg` | Your Mac has Apple Silicon. |
| `FastScalper_{{VERSION}}_x64.dmg` | Your Mac has an Intel processor. |
| `FastScalper_{{VERSION}}_aarch64.app.tar.gz` | You script installs on Apple Silicon. It holds only the app; most people want the .dmg. |
| `FastScalper_{{VERSION}}_x64.app.tar.gz` | The same, for Intel Macs. |

### Linux (64-bit)

Not sure which processor you have? Run `uname -m` in a terminal: `x86_64` means Intel or AMD, `aarch64` means ARM.

| File | Choose it if |
| --- | --- |
| `FastScalper_{{VERSION}}_amd64.deb` | Ubuntu 22.04 or later, Debian 12 or later, Linux Mint, Pop!_OS (Intel or AMD). |
| `FastScalper_{{VERSION}}_arm64.deb` | The same distributions on ARM. |
| `FastScalper-{{VERSION}}-1.x86_64.rpm` | Fedora, RHEL, openSUSE (Intel or AMD). |
| `FastScalper-{{VERSION}}-1.aarch64.rpm` | The same distributions on ARM. |
| `FastScalper_{{VERSION}}_amd64.AppImage` | Any other distribution (Intel or AMD). No installation needed. |
| `FastScalper_{{VERSION}}_aarch64.AppImage` | Any other distribution on ARM. |

Install a .deb with `sudo apt install ./<file>.deb` and an .rpm with `sudo dnf install ./<file>.rpm` (openSUSE: `sudo zypper install ./<file>.rpm`). To run an AppImage, make it executable with `chmod +x <file>.AppImage`, then double-click it or start it from a terminal.

## Opening FastScalper the first time

These builds are not yet signed with an Apple or Microsoft developer certificate, so your computer shows a warning the first time you open the app. The warning does not mean the download is damaged.

**macOS** says FastScalper cannot be opened, or that Apple could not verify it:

1. Drag FastScalper to Applications, try to open it once, and close the warning.
2. On macOS 15 Sequoia or later, open System Settings, then Privacy & Security, scroll down and click **Open Anyway**. On macOS 14 or earlier, right-click (or Control-click) FastScalper in Applications, choose **Open**, then click **Open** again.
3. If that does not work, run this once in Terminal: `xattr -dr com.apple.quarantine /Applications/FastScalper.app`

**Windows** SmartScreen says "Windows protected your PC": click **More info**, then **Run anyway**.

## Upgrading from 0.1.0

Settings now live in a `settings.json` file in the app config folder. On first launch FastScalper imports your 0.1.0 settings when it can find them. If Settings opens empty, enter your OpenAlgo host URL and API key once. Either way, check the exchange, product and voice alert options before placing an order.
