import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Pressable } from '@gluestack-ui/themed';
import { Text } from '@gluestack-ui/themed';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import FormScreen from '../screens/FormScreen';
import MediaUploadScreen from '../screens/MediaUploadScreen';
import GPSNavigationScreen from '../screens/GPSNavigationScreen';
import CustomDrawerContent from '../components/CustomDrawerContent';

/**
 * TODO: MODIFY - Add new screen types here when creating new screens
 * 
 * This type defines all available screens and their parameters.
 * When adding a new screen:
 * 1. Add the screen name and params to this type
 * 2. Add the screen to the Stack.Navigator below
 * 3. Add menu item to CustomDrawerContent.tsx
 */
export type RootStackParamList = {
  Home: undefined;
  Details: { itemId?: string };  // TODO: MODIFY - Add more params if needed
  Form: undefined;
  MediaUpload: undefined;
  GPSNavigation: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

function StackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
        // TODO: MODIFY - Customize header styling here
        // Current: Purple header with white text
        headerStyle: {
          backgroundColor: '#6200ee',  // TODO: MODIFY - Change header color
        },
        headerTintColor: '#fff',  // TODO: MODIFY - Change header text color
        headerTitleStyle: {
          fontWeight: 'bold',  // TODO: MODIFY - Change header font weight
        },
        headerLeft: () => (
          <Pressable
            onPress={() => navigation.openDrawer()}
            px="$4"
            py="$2"
            _pressed={{ opacity: 0.7 }}
          >
            <Text color="$white" fontSize="$xl" fontWeight="$bold">
              ☰
            </Text>
          </Pressable>
        ),
      })}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
      <Stack.Screen 
        name="Details" 
        component={DetailsScreen}
        options={{ title: 'Details' }}
      />
      <Stack.Screen 
        name="Form" 
        component={FormScreen}
        options={{ title: 'Form' }}
      />
      <Stack.Screen 
        name="MediaUpload" 
        component={MediaUploadScreen}
        options={{ title: 'Media Upload' }}
      />
      <Stack.Screen 
        name="GPSNavigation" 
        component={GPSNavigationScreen}
        options={{ title: 'GPS Navigation' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Drawer.Navigator
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          // TODO: MODIFY - Customize drawer behavior
          drawerType: 'front',  // Options: 'front' | 'back' | 'slide' | 'permanent'
          drawerStyle: {
            width: 280,  // TODO: MODIFY - Adjust drawer width (default: 280px)
          },
          headerShown: false,  // TODO: MODIFY - Set to true if you want drawer header
        }}
      >
        <Drawer.Screen 
          name="MainStack" 
          component={StackNavigator}
          options={{ drawerLabel: 'Main' }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}

