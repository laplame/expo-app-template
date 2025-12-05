import React from 'react';
import { Box, ScrollView, VStack } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import GPSNavigationComponent from '../components/GPSNavigationComponent';

export default function GPSNavigationScreen() {
  const handleLocationUpdate = (location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number;
    heading?: number;
    speed?: number;
  }) => {
    console.log('Location updated:', location);
    // Here you can add your location handling logic
    // For example, save to database, send to server, update map, etc.
  };

  return (
    <Box flex={1} bg="$backgroundLight0">
      <StatusBar style="light" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20 }}>
        <VStack space="lg" alignItems="center">
          <GPSNavigationComponent
            onLocationUpdate={handleLocationUpdate}
            watchLocation={false}
            updateInterval={1000}
          />
        </VStack>
      </ScrollView>
    </Box>
  );
}

