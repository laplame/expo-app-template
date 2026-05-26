import React from 'react';
import { Box, HStack, Pressable, Text, VStack } from '@gluestack-ui/themed';
import { APP_THEMES, DEFAULT_APP_THEME_ID, getAppTheme, type AppThemeId } from '../theme/appThemes';

type Props = {
  language: 'es' | 'en';
  selected: AppThemeId;
  onSelect: (id: AppThemeId) => void;
  titleColor: string;
  mutedColor: string;
  chipBg: string;
  activeBrand?: string;
};

export default function AppThemePicker({
  language,
  selected,
  onSelect,
  titleColor,
  mutedColor,
  chipBg,
  activeBrand = getAppTheme(DEFAULT_APP_THEME_ID).brand,
}: Props) {
  return (
    <VStack space="sm">
      {APP_THEMES.map((theme) => {
        const isActive = selected === theme.id;
        const label = language === 'es' ? theme.labelEs : theme.labelEn;
        return (
          <Pressable
            key={theme.id}
            onPress={() => onSelect(theme.id)}
            borderRadius="$lg"
            borderWidth={2}
            borderColor={isActive ? activeBrand : 'transparent'}
            bg={isActive ? activeBrand : chipBg}
            p="$3"
          >
            <HStack space="md" alignItems="center">
              <Box
                width={36}
                height={36}
                borderRadius="$full"
                bg={theme.preview}
                borderWidth={2}
                borderColor={isActive ? '$white' : theme.colors.line}
              />
              <VStack flex={1}>
                <Text
                  fontSize="$md"
                  fontWeight="$semibold"
                  color={isActive ? '$white' : titleColor}
                >
                  {label}
                </Text>
                <Text
                  fontSize="$xs"
                  color={isActive ? '$white' : mutedColor}
                  opacity={isActive ? 0.9 : 1}
                >
                  {theme.isDark
                    ? language === 'es'
                      ? 'Entorno oscuro'
                      : 'Dark environment'
                    : language === 'es'
                      ? 'Entorno claro'
                      : 'Light environment'}
                </Text>
              </VStack>
            </HStack>
          </Pressable>
        );
      })}
    </VStack>
  );
}
