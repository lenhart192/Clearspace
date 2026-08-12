# Clearspace deployment

## Remix

1. Create `Clearspace.sol` and paste `contracts/Clearspace.sol`.
2. Compile with Solidity `0.8.24`, optimizer enabled with 200 runs.
3. In Deploy & Run choose **Injected Provider - MetaMask**.
4. Switch the wallet to Base Mainnet (`8453`).
5. Deploy with no constructor arguments and verify on BaseScan.

## Frontend

Add the deployed contract to `deployedAddress` in `src/config/contract.ts`.

Add the Base App meta tag inside `<head>` in `index.html`.

Add the Builder Code to `BUILDER_CODE` in `src/config/wagmi.ts`.

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Node version: `20`
