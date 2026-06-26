/**
 * Roles de la app móvil alineados con `primaryRole` / `profileTypes` del API auth.
 */
import type { AuthUser } from '../services/authApi';

/** Rol principal de producto (tres tipos + superuser como capa admin). */
export type AppPrimaryRole = 'user' | 'influencer' | 'business';

export type AppEffectiveRole = AppPrimaryRole | 'superuser';

export type AuthPermission =
  | 'home'
  | 'wallet'
  | 'kyc'
  | 'kyb'
  | 'upload_promotions'
  | 'influencer_dashboard'
  | 'influencer_monetization'
  | 'influencers_feed'
  | 'promotions_map'
  | 'admin_crm'
  | 'admin_moderation'
  | 'settings';

const ROLE_PERMISSIONS: Record<AppEffectiveRole, ReadonlySet<AuthPermission>> = {
  user: new Set([
    'home',
    'wallet',
    'kyc',
    'influencers_feed',
    'promotions_map',
    'settings',
  ]),
  influencer: new Set([
    'home',
    'wallet',
    'kyc',
    'influencer_dashboard',
    'influencer_monetization',
    'influencers_feed',
    'promotions_map',
    'settings',
  ]),
  business: new Set([
    'home',
    'wallet',
    'kyb',
    'upload_promotions',
    'promotions_map',
    'settings',
  ]),
  superuser: new Set([
    'home',
    'wallet',
    'kyc',
    'kyb',
    'upload_promotions',
    'influencer_dashboard',
    'influencer_monetization',
    'influencers_feed',
    'promotions_map',
    'admin_crm',
    'admin_moderation',
    'settings',
  ]),
};

const SUPERUSER_MARKERS = new Set([
  'superuser',
  'super_admin',
  'superadmin',
  'admin',
  'crm_admin',
]);

const BUSINESS_MARKERS = new Set(['business', 'merchant', 'brand', 'store', 'negocio']);

const INFLUENCER_MARKERS = new Set(['influencer', 'creator', 'creador']);

function normalizeToken(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function collectProfileTypes(user: AuthUser): string[] {
  const raw = user.profileTypes;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeToken).filter(Boolean);
}

export function isSuperuserUser(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.isSuperuser === true || user.superuser === true) return true;
  const role = normalizeToken(user.primaryRole);
  if (SUPERUSER_MARKERS.has(role)) return true;
  const types = collectProfileTypes(user);
  return types.some((t) => SUPERUSER_MARKERS.has(t));
}

export function resolvePrimaryRole(user: AuthUser | null | undefined): AppPrimaryRole {
  if (!user) return 'user';
  const role = normalizeToken(user.primaryRole);
  if (BUSINESS_MARKERS.has(role)) return 'business';
  if (INFLUENCER_MARKERS.has(role)) return 'influencer';
  const types = collectProfileTypes(user);
  if (types.some((t) => BUSINESS_MARKERS.has(t))) return 'business';
  if (types.some((t) => INFLUENCER_MARKERS.has(t))) return 'influencer';
  return 'user';
}

export function resolveEffectiveRole(user: AuthUser | null | undefined): AppEffectiveRole {
  if (isSuperuserUser(user)) return 'superuser';
  return resolvePrimaryRole(user);
}

export function roleHasPermission(
  role: AppEffectiveRole,
  permission: AuthPermission
): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function userHasPermission(
  user: AuthUser | null | undefined,
  permission: AuthPermission
): boolean {
  return roleHasPermission(resolveEffectiveRole(user), permission);
}

export function getRolePermissions(role: AppEffectiveRole): AuthPermission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function getRoleLabel(role: AppEffectiveRole, language: 'es' | 'en'): string {
  const labels: Record<AppEffectiveRole, { es: string; en: string }> = {
    user: { es: 'Usuario', en: 'User' },
    influencer: { es: 'Influencer', en: 'Influencer' },
    business: { es: 'Negocio', en: 'Business' },
    superuser: { es: 'Superusuario', en: 'Superuser' },
  };
  return labels[role][language];
}

export function getDefaultDashboardRoute(role: AppEffectiveRole): keyof import('../navigation/AppNavigator').RootStackParamList {
  switch (role) {
    case 'influencer':
      return 'InfluencerDashboard';
    case 'business':
      return 'BusinessDashboard';
    case 'superuser':
      return 'SuperuserDashboard';
    default:
      return 'UserDashboard';
  }
}
