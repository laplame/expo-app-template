import React from 'react';
import { Box, Text, ScrollView, VStack } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type DetailsScreenRouteProp = RouteProp<RootStackParamList, 'Details'>;

export default function DetailsScreen() {
  const route = useRoute<DetailsScreenRouteProp>();
  const { itemId } = route.params || {};

  return (
    <Box flex={1} bg="$backgroundLight0">
      <StatusBar style="light" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20 }}>
        <VStack space="lg" alignItems="center">
          <Text fontSize="$4xl" fontWeight="$bold" color="$textLight900" textAlign="center">
            Details Screen
          </Text>
          <Text fontSize="$xl" color="$textLight600" textAlign="center">
            Viewing item details
          </Text>

          <Box
            bg="$white"
            p="$5"
            borderRadius="$lg"
            marginVertical="$5"
            shadowColor="$black"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={2}
            width="100%"
          >
            <VStack space="sm">
              <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
                Item Information
              </Text>
              <Text fontSize="$md" color="$textLight600">
                Item ID: {itemId || 'No ID provided'}
              </Text>
              <Text fontSize="$sm" color="$textLight400" fontStyle="italic" marginTop="$2">
                This screen demonstrates navigation with parameters.
              </Text>
            </VStack>
          </Box>

          <Box
            bg="$white"
            p="$5"
            borderRadius="$lg"
            marginTop="$2"
            shadowColor="$black"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}
            elevation={2}
            width="100%"
          >
            <VStack space="md">
              <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
                Navigation Features
              </Text>
              <Text fontSize="$md" color="$textLight600">• Stack navigation between screens</Text>
              <Text fontSize="$md" color="$textLight600">• Parameter passing</Text>
              <Text fontSize="$md" color="$textLight600">• Type-safe navigation</Text>
              <Text fontSize="$md" color="$textLight600">• Collapsible menu on all screens</Text>
            </VStack>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}


