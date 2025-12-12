# HASHD Frontend

A decentralized social protocol built on MegaETH with end-to-end encrypted messaging, token-gated guilds, and NFT marketplaces.

**⚠️ WORK IN PROGRESS**: This codebase is under active development and should not be considered final or production-ready. Some areas may not yet align with our core decentralization philosophy or may contain ambiguous implementations that are being refined.

**Current Status**:
- Contracts are not yet deployed publicly - the app will not function until final deployment
- We are actively extracting dependencies to eliminate mandatory reliance on backend systems
- References to our relayer/API are temporary: they currently handle waitlist management and analytics, with the relayer serving as an optional IPFS pinning helper
- Private key storage policy is not yet fully implemented - current key management is temporary
- Code patterns and architectural decisions are subject to change as we align with our decentralization principles 

## Tech Stack

- **React** 18 with TypeScript
- **Ethers.js** v6 for blockchain interaction
- **TailwindCSS** for styling
- **React Router** for navigation
- **Zustand** for state management

## Prerequisites

- Node.js 16+
- Yarn package manager
- MetaMask or compatible Web3 wallet

## Installation

```bash
# Install dependencies
yarn install
```

## Environment Setup

Create a `.env.local` file in the `web` directory:

```env
# Storage Contracts (Eternal - Never upgrade)
REACT_APP_MESSAGE_STORAGE=0x...
REACT_APP_KEY_STORAGE=0x...
REACT_APP_ACCOUNT_STORAGE=0x...
REACT_APP_POST_STORAGE=0x...
REACT_APP_USER_PROFILE_STORAGE=0x...
REACT_APP_GROUP_FACTORY_STORAGE=0x...

# Logic Contracts (Upgradeable initially)
REACT_APP_KEY_REGISTRY=0x...
REACT_APP_ACCOUNT_REGISTRY=0x...
REACT_APP_HASHD_TAG=0x...
REACT_APP_MESSAGE_CONTRACT=0x...
REACT_APP_USER_PROFILE=0x...
REACT_APP_GROUP_POSTS_DEPLOYER=0x...
REACT_APP_GROUP_COMMENTS_DEPLOYER=0x...
REACT_APP_BONDING_CURVE_DEPLOYER=0x...
REACT_APP_GROUP_FACTORY=0x...

# Deployment Verification
REACT_APP_DEPLOYMENT_REGISTRY=0x...

# Network Configuration
REACT_APP_CHAIN_ID=31337
REACT_APP_RPC_URL=http://127.0.0.1:8545
REACT_APP_EXPLORER_URL=http://localhost:8545
REACT_APP_THIRDWEB_CLIENT_ID=

# IPFS Configuration
REACT_APP_IPFS_GATEWAY=https://3oh.myfilebase.com/ipfs
REACT_APP_RELAYER_URL=http://localhost:3001

# Waitlist Mode
REACT_APP_WAITLIST_MODE=true
REACT_APP_API_URL=http://localhost:3002

# Admin Configuration (for admin based signing functions)
REACT_APP_ADMIN_WALLET=
```

## Development

```bash
# Start development server
yarn start

# Build for production
yarn build

# Run tests
yarn test
```

## Project Structure

```
web/
├── public/           # Static assets
├── src/
│   ├── components/   # React components
│   ├── pages/        # Page components
│   ├── services/     # IPFS, encryption services
│   ├── store/        # Zustand state management
│   ├── styles/       # CSS and theme files
│   └── utils/        # Contract ABIs, helpers
└── package.json
```

## Key Features

- **Encrypted Messaging**: End-to-end encrypted DMs
- **Guilds**: Token-gated communities with posts and comments
- **NFT Marketplaces**: Create and trade guild NFTs
- **HashIDs**: Mint unique on-chain identifiers
- **Zero Backend**: Pure client + blockchain + IPFS

## Design System

See `STYLE_GUIDE.md` for typography, colors, and component standards.

## Deployment

```bash
# Build production bundle
yarn build

# Deploy to hosting service
# (Vercel, Netlify, etc.)
```

## License

MIT

## Links

- [Website](https://hashd.social)
- [Twitter](https://x.com/hashdsocial)
- [Telegram](https://t.me/hashdsocial)
