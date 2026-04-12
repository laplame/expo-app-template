import React, { useState, useMemo } from 'react';
import { ScrollView } from 'react-native';
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
} from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import { setQuickProfile } from '../services/storage';
import { createLink4DealPolygonWallet } from '../services/link4dealWallet';

export default function QuickRegisterScreen() {
  const navigation = useNavigation();
  const { language, setUserName } = useSettings();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(
    () => ({
      title: language === 'es' ? 'Alta en el sistema' : 'Sign up',
      subtitle: language === 'es' ? 'Solo nombre, edad y WhatsApp para empezar.' : 'Just name, age and WhatsApp to get started.',
      fieldName: language === 'es' ? 'Nombre' : 'Name',
      fieldAge: language === 'es' ? 'Edad' : 'Age',
      fieldPhone: language === 'es' ? 'WhatsApp (teléfono)' : 'WhatsApp (phone)',
      submit: language === 'es' ? 'Darme de alta' : 'Sign up',
      required: language === 'es' ? 'Completa nombre, edad y teléfono.' : 'Fill in name, age and phone.',
    }),
    [language]
  );

  const handleSubmit = async () => {
    setError(null);
    const n = name.trim();
    const a = age.trim();
    const p = phone.trim();
    if (!n || !a || !p) {
      setError(t.required);
      return;
    }
    const ageNum = parseInt(a, 10);
    if (Number.isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError(language === 'es' ? 'Edad no válida.' : 'Invalid age.');
      return;
    }
    await setQuickProfile({ name: n, age: a, phone: p });
    setUserName(n);
    try {
      await createLink4DealPolygonWallet();
    } catch {
      // Ya existe o error de red; no bloquear el alta
    }
    (navigation as any).navigate('Home');
  };

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <VStack space="lg">
          <Box bg="#00704A" borderRadius="$xl" p="$5">
            <Text fontSize="$xl" fontWeight="$bold" color="$white">
              {t.title}
            </Text>
            <Text fontSize="$sm" color="$white" opacity={0.9} mt="$1">
              {t.subtitle}
            </Text>
          </Box>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldName} *</FormControlLabelText></FormControlLabel>
            <Input><InputField value={name} onChangeText={setName} placeholder={t.fieldName} /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldAge} *</FormControlLabelText></FormControlLabel>
            <Input><InputField value={age} onChangeText={setAge} placeholder="25" keyboardType="number-pad" /></Input>
          </FormControl>
          <FormControl>
            <FormControlLabel><FormControlLabelText>{t.fieldPhone} *</FormControlLabelText></FormControlLabel>
            <Input><InputField value={phone} onChangeText={setPhone} placeholder="+52 55 1234 5678" keyboardType="phone-pad" /></Input>
          </FormControl>
          {error ? <Text color="$error600">{error}</Text> : null}
          <Button size="lg" bg="#00704A" onPress={handleSubmit}>
            <ButtonText>{t.submit}</ButtonText>
          </Button>
        </VStack>
      </ScrollView>
    </Box>
  );
}
