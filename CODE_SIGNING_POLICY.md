# Code Signing Policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

## Overview

ProTra Helfer uses SignPath Foundation for free, HSM-based code signing of Windows installers. This ensures our releases are trusted and do not trigger SmartScreen warnings.

The team responsible for code signing is the same team responsible for development and maintenance, including ownership of the source code repository.

## Signed Artifacts

- Windows NSIS installer (`.exe`) — signed via SignPath
- All signed binaries include enforced metadata: product name set to "ProTra Helfer" and product version matching the release version

## Signing Process

1. A release is triggered by pushing a Git tag matching `v*` (e.g., `v1.0.0`)
2. The GitHub Actions release workflow builds the unsigned Windows installer from the source code in this repository
3. The unsigned artifact is submitted to SignPath via the `signpath/github-action-submit-signing-request` GitHub Action
4. SignPath verifies the origin (must come from this GitHub repository's CI) and signs the artifact using an HSM-stored certificate
5. Each signing request requires **manual approval** by an Approver in the SignPath dashboard before the artifact is signed
6. The signed artifact is uploaded to the GitHub Release

## Team Roles

- **Authors / Committers:** [Repository collaborators with write access](https://github.com/Timk46/ProTraHelper/settings/access)
- **Reviewers:** All pull requests from non-committers are reviewed by a committer before merge
- **Approvers:** [Repository owner (@Timk46)](https://github.com/Timk46) — responsible for approving each signing request in SignPath

All team members with write access use multi-factor authentication (MFA) for both GitHub and SignPath access.

## Key Protection

- The signing key is stored in a Hardware Security Module (HSM) managed by SignPath
- No private key material is ever exposed to the CI environment or any individual
- The `SIGNPATH_API_TOKEN` secret is stored in GitHub repository secrets and is only accessible to GitHub Actions
- Only the CI/CD pipeline can submit signing requests — no individual has access to the signing key

## Installation and System Changes

The Windows installer (NSIS) informs the user about all system modifications during installation:
- Firewall rule for local server communication (user is prompted)
- Optional Windows autostart entry (user is prompted)
- `rhinogh://` URL protocol handler registration
- `.gh` file type association
- Registry entries under `HKCU\Software\HEFL\ProTra-Helper`

A full uninstaller is included that removes all registry entries, file associations, firewall rules, and installed files.

## Verification

Users can verify signatures using Windows' built-in signature verification:
- Right-click the `.exe` → Properties → Digital Signatures tab
- The signer should show the SignPath Foundation certificate

## Privacy Policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

The application communicates with a university backend server (HEFL) solely for:
- **User authentication:** Validating JWT tokens provided by the user during the pairing process initiated by the user
- **File downloads:** Downloading Grasshopper files explicitly requested by the user

No telemetry, analytics, tracking data, or personal information is collected or transmitted by this application. The university backend server's data handling is governed by the university's own privacy policy (University of Siegen, Department of Computer Science).

This software does not include any features designed to identify or exploit security vulnerabilities or circumvent security measures.

## Contact

For questions about our code signing process, please open a GitHub issue.
