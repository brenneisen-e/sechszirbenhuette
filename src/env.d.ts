// Extend CloudflareEnv to include our custom bindings
declare global {
  interface CloudflareEnv {
    // D1 Database Binding
    DB: D1Database;

    // R2 Bucket Bindings
    R2: R2Bucket;
    IMAGES_BUCKET: R2Bucket;

    // KV Namespace Binding
    KV: KVNamespace;

    // AI Binding
    AI: Ai;

    // Environment variables
    ENVIRONMENT?: string;
    PUBLIC_R2_URL?: string;
    ADMIN_PASSWORD?: string;
    ADMIN_PWD?: string;
  }
}

export {};
