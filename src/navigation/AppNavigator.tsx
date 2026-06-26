import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Pressable, Text } from '@gluestack-ui/themed';
import { useSettings } from '../context/SettingsContext';
import { useAppTheme } from '../theme/useAppTheme';
import HomeScreen from '../screens/HomeScreen';
import WalletScreen from '../screens/WalletScreen';
import NYCScreen from '../screens/NYCScreen';
import SettingsScreen from '../screens/SettingsScreen';
import PromotionsMapScreen from '../screens/PromotionsMapScreen';
import UploadPromotionsScreenGate from '../screens/UploadPromotionsScreenGate';
import QuickRegisterScreen from '../screens/QuickRegisterScreen';
import DefiDealScreen from '../screens/DefiDealScreen';
import MallOrderScreen from '../screens/MallOrderScreen';
import MonetizationScreen from '../screens/MonetizationScreen';
import InfluencerSearchScreen from '../screens/InfluencerSearchScreen';
import InfluencersListScreen from '../screens/InfluencersListScreen';
import NetworkP2PScreen from '../screens/NetworkP2PScreen';
import EmailDexScreen from '../screens/EmailDexScreen';
import LoginScreen from '../screens/LoginScreen';
import UserDashboardScreen from '../screens/UserDashboardScreen';
import InfluencerDashboardScreen from '../screens/InfluencerDashboardScreen';
import BusinessDashboardScreen from '../screens/BusinessDashboardScreen';
import SuperuserDashboardScreen from '../screens/SuperuserDashboardScreen';
import CustomDrawerContent from '../components/CustomDrawerContent';
import type { InfluencerPlatform } from '../services/influencersApi';

export type RootStackParamList = {
  /** scrollToPromotions: al abrir desde el menú “Cupones”, hace scroll al listado de promociones */
  Home: { scrollToPromotions?: boolean; redeemPromotionId?: string } | undefined;
  Wallet: undefined;
  NYC: undefined;
  Settings: undefined;
  PromotionsMap: { focusPromotionId?: string } | undefined;
  UploadPromotions: undefined;
  QuickRegister: undefined;
  DefiDeal: undefined;
  MallOrder: undefined;
  Monetization: undefined;
  InfluencerSearch: {
    initialQuery?: string;
    platform?: InfluencerPlatform;
    imageUri?: string;
  };
  InfluencersList: undefined;
  NetworkP2P: undefined;
  EmailDex: undefined;
  Login: undefined;
  UserDashboard: undefined;
  InfluencerDashboard: undefined;
  BusinessDashboard: undefined;
  SuperuserDashboard: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator();

function StackNavigator() {
  const { language } = useSettings();
  const theme = useAppTheme();
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: theme.brand,
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
        component={UploadPromotionsScreenGate}
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
        name="Monetization"
        component={MonetizationScreen}
        options={{
          title: language === 'es' ? 'Monetización' : 'Monetization',
        }}
      />
      <Stack.Screen
        name="InfluencerSearch"
        component={InfluencerSearchScreen}
        options={{
          title: language === 'es' ? 'Buscar influencer' : 'Search influencer',
        }}
      />
      <Stack.Screen 
        name="InfluencersList" 
        component={InfluencersListScreen}
        options={{ title: language === 'es' ? 'Influencers' : 'Influencers' }}
      />
      <Stack.Screen
        name="NetworkP2P"
        component={NetworkP2PScreen}
        options={{
          headerShown: false,
          title: language === 'es' ? 'Social Layer' : 'Social Layer',
        }}
      />
      <Stack.Screen
        name="EmailDex"
        component={EmailDexScreen}
        options={{
          headerShown: false,
          title: 'E-mailDex',
        }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: language === 'es' ? 'Iniciar sesión' : 'Sign in',
        }}
      />
      <Stack.Screen
        name="UserDashboard"
        component={UserDashboardScreen}
        options={{
          title: language === 'es' ? 'Panel usuario' : 'User panel',
        }}
      />
      <Stack.Screen
        name="InfluencerDashboard"
        component={InfluencerDashboardScreen}
        options={{
          title: language === 'es' ? 'Panel influencer' : 'Influencer panel',
        }}
      />
      <Stack.Screen
        name="BusinessDashboard"
        component={BusinessDashboardScreen}
        options={{
          title: language === 'es' ? 'Panel negocio' : 'Business panel',
        }}
      />
      <Stack.Screen
        name="SuperuserDashboard"
        component={SuperuserDashboardScreen}
        options={{
          title: language === 'es' ? 'Panel superusuario' : 'Superuser panel',
        }}
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

