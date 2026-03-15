# Contributing to CXDB

Thank you for your interest in contributing to CXDB! This document provides guidelines for contributing to the project.

## Welcome

CXDB is an open source AI Context Store maintained by StrongDM. We welcome contributions from the community in the form of bug reports, feature requests, documentation improvements, and code contributions.

## Development Setup

### Prerequisites

- **Rust**: 1.75 or later (for server and Rust client)
- **Go**: 1.22 or later (for Go client and gateway)
- **Node.js**: 20 or later with pnpm 8+ (for frontend)
- **Docker**: For running integration tests

### Clone and Build

```bash
# Clone the repository
git clone https://github.com/strongdm/cxdb.git
cd cxdb

# Build Rust components
cd server && cargo build
cd ../clients/rust && cargo build

# Build Go components
cd ../clients/go && go build ./...
cd ../../gateway && go build

# Build frontend
cd ../frontend && pnpm install && pnpm build
```

See [docs/development.md](docs/development.md) for detailed build instructions.

## Code Style

### Rust

- **Format**: Run `cargo fmt` before committing
- **Lint**: Run `cargo clippy -- -D warnings` and fix all warnings
- Follow the [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use meaningful variable names and add comments for complex logic

### Go

- **Format**: Run `gofmt -s -w .` before committing
- **Lint**: Run `golangci-lint run` and fix all issues
- Follow [Effective Go](https://go.dev/doc/effective_go) conventions
- Keep functions focused and testable

### TypeScript/Frontend

- **Format**: Run `pnpm lint --fix` to auto-format
- **Lint**: Run `pnpm lint` and fix all issues
- Follow React best practices and hooks guidelines
- Use TypeScript strictly (no `any` without good reason)

## Testing Requirements

All code contributions must include tests:

### Rust

```bash
cd server && cargo test
cd clients/rust && cargo test
```

### Go

```bash
cd clients/go && go test ./...
cd gateway && go test ./...
```

### Frontend

```bash
cd frontend && pnpm test
```

All tests must pass before merging. PRs with failing tests will not be accepted.

## Pull Request Process

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** following the code style guidelines above
3. **Add tests** for new functionality or bug fixes
4. **Update documentation** if you're changing behavior or adding features
5. **Run all tests and linters** locally before pushing
6. **Update CHANGELOG.md** if your change affects users (add under `[Unreleased]`)
7. **Create a pull request** using the PR template
8. **Wait for CI** to pass - all checks must be green
9. **Respond to review comments** from maintainers

### Commit Message Format

We follow conventional commits (optional but encouraged):

- `feat: add new feature` - New features
- `fix: resolve bug in...` - Bug fixes
- `docs: update README` - Documentation changes
- `test: add tests for...` - Test additions
- `refactor: simplify...` - Code refactoring
- `chore: update dependencies` - Maintenance tasks

### PR Title

Keep PR titles concise (under 70 characters). Use the description for details.

## Issue Triage

### Bug Reports

Use the bug report template and include:
- Clear reproduction steps
- Expected vs actual behavior
- Environment details (OS, version, deployment method)
- Relevant logs

### Feature Requests

Use the feature request template and include:
- Clear use case (what problem does it solve?)
- Proposed solution (how should it work?)
- Alternatives considered

### Questions

Use the question template. Check existing issues and documentation first.

## Communication

- **GitHub Issues**: For bugs, features, and questions
- **Pull Requests**: For code contributions
- **GitHub Discussions**: For general discussion (if enabled)

Please be respectful and constructive in all interactions. See CODE_OF_CONDUCT.md for community guidelines.

## Licensing

By contributing to CXDB, you agree that your contributions will be licensed under the Apache License 2.0.

All contributions must include the Developer Certificate of Origin (DCO):

```
Developer Certificate of Origin
Version 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

To certify, add a `Signed-off-by` line to your commit messages:

```bash
git commit -s -m "feat: add new feature"
```

Or add manually:
```
feat: add new feature

Signed-off-by: Your Name <your.email@example.com>
```

## Release Process

Releases are managed by StrongDM maintainers. The process involves:

1. Update CHANGELOG.md with release notes
2. Update version numbers in Cargo.toml, go.mod (via git tag), package.json
3. Create git tag (e.g., `v0.2.0`)
4. Publish Rust crates to crates.io
5. Publish release on GitHub with changelog

## Getting Help

- Read the [documentation](docs/)
- Check existing [issues](https://github.com/strongdm/cxdb/issues)
- Ask a question using the question issue template

## Thank You!

Your contributions help make CXDB better for everyone. We appreciate your time and effort!
