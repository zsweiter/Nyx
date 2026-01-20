# 🜂 Nyx — End-to-End Encrypted Messaging Platform

**Nyx** is a next-generation, privacy-first messaging platform focused on **end-to-end encryption**, **minimal metadata exposure**, and a **future-proof P2P architecture**.

The project is designed as a **modular monorepo**, supporting a web client, a Node.js backend, and a Rust-based CLI. Nyx is currently under active development, with peer-to-peer messaging and WASM-based anonymization planned in upcoming releases.

> ⚠️ **Security Notice**
> Nyx is experimental software. Cryptographic designs and implementations have not yet been formally audited. Do not use in production or for high-risk threat models.

---

## ✨ Core Principles

- **End-to-end encryption by default**
  Messages and files are encrypted using Diffie-Hellman key exchange and modern symmetric cryptography.

- **Metadata minimization**
  Shared files are stripped of embedded metadata to reduce information leakage.

- **Anonymization-ready architecture**
  Binary and file anonymization is supported, with advanced WASM-based tooling planned (Rust).

- **P2P-first roadmap**
  Centralized services are transitional. Native P2P communication is a primary long-term goal.

- **Modular & extensible**
  Shared event definitions and decoupled services enable multiple clients and transports.

---

## 🗂 Monorepo Structure

```
.
├─ certs/              # TLS certificates (development only)
├─ apps/
│  ├─ web-client/      # React + Vite web application
│  ├─ server-node/     # Node.js (TypeScript) backend
│  └─ cli-rust/        # Rust CLI (encryption & P2P groundwork)
├─ packages/
│  └─ events/          # Shared event and protocol definitions
├─ scripts/            # Utility scripts (keys, certificates, tooling)
├─ .github/workflows/  # CI/CD pipelines
├─ Cargo.toml          # Rust workspace configuration
├─ package.json        # JavaScript/TypeScript monorepo config
├─ pnpm-workspace.yaml # pnpm workspace definition
├─ CODE_OF_CONDUCT.md
└─ LICENSE
```

---

## 🧰 Technology Stack

### Frontend

- React
- Vite
- Redux Toolkit
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express (planned future integration with fastify)
- WebSockets
- MongoDB
- Jose (JSON Web Tokens)
- TypeScript

### CLI / P2P

- Rust
- tokio
- libp2p (planned / in progress)
- aes-gcm
- p256

### Cryptography & Privacy

- Diffie-Hellman key exchange
- AES-GCM symmetric encryption
- File metadata stripping
- Planned WASM-based anonymization

---

## 🚀 Features

- End-to-end encrypted messaging
- Encrypted file sharing
- Real-time communication via WebSockets
- Modular event-driven architecture
- Rust CLI for encrypted messaging (early stage)
- P2P communication groundwork (in progress)

---

## 🛣 Roadmap

> The following features are **planned or partially implemented**:

- [ ] Fully decentralized P2P messaging (Rust + libp2p)
- [ ] WASM-based anonymization pipeline
- [ ] Cryptographic audit & threat model documentation
- [ ] Automated tests (backend, frontend, CLI)
- [ ] OpenAPI / Swagger API documentation
- [ ] Cloudflare Workers edge backend (optional path)
- [ ] Transport-agnostic end-to-end encryption
- [ ] CLI ↔ backend interoperability
- [ ] User & developer documentation

---

## 🧑‍💻 Getting Started

### Prerequisites

- Node.js **20+**
- pnpm **9.x**
- Rust (stable toolchain)

---

### Install Dependencies

```sh
pnpm install
```

---

### Build All Workspaces

```sh
pnpm build
```

---

## 🔐 Development Setup

### Server Key Generation

Generate cryptographic keys for the Node.js backend:

```sh
pnpm run generate-server-keys
```

---

### TLS Certificates (Local HTTPS)

Nyx uses HTTPS locally.
Certificates are generated using **mkcert**.

1. Install mkcert
   👉 [https://github.com/FiloSottile/mkcert](https://github.com/FiloSottile/mkcert)

2. Generate certificates:

```sh
pnpm run generate-ssl-certificates
```

> Certificates are for **local development only** and must not be committed.

---

### Run Development Servers

- **Web client**

    ```sh
    pnpm -C apps/web-client dev
    ```

- **Backend server**

    ```sh
    pnpm -C apps/server-node dev
    ```

- **Rust CLI**

    ```sh
    cargo run -p cli-rust
    ```

---

## 🤝 Contributing

Contributions are welcome.

Please read the [Code of Conduct](CODE_OF_CONDUCT.md) before submitting issues or pull requests.

If you are contributing cryptographic or P2P-related code, include:

- clear documentation
- threat assumptions
- rationale for algorithm choices

---

## 📄 License

Nyx is licensed under **AGPL-3.0-only**.
See the [LICENSE](LICENSE) file for details.

---

## 🧪 Project Status

> 🚧 **Active development / Experimental**

Nyx is evolving rapidly. APIs, cryptographic internals, and transport layers may change without notice.
