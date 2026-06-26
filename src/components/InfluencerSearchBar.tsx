import React, { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Box, Text, HStack, Pressable, Input, InputField } from '@gluestack-ui/themed';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import type { InfluencerPlatform } from '../services/influencersApi';

const PLATFORM_OPTIONS: { id: InfluencerPlatform; label: string; short: string; selectedBg: string }[] = [
  { id: 'youtube', label: 'YouTube', short: 'YT', selectedBg: '#FF0000' },
  { id: 'tiktok', label: 'TikTok', short: 'TikTok', selectedBg: '#000000' },
  { id: 'instagram', label: 'Instagram', short: 'IG', selectedBg: '#E4405F' },
];

type Props = {
  language: 'es' | 'en';
  brand: string;
};

export default function InfluencerSearchBar({ language, brand }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [platform, setPlatform] = useState<InfluencerPlatform>('youtube');
  const [query, setQuery] = useState('');

  const strings = useMemo(
    () =>
      language === 'es'
        ? {
            searchInfluencers: 'Buscar influencers...',
            searchEmpty: 'Escribe un nombre o tema para buscar',
            uploadScreenshot: 'Subir screenshot',
            screenshotSuggestion:
              'Sube aquí tu screenshot del influencer para analizar el perfil y crear la ficha si no existe.',
            screenshotPermission: 'Se necesita permiso para acceder a las fotos.',
            openGallery: 'Subir',
            ok: 'Aceptar',
            cancel: 'Cancelar',
          }
        : {
            searchInfluencers: 'Search influencers...',
            searchEmpty: 'Enter a name or topic to search',
            uploadScreenshot: 'Upload screenshot',
            screenshotSuggestion:
              'Upload an influencer screenshot to analyze the profile and create the listing if needed.',
            screenshotPermission: 'Permission to access photos is required.',
            openGallery: 'Upload',
            ok: 'OK',
            cancel: 'Cancel',
          },
    [language]
  );

  const openSearch = useCallback(() => {
    const q = query.trim();
    if (!q) {
      Alert.alert(strings.searchEmpty, undefined, [{ text: strings.ok }]);
      return;
    }
    navigation.navigate('InfluencerSearch', { initialQuery: q, platform });
  }, [navigation, platform, query, strings]);

  const openScreenshotPicker = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(strings.ok, strings.screenshotPermission);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      navigation.navigate('InfluencerSearch', {
        imageUri: result.assets[0].uri,
        platform,
      });
    }
  }, [navigation, platform, strings]);

  const pickScreenshot = useCallback(() => {
    Alert.alert(strings.uploadScreenshot, strings.screenshotSuggestion, [
      { text: strings.cancel, style: 'cancel' },
      { text: strings.openGallery, onPress: () => void openScreenshotPicker() },
    ]);
  }, [openScreenshotPicker, strings]);

  return (
    <Box bg="$white" borderRadius="$lg" px="$3" py="$2" borderWidth={1} borderColor="$borderLight200">
      <HStack alignItems="center" space="sm">
        <HStack space="xs" alignItems="center" flex={0}>
          {PLATFORM_OPTIONS.map((p) => {
            const isSelected = platform === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPlatform(p.id)}
                bg={isSelected ? p.selectedBg : '$backgroundLight100'}
                borderRadius="$full"
                px="$2.5"
                py="$1.5"
                _pressed={{ opacity: 0.85 }}
              >
                <Text fontSize="$xs" fontWeight="$semibold" color={isSelected ? '$white' : '$textLight700'}>
                  {p.short}
                </Text>
              </Pressable>
            );
          })}
        </HStack>
        <Input flex={1} size="sm" borderRadius="$lg" borderColor="$borderLight300" minHeight={36}>
          <InputField
            placeholder={strings.searchInfluencers}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={openSearch}
          />
        </Input>
        <Pressable
          onPress={openSearch}
          bg="#1a73e8"
          borderRadius="$lg"
          px="$3"
          py="$2"
          alignItems="center"
          justifyContent="center"
          _pressed={{ opacity: 0.9 }}
          accessibilityLabel={strings.searchInfluencers}
        >
          <Text fontSize="$xl">🔍</Text>
        </Pressable>
        <Pressable
          onPress={pickScreenshot}
          bg={brand}
          borderRadius="$lg"
          p="$2"
          minWidth={40}
          alignItems="center"
          justifyContent="center"
          _pressed={{ opacity: 0.9 }}
          accessibilityLabel={strings.uploadScreenshot}
        >
          <Text fontSize="$xl">🖼️</Text>
        </Pressable>
      </HStack>
    </Box>
  );
}
