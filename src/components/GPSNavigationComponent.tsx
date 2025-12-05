import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  Button,
  ButtonText,
  Text,
  HStack,
  Spinner,
} from '@gluestack-ui/themed';
import * as Location from 'expo-location';
import { Alert } from 'react-native';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
}

interface GPSNavigationComponentProps {
  onLocationUpdate?: (location: LocationData) => void;
  watchLocation?: boolean;
  updateInterval?: number;
}

export default function GPSNavigationComponent({
  onLocationUpdate,
  watchLocation = false,
  updateInterval = 1000,
}: GPSNavigationComponentProps) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need permission to access your location to use GPS navigation.'
      );
      setError('Location permission denied');
      return false;
    }
    return true;
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
        altitude: currentLocation.coords.altitude || undefined,
        heading: currentLocation.coords.heading || undefined,
        speed: currentLocation.coords.speed || undefined,
      };

      setLocation(locationData);
      if (onLocationUpdate) {
        onLocationUpdate(locationData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const startWatching = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setWatching(true);
    setError(null);

    try {
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: updateInterval,
          distanceInterval: 10,
        },
        (currentLocation) => {
          const locationData: LocationData = {
            latitude: currentLocation.coords.latitude,
            longitude: currentLocation.coords.longitude,
            accuracy: currentLocation.coords.accuracy || undefined,
            altitude: currentLocation.coords.altitude || undefined,
            heading: currentLocation.coords.heading || undefined,
            speed: currentLocation.coords.speed || undefined,
          };

          setLocation(locationData);
          if (onLocationUpdate) {
            onLocationUpdate(locationData);
          }
        }
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to watch location';
      setError(errorMessage);
      setWatching(false);
    }
  };

  const stopWatching = () => {
    setWatching(false);
    Location.stopLocationUpdatesAsync();
  };

  useEffect(() => {
    if (watchLocation && !watching) {
      startWatching();
    }

    return () => {
      if (watching) {
        stopWatching();
      }
    };
  }, [watchLocation]);

  const formatCoordinate = (value: number): string => {
    return value.toFixed(6);
  };

  return (
    <Box width="100%" p="$4">
      <Text fontSize="$2xl" fontWeight="$bold" color="$textLight900" mb="$4" textAlign="center">
        GPS Navigation
      </Text>
      <VStack space="lg">
        <HStack space="md" justifyContent="center">
          <Button onPress={getCurrentLocation} isDisabled={loading || watching} flex={1}>
            {loading ? <Spinner color="$white" /> : <ButtonText>Get Current Location</ButtonText>}
          </Button>
          {watchLocation && (
            <Button
              onPress={watching ? stopWatching : startWatching}
              variant={watching ? 'outline' : 'solid'}
              flex={1}
            >
              <ButtonText>{watching ? 'Stop Watching' : 'Watch Location'}</ButtonText>
            </Button>
          )}
        </HStack>

        {error && (
          <Box bg="$error50" p="$3" borderRadius="$md">
            <Text color="$error600" fontSize="$sm">
              {error}
            </Text>
          </Box>
        )}

        {location && (
          <Box bg="$white" p="$4" borderRadius="$lg" shadowColor="$black" shadowOffset={{ width: 0, height: 2 }} shadowOpacity={0.1} shadowRadius={4} elevation={2}>
            <VStack space="sm">
              <Text fontSize="$lg" fontWeight="$bold" color="$textLight900" mb="$2">
                Current Location
              </Text>
              <HStack justifyContent="space-between">
                <Text fontSize="$sm" color="$textLight600">Latitude:</Text>
                <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                  {formatCoordinate(location.latitude)}
                </Text>
              </HStack>
              <HStack justifyContent="space-between">
                <Text fontSize="$sm" color="$textLight600">Longitude:</Text>
                <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                  {formatCoordinate(location.longitude)}
                </Text>
              </HStack>
              {location.accuracy && (
                <HStack justifyContent="space-between">
                  <Text fontSize="$sm" color="$textLight600">Accuracy:</Text>
                  <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                    {location.accuracy.toFixed(2)} m
                  </Text>
                </HStack>
              )}
              {location.altitude && (
                <HStack justifyContent="space-between">
                  <Text fontSize="$sm" color="$textLight600">Altitude:</Text>
                  <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                    {location.altitude.toFixed(2)} m
                  </Text>
                </HStack>
              )}
              {location.speed !== undefined && location.speed !== null && (
                <HStack justifyContent="space-between">
                  <Text fontSize="$sm" color="$textLight600">Speed:</Text>
                  <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                    {location.speed.toFixed(2)} m/s
                  </Text>
                </HStack>
              )}
              {location.heading !== undefined && location.heading !== null && (
                <HStack justifyContent="space-between">
                  <Text fontSize="$sm" color="$textLight600">Heading:</Text>
                  <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                    {location.heading.toFixed(2)}°
                  </Text>
                </HStack>
              )}
            </VStack>
          </Box>
        )}

        {!location && !loading && !error && (
          <Box
            bg="$backgroundLight100"
            borderRadius="$lg"
            p="$8"
            alignItems="center"
            justifyContent="center"
            minHeight={200}
          >
            <Text color="$textLight400" fontSize="$md" textAlign="center">
              No location data available
            </Text>
            <Text color="$textLight400" fontSize="$sm" textAlign="center" mt="$2">
              Tap "Get Current Location" to start
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

