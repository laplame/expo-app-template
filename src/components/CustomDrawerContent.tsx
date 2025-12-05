import React from 'react';
import { Box, Text, VStack, Pressable, HStack, Divider } from '@gluestack-ui/themed';
import { DrawerContentScrollView, DrawerContentComponentProps } from '@react-navigation/drawer';
import { RootStackParamList } from '../navigation/AppNavigator';

interface DrawerItem {
  id: string;
  title: string;
  screen: keyof RootStackParamList;
  params?: any;
  icon?: string;
}

/**
 * TODO: MODIFY - Add/remove menu items here
 * 
 * To add a new menu item:
 * 1. Add the screen to RootStackParamList in AppNavigator.tsx
 * 2. Add the screen to Stack.Navigator in AppNavigator.tsx
 * 3. Add the menu item here with: { id, title, screen, icon, params? }
 * 
 * To remove a menu item:
 * 1. Remove the item from this array
 * 2. Optionally remove the screen from navigation (if not used elsewhere)
 */
const drawerItems: DrawerItem[] = [
  { id: '1', title: 'Home', screen: 'Home', icon: '🏠' },
  { id: '2', title: 'Details', screen: 'Details', params: { itemId: 'drawer-item' }, icon: '📄' },
  { id: '3', title: 'Form', screen: 'Form', icon: '📝' },
  { id: '4', title: 'Media Upload', screen: 'MediaUpload', icon: '📷' },
  { id: '5', title: 'GPS Navigation', screen: 'GPSNavigation', icon: '📍' },
];

export default function CustomDrawerContent(props: DrawerContentComponentProps) {
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

  return (
    <Box flex={1} bg="$backgroundLight0">
      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 20 }}>
        <VStack space="md" px="$4" py="$2">
          <Box py="$4" px="$4">
            <Text fontSize="$2xl" fontWeight="$bold" color="$textLight900">
              Menu
            </Text>
          </Box>
          
          <Divider />

          <VStack space="sm" mt="$2">
            {drawerItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => handleNavigation(item.screen, item.params)}
                _pressed={{ bg: '$backgroundLight100' }}
                borderRadius="$md"
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
                  <Text fontSize="$md" color="$textLight900" fontWeight="$medium">
                    {item.title}
                  </Text>
                </HStack>
              </Pressable>
            ))}
          </VStack>
        </VStack>
      </DrawerContentScrollView>
    </Box>
  );
}

