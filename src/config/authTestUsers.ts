/**
 * Usuarios de prueba para verificación de roles en desarrollo.
 * Activar con EXPO_PUBLIC_AUTH_DEV_MODE=true
 */
import type { AuthUser } from '../services/authApi';
import type { AppPrimaryRole } from '../types/authRoles';

export interface AuthTestUser {
  id: string;
  email: string;
  password: string;
  displayName: string;
  primaryRole: AppPrimaryRole;
  /** Si true, el usuario tiene permisos de superuser además de su rol base. */
  isSuperuser?: boolean;
  profileTypes?: string[];
  notes: { es: string; en: string };
}

export const AUTH_TEST_USERS: AuthTestUser[] = [
  {
    id: 'test-user-consumer-001',
    email: 'test.user@damecodigo.dev',
    password: 'TestUser2026!',
    displayName: 'Usuario Demo',
    primaryRole: 'user',
    profileTypes: ['user'],
    notes: {
      es: 'Consumidor: cupones, wallet, KYC. Sin panel influencer ni subir promociones.',
      en: 'Consumer: coupons, wallet, KYC. No influencer panel or upload promotions.',
    },
  },
  {
    id: 'test-influencer-001',
    email: 'test.influencer@damecodigo.dev',
    password: 'TestInfluencer2026!',
    displayName: 'Influencer Demo',
    primaryRole: 'influencer',
    profileTypes: ['influencer'],
    notes: {
      es: 'Creador: panel monetización, campañas, story cards, abonos (requiere perfil vinculado en API).',
      en: 'Creator: monetization panel, campaigns, story cards, settlements (requires linked API profile).',
    },
  },
  {
    id: 'test-business-001',
    email: 'test.business@damecodigo.dev',
    password: 'TestBusiness2026!',
    displayName: 'Negocio Demo',
    primaryRole: 'business',
    profileTypes: ['business', 'merchant'],
    notes: {
      es: 'Negocio: KYB, subir promociones sin deal, mapa. Sin panel influencer.',
      en: 'Business: KYB, upload no-deal promotions, map. No influencer panel.',
    },
  },
  {
    id: 'test-superuser-001',
    email: 'test.superuser@damecodigo.dev',
    password: 'TestSuper2026!',
    displayName: 'Super Admin Demo',
    primaryRole: 'user',
    isSuperuser: true,
    profileTypes: ['superuser', 'admin'],
    notes: {
      es: 'Superusuario: acceso CRM web + todos los dashboards y permisos de la app.',
      en: 'Superuser: web CRM access + all app dashboards and permissions.',
    },
  },
];

export function isAuthDevModeEnabled(): boolean {
  return process.env.EXPO_PUBLIC_AUTH_DEV_MODE === 'true';
}

export function findTestUserByLogin(login: string, password: string): AuthTestUser | null {
  const normalized = login.trim().toLowerCase();
  return (
    AUTH_TEST_USERS.find(
      (u) =>
        u.password === password &&
        (u.email.toLowerCase() === normalized || u.id.toLowerCase() === normalized)
    ) ?? null
  );
}

export function testUserToAuthUser(test: AuthTestUser): AuthUser {
  return {
    id: test.id,
    email: test.email,
    displayName: test.displayName,
    primaryRole: test.isSuperuser ? 'superuser' : test.primaryRole,
    profileTypes: test.profileTypes,
    isSuperuser: test.isSuperuser === true,
  };
}

export function devTokenForTestUser(test: AuthTestUser): string {
  return `dev.${test.id}.${Date.now()}`;
}
