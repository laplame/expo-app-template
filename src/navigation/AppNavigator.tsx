import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Pressable, Text } from '@gluestack-ui/themed';
import { useSettings } from '../context/SettingsContext';
import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import NYCScreen from '../screens/NYCScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PromotionsMapScreen from '../screens/PromotionsMapScreen';
import UploadPromotionsScreen from '../screens/UploadPromotionsScreen';
import QuickRegisterScreen from '../screens/QuickRegisterScreen';
import DefiDealScreen from '../screens/DefiDealScreen';
import MallOrderScreen from '../screens/MallOrderScreen';
import InfluencerSearchScreen from '../screens/InfluencerSearchScreen';
import InfluencersListScreen from '../screens/InfluencersListScreen';
import CustomDrawerContent from '../components/CustomDrawerContent';
import type { InfluencerPlatform } from '../services/influencersApi';

export type RootStackParamList = {
  Home: undefined;
  Wallet: undefined;
  NYC: undefined;
  Settings: undefined;
  PromotionsMap: undefined;
  UploadPromotions: undefined;
  QuickRegister: undefined;
  DefiDeal: undefined;
  MallOrder: undefined;
  InfluencerSearch: { initialQuery?: string; platform?: InfluencerPlatform; imageUri?: string };
  InfluencersList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

function StackNavigator() {
  const { language } = useSettings();
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
        // Header styling with green theme
        headerStyle: {
          backgroundColor: '#00704A',  // Green color matching app theme
        },
        headerTintColor: '#fff',  // White text
        headerTitleStyle: {
          fontWeight: 'bold',
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
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{ title: 'Wallet' }}
      />
      <Stack.Screen 
        name="NYC" 
        component={NYCScreen}
        options={{ title: 'NYC' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="PromotionsMap" 
        component={PromotionsMapScreen}
        options={{ title: 'Coupons & Promotions' }}
      />
      <Stack.Screen 
        name="UploadPromotions" 
        component={UploadPromotionsScreen}
        options={{ title: 'Upload promotion' }}
      />
      <Stack.Screen 
        name="QuickRegister" 
        component={QuickRegisterScreen}
        options={{ title: 'Sign up' }}
      />
      <Stack.Screen 
        name="DefiDeal" 
        component={DefiDealScreen}
        options={{ title: 'Defi.Deal' }}
      />
      <Stack.Screen 
        name="MallOrder" 
        component={MallOrderScreen}
        options={{ title: language === 'es' ? 'Tiendas' : 'Stores' }}
      />
      <Stack.Screen 
        name="InfluencerSearch" 
        component={InfluencerSearchScreen}
        options={{ title: language === 'es' ? 'Buscar influencers' : 'Search influencers' }}
      />
      <Stack.Screen 
        name="InfluencersList" 
        component={InfluencersListScreen}
        options={{ title: language === 'es' ? 'Influencers' : 'Influencers' }}
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

