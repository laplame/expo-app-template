/**
 * ⚠️ DEPRECATED COMPONENT - CAN BE DELETED
 * 
 * This component has been replaced by CustomDrawerContent.tsx
 * The drawer menu provides better UX and is now the standard navigation method.
 * 
 * TODO: Remove this file if not needed for reference
 * - No longer used in any screens
 * - Replaced by: src/components/CustomDrawerContent.tsx
 * - Last used: Before drawer navigation implementation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface MenuItem {
  id: string;
  title: string;
  screen: keyof RootStackParamList;
  params?: any;
}

interface CollapsibleMenuProps {
  items: MenuItem[];
}

export default function CollapsibleMenu({ items }: CollapsibleMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigation = useNavigation<NavigationProp>();
  const [rotateValue] = useState(new Animated.Value(0));

  const toggleMenu = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);

    Animated.timing(rotateValue, {
      toValue: isExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleMenuItemPress = (screen: keyof RootStackParamList, params?: any) => {
    navigation.navigate(screen, params);
    setIsExpanded(false);
    Animated.timing(rotateValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
        <Text style={styles.menuButtonText}>☰ Menu</Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Text style={styles.arrow}>▼</Text>
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.menuItems}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item.screen, item.params)}
            >
              <Text style={styles.menuItemText}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginHorizontal: 20,
  },
  menuButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  arrow: {
    color: '#fff',
    fontSize: 14,
  },
  menuItems: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 5,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  menuItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});

