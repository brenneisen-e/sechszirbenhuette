// Extend CloudflareEnv to include our custom bindings
declare global {
  interface CloudflareEnv {
    // D1 Database Binding
    DB: D1Database;

    // R2 Bucket Binding
    R2: R2Bucket;

    // KV Namespace Binding
    KV: KVNamespace;

    // Environment variables
    ENVIRONMENT?: string;
    PUBLIC_R2_URL?: string;
  }
}

export {};
