declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PRIVY_APP_ID?: string;
  readonly VITE_PRIVY_CLIENT_ID?: string;
  readonly VITE_VERENT_RENTALS_PROGRAM_ID?: string;
  readonly VITE_VERENT_USDC_MINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
