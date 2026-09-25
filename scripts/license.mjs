#!/usr/bin/env node
/**
 * Pembuat kode lisensi.
 *   npm run license            -> 1 kode
 *   npm run license -- 25      -> 25 kode
 *   npm run license -- --secret  -> buat secret acak untuk .env.local
 * Memakai LICENSE_SECRET dari .env.local / environment (harus sama dengan server).
 */
import { createHmac, randomBytes, randomInt } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const args = process.argv.slice(2);

if (args.includes("--secret")) {
  console.log(`LICENSE_SECRET=${randomBytes(32).toString("base64url")}`);
  console.log(`SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
  process.exit(0);
}

let secret = process.env.LICENSE_SECRET;
if (!secret || secret.length < 32) {
  if (process.env.NODE_ENV === "production") {
    console.error("LICENSE_SECRET belum diisi (minimal 32 karakter).");
    process.exit(1);
  }
  secret = "dev-only-LICENSE_SECRET-ganti-di-produksi-0000000000";
  console.warn("⚠  LICENSE_SECRET kosong — memakai secret DEV. Kode ini hanya berlaku di mode pengembangan.\n");
}

const count = Math.max(1, Math.min(1000, Number(args.find((a) => /^\d+$/.test(a)) ?? 1)));
for (let n = 0; n < count; n++) {
  let id = "";
  for (let i = 0; i < 12; i++) id += ALPHABET[randomInt(32)];
  const bytes = createHmac("sha256", secret).update(`license:v1:${id}`).digest();
  const sig = Array.from(bytes.subarray(0, 12), (b) => ALPHABET[b % 32]).join("");
  const key = "N3-" + (id + sig).match(/.{4}/g).join("-");
  console.log(`${key}    (ID: ${id})`);
}
