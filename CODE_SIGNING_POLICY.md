# Code Signing Policy

Free code signing provided by [SignPath.io](https://signpath.io), certificate by [SignPath Foundation](https://signpath.org).

## Overview

ProTra Helfer uses SignPath Foundation for free, HSM-based code signing of Windows installers. This ensures our releases are trusted and do not trigger SmartScreen warnings.

## Signed Artifacts

- Windows NSIS installer (`.exe`) — signed via SignPath

## Signing Process

1. A release is triggered by pushing a Git tag matching `v*` (e.g., `v1.0.0`)
2. The GitHub Actions release workflow builds the unsigned Windows installer from the source code in this repository
3. The unsigned artifact is submitted to SignPath via the `signpath/github-action-submit-signing-request` GitHub Action
4. SignPath verifies the origin (must come from this GitHub repository's CI) and signs the artifact using an HSM-stored certificate
5. The signed artifact is uploaded to the GitHub Release

## Team Roles

- **Committers and Reviewers:** [Repository contributors with write access](https://github.com/Timk46/ProTraHelper/graphs/contributors)
- **Approvers:** [Repository owner](https://github.com/Timk46)

All team members with write access use multi-factor authentication (MFA) for both GitHub and SignPath access.

## Key Protection

- The signing key is stored in a Hardware Security Module (HSM) managed by SignPath
- No private key material is ever exposed to the CI environment or any individual
- The `SIGNPATH_API_TOKEN` secret is stored in GitHub repository secrets and is only accessible to GitHub Actions
- Only the CI/CD pipeline can submit signing requests — no individual has access to the signing key
- Signing is triggered automatically when a version tag is pushed
- Only repository maintainers with write access can push tags

## Verification

Users can verify signatures using Windows' built-in signature verification:
- Right-click the `.exe` → Properties → Digital Signatures tab
- The signer should show the SignPath Foundation certificate

## Privacy Policy

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it.

The application communicates with a university backend server (HEFL) solely for:
- **User authentication:** Validating JWT tokens provided by the user during pairing
- **File downloads:** Downloading Grasshopper files requested by the user

No telemetry, analytics, or tracking data is collected or transmitted.

## Contact

For questions about our code signing process, please open a GitHub issue.
