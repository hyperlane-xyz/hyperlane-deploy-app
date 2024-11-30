# WORK IN PROGRESS: Hyperlane Deploy App

A web app for deploying Hyperlane contracts and applications, such as [Warp Routes](https://docs.hyperlane.xyz/docs/reference/applications/warp-routes).

## Architecture

This app is built with Next & React, Wagmi, RainbowKit, and the Hyperlane SDK.

- Constants that you may want to change are in `./src/consts/`
- The index page is located at `./src/pages/index.tsx`
- The primary features are implemented in `./src/features/`

## Development

### Setup

#### Configure

You need a `projectId` from the WalletConnect Cloud to run the Hyperlane Warp Route UI. Sign up to [WalletConnect Cloud](https://cloud.walletconnect.com) to create a new project.

#### Build

```sh
# Install dependencies
yarn

# Build Next project
yarn build
```

### Run

You can add `.env.local` file next to `.env.example` where you set `projectId` copied from WalletConnect Cloud.

```sh
# Start the Next dev server
yarn dev
```

### Test

```sh
# Lint check code
yarn lint

# Check code types
yarn typecheck
```

### Format

```sh
# Format code using Prettier
yarn prettier
```

### Clean / Reset

```sh
# Delete build artifacts to start fresh 
yarn clean
```

## Learn more

For more information, see the [Hyperlane documentation](https://docs.hyperlane.xyz).
