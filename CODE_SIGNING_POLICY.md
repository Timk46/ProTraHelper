# Code Signing Policy

## Overview

ProTra Helfer uses [SignPath Foundation](https://signpath.org) for free, HSM-based code signing of Windows installers. This ensures our releases are trusted and do not trigger SmartScreen warnings.

## Signed Artifacts

- Windows NSIS installer (`.exe`) — signed via SignPath

## Signing Process

1. A release is triggered by pushing a Git tag matching `v*` (e.g., `v1.0.0`)
2. The GitHub Actions release workflow builds the unsigned Windows installer
3. The unsigned artifact is submitted to SignPath via the `signpath/github-action-submit-signing-request` GitHub Action
4. SignPath verifies the origin (must come from this GitHub repository's CI) and signs the artifact using an HSM-stored certificate
5. The signed artifact is uploaded to the GitHub Release

## Who Can Sign

- **Only the CI/CD pipeline** can submit signing requests — no individual has access to the signing key
- Signing is triggered automatically when a version tag is pushed
- Only repository maintainers with write access can push tags

## Key Protection

- The signing key is stored in a Hardware Security Module (HSM) managed by SignPath
- No private key material is ever exposed to the CI environment or any individual
- The `SIGNPATH_API_TOKEN` secret is stored in GitHub repository secrets and is only accessible to GitHub Actions

## Verification

Users can verify signatures using Windows' built-in signature verification:
- Right-click the `.exe` → Properties → Digital Signatures tab
- The signer should show the SignPath Foundation certificate

## Contact

For questions about our code signing process, please open a GitHub issue.
