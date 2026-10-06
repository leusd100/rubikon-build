// Vite's `?url` import: the hashed URL of an emitted asset (the layout preloads the condensed faces by it)
declare module '*.woff2?url' {
  const href: string;
  export default href;
}
