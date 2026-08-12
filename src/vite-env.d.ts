/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLEARSPACE_CONTRACT_ADDRESS?: `0x${string}`
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
