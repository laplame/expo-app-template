# Navigation Feature Documentation

## Overview
The Navigation feature provides a drawer-based navigation system for easy access to all application screens.

## Component: CustomDrawerContent

### Location
`src/components/CustomDrawerContent.tsx`

### Description
Custom drawer menu component built with gluestack-ui that provides navigation to all screens in the application.

## Features

### Drawer Menu
- **Slide-in Animation**: Smooth slide-in from the left
- **Menu Items**: Easy access to all screens:
  - 🏠 Home
  - 📄 Details
  - 📝 Form
  - 📷 Media Upload
  - 📍 GPS Navigation
- **Icons**: Visual icons for each menu item
- **Auto-close**: Drawer closes automatically after navigation

### Navigation Structure
- **Drawer Navigator**: Root navigator wrapping the stack
- **Stack Navigator**: Contains all application screens
- **Nested Navigation**: Proper handling of nested navigation structure

## Navigation Setup

### AppNavigator
Location: `src/navigation/AppNavigator.tsx`

#### Stack Screens
- `Home` - Home screen
- `Details` - Details screen with optional itemId parameter
- `Form` - Form screen
- `MediaUpload` - Media upload screen
- `GPSNavigation` - GPS navigation screen

#### Drawer Configuration
- Width: 280px
- Type: Front drawer (slides over content)
- Custom content: CustomDrawerContent component

### Header Integration
- Hamburger menu button (☰) in all screen headers
- Opens drawer when clicked
- Consistent styling across all screens

## Usage

### Opening Drawer
1. Click the hamburger menu button (☰) in any screen header
2. Or swipe from the left edge of the screen

### Navigating
1. Open the drawer menu
2. Click on any menu item
3. Drawer closes automatically
4. Navigate to selected screen

### Programmatic Navigation
```typescript
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const navigation = useNavigation<NavigationProp>();

// Navigate to a screen
navigation.navigate('Form');

// Navigate with parameters
navigation.navigate('Details', { itemId: '123' });
```

## Dependencies
- `@react-navigation/native` - Core navigation library
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/drawer` - Drawer navigator
- `react-native-drawer-layout` - Drawer layout implementation
- `react-native-gesture-handler` - Gesture handling
- `react-native-safe-area-context` - Safe area handling

## Testing
See `features/navigation.feature` for Gherkin test scenarios.

## Customization

### Adding New Menu Items
1. Add screen to `RootStackParamList` in `AppNavigator.tsx`
2. Add screen to Stack Navigator
3. Add menu item to `drawerItems` array in `CustomDrawerContent.tsx`

Example:
```typescript
// In AppNavigator.tsx
export type RootStackParamList = {
  // ... existing screens
  NewScreen: undefined;
};

// In CustomDrawerContent.tsx
const drawerItems: DrawerItem[] = [
  // ... existing items
  { id: '6', title: 'New Screen', screen: 'NewScreen', icon: '⭐' },
];
```

### Styling
The drawer uses gluestack-ui tokens for consistent theming:
- Background: `$backgroundLight0`
- Text: `$textLight900`
- Pressed state: `$backgroundLight100`

