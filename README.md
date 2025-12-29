# Nyx: End-to-End Encrypted Messaging Platform

Nyx is a next-generation, end-to-end encrypted messaging platform. It is designed for privacy, security, and future peer-to-peer (P2P) support. The project uses Diffie-Hellman encryption for messages and files, removes metadata from files, and anonymizes all binaries. The architecture is modular, supporting web, server, and CLI clients, with a roadmap for WASM-based anonymization and advanced P2P features.

## Project Overview

- **End-to-end encrypted messaging**: All messages and files are encrypted using Diffie-Hellman key exchange.
- **Metadata removal**: Files shared through the platform are stripped of metadata for privacy.
- **Anonymization**: All binaries are anonymized; future releases will include advanced anonymization via Rust (WASM).
- **Peer-to-peer (P2P) support**: P2P messaging is in development (stage), with a Rust CLI as the foundation.
- **Multi-platform**: Includes a web client (React + Vite), a Node.js server, and a Rust CLI.

## Monorepo Structure

```
.
├─ apps/
│  ├─ web-client/      # React + Vite web client
│  ├─ server-node/     # Node.js (TypeScript) backend
│  └─ cli-rust/        # Rust CLI (P2P, encryption)
├─ packages/
│  └─ events/          # Shared event types
├─ scripts/            # Utility scripts (e.g., key generation)
├─ .github/workflows/  # CI/CD workflows
├─ CODE_OF_CONDUCT.md  # Contributor Covenant
├─ Cargo.toml          # Rust workspace
├─ package.json        # JS/TS monorepo
├─ pnpm-workspace.yaml # pnpm workspace config
```

## Technologies

- **Frontend**: React, Vite, Redux Toolkit, TypeScript, TailwindCSS
- **Backend**: Node.js, Express, WebSockets (ws), MongoDB, JWT, TypeScript
- **CLI**: Rust (tokio, libp2p, aes-gcm, p256, etc.)
- **Security**: Diffie-Hellman key exchange, AES-GCM encryption, metadata removal

## Features

- End-to-end encrypted chat and file sharing
- WebSocket-based real-time communication
- Peer-to-peer (P2P) architecture (in progress)
- CLI for encrypted chat and P2P (Rust, in progress)
- File metadata stripping and binary anonymization (WASM planned)
- Modular event system for extensibility

## Roadmap & Missing Features

- [ ] Implement full P2P messaging in Rust CLI
- [ ] WASM-based anonymization for files and binaries
- [ ] Automated tests (backend, frontend, CLI)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Cloudflare Workers server (future)
- [ ] End-to-end encryption for all transports
- [ ] Integration between CLI and backend
- [ ] User and developer documentation

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.x
- Rust stable (for CLI)

### Install dependencies

```sh
pnpm install
```

### Build all workspaces

```sh
pnpm build
```

### Development

- Web client: `pnpm -C apps/web-client dev`
- Server: `pnpm -C apps/server-node dev`
- CLI: `cargo run -p cli-rust`

### Key Generation

Generate server keys for Node.js backend:

```sh
pnpm run generate-server-keys
```

## Contributing

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

## License

This repository is licensed under AGPL-3.0-only. See [LICENSE](LICENSE) for details.

---

**Note:** This project is under active development. Many features (P2P, WASM anonymization, tests, Cloudflare Workers, and full end-to-end encryption) are in progress or planned. Contributions are welcome!