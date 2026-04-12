import React from 'react';
import { Box, Text, VStack, Pressable, HStack } from '@gluestack-ui/themed';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useSettings } from '../context/SettingsContext';
import { appVersion, appBuild, appTimestamp } from '../version';

interface DrawerItem {
  id: string;
  titleEn: string;
  titleEs: string;
  screen: keyof RootStackParamList;
  params?: any;
  icon?: string;
}

const drawerItems: DrawerItem[] = [
  { id: '1', titleEn: 'Home', titleEs: 'Inicio', screen: 'Home', icon: '🏠' },
  { id: '1b', titleEn: 'Coupons', titleEs: 'Cupones', screen: 'Home', params: { scrollToPromotions: true }, icon: '🎟️' },
  { id: '2', titleEn: 'Mall & Order', titleEs: 'Tienda · Pedir', screen: 'MallOrder', icon: '🛒' },
  { id: '3', titleEn: 'Wallet', titleEs: 'Billetera', screen: 'Wallet', icon: '💳' },
  { id: '4', titleEn: 'Defi.Deal', titleEs: 'Defi.Deal', screen: 'DefiDeal', icon: '📖' },
  { id: '5', titleEn: 'Promotions map', titleEs: 'Mapa de promociones', screen: 'PromotionsMap', icon: '🗺️' },
  { id: '6', titleEn: 'NYC (Know Your Client)', titleEs: 'NYC (Conoce a tu cliente)', screen: 'NYC', icon: '👤' },
  { id: '7', titleEn: 'Upload promotion', titleEs: 'Subir promoción', screen: 'UploadPromotions', icon: '📤' },
  { id: '8', titleEn: 'Influencers & Vote', titleEs: 'Influencers y votar', screen: 'InfluencersList', icon: '⭐' },
  { id: '8p2p', titleEn: 'Network P2P (Nostr)', titleEs: 'Red P2P (Nostr)', screen: 'NetworkP2P', icon: '📡' },
  { id: '9', titleEn: 'Settings', titleEs: 'Configuración', screen: 'Settings', icon: '⚙️' },
];

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { language } = useSettings();
  const appName = language === 'es' ? 'damecodigo' : 'link4deal';
  const menuTitle = language === 'es' ? 'Menú' : 'Menu';

  const handleNavigation = (screen: keyof RootStackParamList, params?: any) => {
    // Close the drawer first
    props.navigation.closeDrawer();
    
    // Navigate to MainStack with nested screen navigation
    // Use the string-based navigation for nested screens
    (props.navigation as any).navigate('MainStack', {
      screen: screen,
      params: params,
    });
  };

  // Get current route to highlight active item
  const currentRoute = props.state?.routes[props.state?.index || 0]?.name || 'Home';
  const activeRoute = (props.state?.routes[props.state?.index || 0]?.state as any)?.routes?.[(props.state?.routes[props.state?.index || 0]?.state as any)?.index || 0]?.name || 'Home';

  return (
    <Box flex={1} bg="$white">
      {/* Green Header */}
      <Box bg="#00704A" pt="$12" pb="$4" px="$4">
        <VStack space="xs">
          <Text fontSize="$3xl" fontWeight="$bold" color="$white">
            {appName.toUpperCase()}
          </Text>
          <Text fontSize="$sm" color="$white" opacity={0.9}>
            {menuTitle}
          </Text>
        </VStack>
      </Box>

      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0, flexGrow: 1 }}>
        <VStack space="sm" px="$4" py="$2" flex={1}>
          {drawerItems.map((item) => {
            const isActive = activeRoute === item.screen;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleNavigation(item.screen, item.params)}
                _pressed={{ bg: 'rgba(0, 112, 74, 0.1)' }}
                borderRadius="$md"
                bg={isActive ? 'rgba(0, 112, 74, 0.1)' : 'transparent'}
              >
                <HStack
                  space="md"
                  alignItems="center"
                  px="$4"
                  py="$3"
                  borderRadius="$md"
                >
                  {item.icon && (
                    <Text fontSize="$xl">{item.icon}</Text>
                  )}
                  <Text 
                    fontSize="$md" 
                    color={isActive ? '#00704A' : '$textLight900'} 
                    fontWeight={isActive ? '$bold' : '$medium'}
                  >
                    {language === 'es' ? item.titleEs : item.titleEn}
                  </Text>
                </HStack>
              </Pressable>
            );
          })}
        </VStack>
      </DrawerContentScrollView>

      {/* Version fixed at bottom of drawer */}
      <Box px="$4" py="$3" borderTopWidth={1} borderTopColor="$borderLight200" bg="$white">
        <Text fontSize="$xs" color="$textLight500">
          v{appVersion} ({language === 'es' ? 'build' : 'build'} {appBuild})
        </Text>
        <Text fontSize="$xs" color="$textLight400" mt="$1">
          {new Date(appTimestamp).toLocaleString(language === 'es' ? 'es' : 'en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </Text>
      </Box>
    </Box>
  );
}

