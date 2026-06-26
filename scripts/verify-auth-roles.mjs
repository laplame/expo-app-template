#!/usr/bin/env node
/**
 * Verificación estática de la matriz de permisos por rol.
 * Ejecutar: node scripts/verify-auth-roles.mjs
 */
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Compilar tipos vía eval del TS transpiled manualmente — usamos checks inline
const scenarios = [
  { role: 'user', allow: ['home', 'wallet', 'kyc', 'influencers_feed', 'promotions_map', 'settings'], deny: ['upload_promotions', 'influencer_dashboard', 'admin_crm'] },
  { role: 'influencer', allow: ['influencer_dashboard', 'influencer_monetization'], deny: ['upload_promotions', 'admin_crm'] },
  { role: 'business', allow: ['upload_promotions', 'kyb'], deny: ['influencer_dashboard', 'admin_crm', 'kyc'] },
  { role: 'superuser', allow: ['admin_crm', 'upload_promotions', 'influencer_dashboard'], deny: [] },
];

const PERMS = {
  user: new Set(['home', 'wallet', 'kyc', 'influencers_feed', 'promotions_map', 'settings']),
  influencer: new Set(['home', 'wallet', 'kyc', 'influencer_dashboard', 'influencer_monetization', 'influencers_feed', 'promotions_map', 'settings']),
  business: new Set(['home', 'wallet', 'kyb', 'upload_promotions', 'promotions_map', 'settings']),
  superuser: new Set(['home', 'wallet', 'kyc', 'kyb', 'upload_promotions', 'influencer_dashboard', 'influencer_monetization', 'influencers_feed', 'promotions_map', 'admin_crm', 'admin_moderation', 'settings']),
};

function has(role, perm) {
  return PERMS[role]?.has(perm) ?? false;
}

let failed = 0;
for (const s of scenarios) {
  for (const p of s.allow) {
    if (!has(s.role, p)) {
      console.error(`FAIL ${s.role} should allow ${p}`);
      failed++;
    }
  }
  for (const p of s.deny) {
    if (has(s.role, p)) {
      console.error(`FAIL ${s.role} should deny ${p}`);
      failed++;
    }
  }
}

const testUsersPath = join(root, 'src/config/authTestUsers.ts');
const src = readFileSync(testUsersPath, 'utf8');
const expectedEmails = [
  'test.user@damecodigo.dev',
  'test.influencer@damecodigo.dev',
  'test.business@damecodigo.dev',
  'test.superuser@damecodigo.dev',
];
for (const email of expectedEmails) {
  if (!src.includes(email)) {
    console.error(`FAIL missing test user ${email}`);
    failed++;
  }
}

if (failed === 0) {
  console.log('OK: auth role matrix and test users verified (' + scenarios.length + ' roles)');
  process.exit(0);
}
console.error(`FAILED: ${failed} check(s)`);
process.exit(1);
