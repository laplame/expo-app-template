import React, { useMemo } from 'react';
import { Box, Text, VStack, Pressable, HStack } from '@gluestack-ui/themed';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { RootStackParamList } from '../navigation/AppNavigator';
import { DRAWER_NAV_ITEMS, filterDrawerItems } from '../navigation/drawerNavConfig';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { appVersion, appBuild, appTimestamp } from '../version';
import AppMenuBackground from './AppMenuBackground';
import { getAppTheme } from '../theme/appThemes';
import { getRoleLabel } from '../types/authRoles';

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { language, appTheme } = useSettings();
  const { hasPermission, status, effectiveRole, user } = useAuth();
  const themeDef = getAppTheme(appTheme);
  const appName = language === 'es' ? 'damecodigo' : 'link4deal';
  const menuTitle = language === 'es' ? 'Menú' : 'Menu';

  const drawerItems = useMemo(
    () =>
      filterDrawerItems(DRAWER_NAV_ITEMS, {
        hasPermission,
        isAuthenticated: status === 'authenticated',
      }),
    [hasPermission, status]
  );

  const handleNavigation = (screen: keyof RootStackParamList, params?: unknown) => {
    props.navigation.closeDrawer();
    (props.navigation as { navigate: (a: string, b?: object) => void }).navigate('MainStack', {
      screen,
      params,
    });
  };

  const activeRoute =
    (props.state?.routes[props.state?.index || 0]?.state as { routes?: { name: string }[]; index?: number })
      ?.routes?.[
      (props.state?.routes[props.state?.index || 0]?.state as { index?: number })?.index || 0
    ]?.name || 'Home';

  const sessionLabel =
    status === 'authenticated'
      ? `${user?.email ?? user?.displayName ?? '—'} · ${getRoleLabel(effectiveRole, language)}`
      : language === 'es'
        ? 'Sin sesión'
        : 'Not signed in';

  return (
    <Box flex={1}>
      <Box bg={themeDef.brand} pt="$12" pb="$4" px="$4">
        <VStack space="xs">
          <Text fontSize="$3xl" fontWeight="$bold" color="$white">
            {appName.toUpperCase()}
          </Text>
          <Text fontSize="$sm" color="$white" opacity={0.9}>
            {menuTitle}
          </Text>
          <Text fontSize="$2xs" color="$white" opacity={0.75} mt="$1">
            {sessionLabel}
          </Text>
        </VStack>
      </Box>

      <AppMenuBackground overlayOpacity={0.82}>
        <DrawerContentScrollView
          {...props}
          style={{ backgroundColor: 'transparent' }}
          contentContainerStyle={{ paddingTop: 0, flexGrow: 1 }}
        >
          <VStack space="sm" px="$4" py="$2" flex={1}>
            {drawerItems.map((item) => {
              const isActive = activeRoute === item.screen;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => handleNavigation(item.screen, item.params)}
                  $pressed={{ bg: 'rgba(0, 112, 74, 0.12)' }}
                  borderRadius="$md"
                  borderWidth={isActive ? 2 : 0}
                  borderColor={themeDef.brand}
                  bg={isActive ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.55)'}
                >
                  <HStack space="md" alignItems="center" px="$4" py="$3" borderRadius="$md">
                    {item.icon ? <Text fontSize="$xl">{item.icon}</Text> : null}
                    <Text
                      fontSize="$md"
                      color={isActive ? themeDef.brand : '$textLight900'}
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

        <Box px="$4" py="$3" borderTopWidth={1} borderTopColor="rgba(0,0,0,0.08)" bg="rgba(255,255,255,0.92)">
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
      </AppMenuBackground>
    </Box>
  );
}
