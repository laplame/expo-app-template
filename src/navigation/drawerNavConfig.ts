import type { RootStackParamList } from '../navigation/AppNavigator';
import type { AuthPermission } from '../types/authRoles';

export type DrawerNavItem = {
  id: string;
  titleEn: string;
  titleEs: string;
  screen: keyof RootStackParamList;
  params?: RootStackParamList[keyof RootStackParamList];
  icon?: string;
  /** Permiso requerido; omitir = visible para todos (incl. invitados). */
  permission?: AuthPermission;
  /** Si true, solo visible con sesión JWT. */
  requiresAuth?: boolean;
};

export const DRAWER_NAV_ITEMS: DrawerNavItem[] = [
  { id: 'dash-user', titleEn: 'User panel', titleEs: 'Panel usuario', screen: 'UserDashboard', icon: '👤', permission: 'home' },
  { id: '1', titleEn: 'Home', titleEs: 'Inicio', screen: 'Home', icon: '🏠', permission: 'home' },
  { id: '1b', titleEn: 'Coupons', titleEs: 'Cupones', screen: 'Home', params: { scrollToPromotions: true }, icon: '🎟️', permission: 'home' },
  { id: '2', titleEn: 'Mall & Order', titleEs: 'Tienda · Pedir', screen: 'MallOrder', icon: '🛒', permission: 'home' },
  { id: '3', titleEn: 'Wallet', titleEs: 'Billetera', screen: 'Wallet', icon: '💳', permission: 'wallet' },
  { id: '4', titleEn: 'Defi.Deal', titleEs: 'Defi.Deal', screen: 'DefiDeal', icon: '📖', permission: 'home' },
  { id: '5', titleEn: 'Promotions map', titleEs: 'Mapa de promociones', screen: 'PromotionsMap', icon: '🗺️', permission: 'promotions_map' },
  { id: '6', titleEn: 'NYC (Know Your Client)', titleEs: 'NYC (Conoce a tu cliente)', screen: 'NYC', icon: '🆔', permission: 'kyc' },
  { id: '7', titleEn: 'Upload promotion', titleEs: 'Subir promoción', screen: 'UploadPromotions', icon: '📤', permission: 'upload_promotions' },
  { id: '8', titleEn: 'Influencers & Vote', titleEs: 'Influencers y votar', screen: 'InfluencersList', icon: '⭐', permission: 'influencers_feed' },
  {
    id: '8inf',
    titleEn: 'Influencer panel',
    titleEs: 'Panel influencer',
    screen: 'InfluencerDashboard',
    icon: '🎬',
    permission: 'influencer_dashboard',
  },
  {
    id: '8biz',
    titleEn: 'Business panel',
    titleEs: 'Panel negocio',
    screen: 'BusinessDashboard',
    icon: '🏪',
    permission: 'upload_promotions',
  },
  {
    id: '8admin',
    titleEn: 'Superuser panel',
    titleEs: 'Panel superusuario',
    screen: 'SuperuserDashboard',
    icon: '🛡️',
    permission: 'admin_crm',
  },
  {
    id: '8b',
    titleEn: 'Monetization',
    titleEs: 'Monetización',
    screen: 'Monetization',
    icon: '💰',
    permission: 'influencer_monetization',
  },
  { id: '8p2p', titleEn: 'Social Layer', titleEs: 'Social Layer', screen: 'NetworkP2P', icon: '📡', permission: 'home' },
  { id: 'login', titleEn: 'Sign in', titleEs: 'Iniciar sesión', screen: 'Login', icon: '🔐' },
  { id: '9', titleEn: 'Settings', titleEs: 'Configuración', screen: 'Settings', icon: '⚙️', permission: 'settings' },
];

export function filterDrawerItems(
  items: DrawerNavItem[],
  opts: {
    hasPermission: (p: AuthPermission) => boolean;
    isAuthenticated: boolean;
  }
): DrawerNavItem[] {
  return items.filter((item) => {
    if (item.id === 'login') return !opts.isAuthenticated;
    if (item.requiresAuth && !opts.isAuthenticated) return false;
    if (item.permission && !opts.hasPermission(item.permission)) return false;
    return true;
  });
}
