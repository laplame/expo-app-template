import React, { useMemo, useState } from 'react';
import { ScrollView, ActivityIndicator } from 'react-native';
import {
  Box,
  Text,
  VStack,
  Input,
  InputField,
  Button,
  ButtonText,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  HStack,
  Pressable,
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useBrandTheme } from '../theme/useBrandTheme';
import { AUTH_TEST_USERS, isAuthDevModeEnabled } from '../config/authTestUsers';
import { getRoleLabel } from '../types/authRoles';
import type { RootStackParamList } from '../navigation/AppNavigator';

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login, status, error: authError } = useAuth();
  const { language } = useSettings();
  const { brand } = useBrandTheme();
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            title: 'Iniciar sesión',
            subtitle: 'Accede con tu cuenta DameCodigo según tu rol.',
            email: 'Email o usuario',
            password: 'Contraseña',
            submit: 'Entrar',
            required: 'Completa email y contraseña.',
            devHint: 'Modo desarrollo: usa las cuentas de prueba abajo.',
            testAccounts: 'Cuentas de prueba',
            afterLogin: 'Tras iniciar sesión irás a tu panel según rol.',
          }
        : {
            title: 'Sign in',
            subtitle: 'Access your DameCodigo account by role.',
            email: 'Email or username',
            password: 'Password',
            submit: 'Sign in',
            required: 'Enter email and password.',
            devHint: 'Development mode: use test accounts below.',
            testAccounts: 'Test accounts',
            afterLogin: 'After sign-in you will go to your role dashboard.',
          },
    [language]
  );

  const handleSubmit = async () => {
    setLocalError(null);
    if (!loginValue.trim() || !password) {
      setLocalError(strings.required);
      return;
    }
    setSubmitting(true);
    const res = await login(loginValue, password);
    setSubmitting(false);
    if (res.ok && res.effectiveRole) {
      switch (res.effectiveRole) {
        case 'influencer':
          navigation.replace('InfluencerDashboard');
          break;
        case 'business':
          navigation.replace('BusinessDashboard');
          break;
        case 'superuser':
          navigation.replace('SuperuserDashboard');
          break;
        default:
          navigation.replace('UserDashboard');
      }
      return;
    }
    setLocalError(res.error ?? authError ?? 'Error');
  };

  const fillTest = (email: string, pwd: string) => {
    setLoginValue(email);
    setPassword(pwd);
    setLocalError(null);
  };

  if (status === 'loading') {
    return (
      <Box flex={1} justifyContent="center" alignItems="center" bg="$white">
        <ActivityIndicator color={brand} />
      </Box>
    );
  }

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
        <VStack space="lg">
          <Box bg={brand} borderRadius="$xl" p="$5">
            <Text fontSize="$2xl" fontWeight="$bold" color="$white">
              {strings.title}
            </Text>
            <Text fontSize="$sm" color="$white" opacity={0.92} mt="$2">
              {strings.subtitle}
            </Text>
          </Box>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>{strings.email}</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                value={loginValue}
                onChangeText={setLoginValue}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="test.user@damecodigo.dev"
              />
            </Input>
          </FormControl>

          <FormControl>
            <FormControlLabel>
              <FormControlLabelText>{strings.password}</FormControlLabelText>
            </FormControlLabel>
            <Input>
              <InputField
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
              />
            </Input>
          </FormControl>

          {localError ? (
            <Text color="$error600" fontSize="$sm">
              {localError}
            </Text>
          ) : null}

          <Button size="lg" bg={brand} onPress={() => void handleSubmit()} isDisabled={submitting}>
            <ButtonText>{submitting ? '…' : strings.submit}</ButtonText>
          </Button>

          <Text fontSize="$xs" color="$textLight500">
            {strings.afterLogin}
          </Text>

          {isAuthDevModeEnabled() ? (
            <Box borderWidth={1} borderColor="$borderLight200" borderRadius="$lg" p="$4" bg="#f8faf9">
              <Text fontSize="$sm" fontWeight="$bold" color={brand} mb="$2">
                {strings.testAccounts}
              </Text>
              <Text fontSize="$xs" color="$textLight600" mb="$3">
                {strings.devHint}
              </Text>
              <VStack space="sm">
                {AUTH_TEST_USERS.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => fillTest(u.email, u.password)}
                    borderWidth={1}
                    borderColor="$borderLight200"
                    borderRadius="$md"
                    p="$3"
                    bg="$white"
                  >
                    <HStack justifyContent="space-between" alignItems="center">
                      <VStack flex={1} space="xs">
                        <Text fontSize="$sm" fontWeight="$semibold">
                          {u.displayName}
                        </Text>
                        <Text fontSize="$2xs" color="$textLight600">
                          {u.email}
                        </Text>
                        <Text fontSize="$2xs" color="$textLight500">
                          {language === 'es' ? u.notes.es : u.notes.en}
                        </Text>
                      </VStack>
                      <Text fontSize="$2xs" color={brand} fontWeight="$bold">
                        {getRoleLabel(u.isSuperuser ? 'superuser' : u.primaryRole, language)}
                      </Text>
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            </Box>
          ) : null}
        </VStack>
      </ScrollView>
    </Box>
  );
}
