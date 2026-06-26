import React from 'react';
import { Box, Text, VStack, Button, ButtonText } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import type { AuthPermission } from '../types/authRoles';

type Props = {
  permission: AuthPermission;
  children: React.ReactNode;
  /** Si true, muestra pantalla de acceso denegado en lugar de null. */
  showFallback?: boolean;
};

export default function RoleGate({ permission, children, showFallback = true }: Props) {
  const { hasPermission, status } = useAuth();
  const { language } = useSettings();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (status === 'loading') return null;
  if (hasPermission(permission)) return <>{children}</>;

  if (!showFallback) return null;

  const strings =
    language === 'es'
      ? {
          title: 'Acceso restringido',
          body: 'Tu rol no tiene permiso para esta sección. Inicia sesión con la cuenta correcta.',
          login: 'Iniciar sesión',
          back: 'Volver',
        }
      : {
          title: 'Restricted access',
          body: 'Your role does not have permission for this section. Sign in with the correct account.',
          login: 'Sign in',
          back: 'Go back',
        };

  return (
    <Box flex={1} bg="$white" px="$6" py="$10" justifyContent="center">
      <VStack space="md">
        <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
          {strings.title}
        </Text>
        <Text fontSize="$sm" color="$textLight700" lineHeight="$md">
          {strings.body}
        </Text>
        <Button size="lg" bg="#00704A" onPress={() => navigation.navigate('Login')}>
          <ButtonText>{strings.login}</ButtonText>
        </Button>
        <Button size="md" variant="outline" borderColor="#00704A" onPress={() => navigation.goBack()}>
          <ButtonText color="#00704A">{strings.back}</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
