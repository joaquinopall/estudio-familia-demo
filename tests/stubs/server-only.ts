// Vitest runs outside the React Server environment, where the real `server-only`
// package throws on import. This empty module replaces it in tests only.
export {};
