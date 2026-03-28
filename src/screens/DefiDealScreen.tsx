import React, { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Box, Text, VStack, Pressable } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../context/SettingsContext';
import { glossary, ecosystem, version, getDefinition, type GlossaryEntry } from '../data/glossary';

export default function DefiDealScreen() {
  const { language } = useSettings();

  const t = useMemo(
    () => ({
      title: 'Defi.Deal',
      subtitle: language === 'es' ? 'Glosario de términos' : 'Glossary',
      subtitleLong: language === 'es'
        ? 'Definiciones de conceptos Link4Deal, cripto y DeFi; incluye advertencias de billetera (LUXAE / LXD) y seguridad.'
        : 'Link4Deal, crypto and DeFi terms explained; includes wallet notices (LUXAE / LXD) and security.',
      category: language === 'es' ? 'Categoría' : 'Category',
    }),
    [language]
  );

  return (
    <Box flex={1} bg="$white">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Box bg="#00704A" px="$4" pt="$4" pb="$6">
          <Text fontSize="$2xl" fontWeight="$bold" color="$white">
            {t.title}
          </Text>
          <Text fontSize="$sm" color="$white" opacity={0.9} mt="$1">
            {t.subtitle}
          </Text>
          <Text fontSize="$xs" color="$white" opacity={0.8} mt="$0.5">
            {t.subtitleLong}
          </Text>
          <Text fontSize="$xs" color="$white" opacity={0.7} mt="$1">
            {ecosystem} · v{version}
          </Text>
        </Box>
        <VStack px="$4" pt="$4" space="md">
          {glossary.map((item: GlossaryEntry, index: number) => (
            <Pressable
              key={`${item.term}-${index}`}
              bg="$backgroundLight50"
              borderRadius="$xl"
              p="$4"
              borderLeftWidth={4}
              borderLeftColor="#00704A"
              _pressed={{ opacity: 0.95 }}
            >
              <Text fontSize="$md" fontWeight="$bold" color="#00704A" mb="$1">
                {item.term}
              </Text>
              <Text fontSize="$xs" color="$textLight500" mb="$2">
                {t.category}: {item.category}
              </Text>
              <Text fontSize="$sm" color="$textLight700" lineHeight="$lg">
                {getDefinition(item, language)}
              </Text>
            </Pressable>
          ))}
        </VStack>
      </ScrollView>
    </Box>
  );
}
