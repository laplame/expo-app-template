import React from 'react';
import { Box, Text, ScrollView, VStack, HStack, Divider } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { useMongoDB } from '../services/mongodb';
import { isCloudinaryConfigured } from '../services/cloudinary';

export default function HomeScreen() {
  const { isConnected } = useMongoDB();
  const cloudinaryConfigured = isCloudinaryConfigured();

  const coreDependencies = [
    { name: 'expo', version: '~54.0.26', category: 'Framework' },
    { name: 'react', version: '19.1.0', category: 'Core' },
    { name: 'react-native', version: '0.81.5', category: 'Core' },
    { name: 'typescript', version: '~5.9.2', category: 'Dev' },
  ];

  const navigationDeps = [
    { name: '@react-navigation/native', version: '^6.1.9' },
    { name: '@react-navigation/native-stack', version: '^6.9.17' },
    { name: '@react-navigation/drawer', version: '^6.7.2' },
    { name: 'react-native-drawer-layout', version: '^4.2.0' },
    { name: 'react-native-gesture-handler', version: '~2.16.1' },
    { name: 'react-native-safe-area-context', version: '4.10.5' },
    { name: 'react-native-screens', version: '~3.31.1' },
  ];

  const uiDeps = [
    { name: '@gluestack-ui/themed', version: '^1.1.73' },
    { name: '@gluestack-ui/config', version: '^1.1.20' },
    { name: '@gluestack-style/react', version: '^1.0.57' },
  ];

  const featureDeps = [
    { name: 'expo-image-picker', version: '^17.0.9', feature: 'Media Upload' },
    { name: 'expo-location', version: '^19.0.8', feature: 'GPS Navigation' },
  ];

  const ariaDeps = [
    { name: '@react-native-aria/focus', version: '^0.2.9' },
    { name: '@react-native-aria/interactions', version: '^0.2.16' },
    { name: '@react-native-aria/overlays', version: '^0.3.15' },
    { name: '@react-native-aria/utils', version: '^0.2.12' },
  ];

  const features = [
    { name: 'TypeScript Support', icon: '📘', description: 'Full TSX support with type safety' },
    { name: 'Drawer Navigation', icon: '📱', description: 'Smooth drawer menu with animations' },
    { name: 'Form Component', icon: '📝', description: 'Reusable form with validation' },
    { name: 'Media Upload', icon: '📷', description: 'Gallery, camera & Cloudinary integration' },
    { name: 'GPS Navigation', icon: '📍', description: 'Location tracking and services' },
    { name: 'MongoDB Integration', icon: '🍃', description: 'Backend API connection ready' },
  ];

  const reusableComponents = [
    { name: 'FormComponent', path: 'src/components/FormComponent.tsx', description: 'Form with validation' },
    { name: 'MediaUploadComponent', path: 'src/components/MediaUploadComponent.tsx', description: 'Image upload with Cloudinary' },
    { name: 'GPSNavigationComponent', path: 'src/components/GPSNavigationComponent.tsx', description: 'Location services' },
    { name: 'CustomDrawerContent', path: 'src/components/CustomDrawerContent.tsx', description: 'Drawer menu' },
  ];

  const services = [
    { name: 'MongoDB Service', path: 'src/services/mongodb.ts', status: isConnected ? '✅' : '⚠️' },
    { name: 'Cloudinary Service', path: 'src/services/cloudinary.ts', status: cloudinaryConfigured ? '✅' : '⚠️' },
  ];

  const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Box
      bg="$white"
      p="$5"
      borderRadius="$lg"
      marginVertical="$2"
      shadowColor="$black"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.1}
      shadowRadius={4}
      elevation={2}
      width="100%"
    >
      <VStack space="md">
        <Text fontSize="$xl" fontWeight="$bold" color="$textLight900">
          {title}
        </Text>
        {children}
      </VStack>
    </Box>
  );

  const DependencyItem = ({ name, version, feature }: { name: string; version: string; feature?: string }) => (
    <HStack justifyContent="space-between" alignItems="center" py="$1">
      <VStack flex={1}>
        <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
          {name}
        </Text>
        {feature && (
          <Text fontSize="$xs" color="$textLight500">
            {feature}
          </Text>
        )}
      </VStack>
      <Text fontSize="$xs" color="$textLight600" fontFamily="$mono">
        {version}
      </Text>
    </HStack>
  );

  return (
    <Box flex={1} bg="$backgroundLight0">
      <StatusBar style="light" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20 }}>
        <VStack space="lg" alignItems="center">
          {/* Header */}
          <VStack space="sm" alignItems="center" width="100%">
            <Text fontSize="$4xl" fontWeight="$bold" color="$textLight900" textAlign="center">
              Expo App Template
            </Text>
            <Text fontSize="$lg" color="$textLight600" textAlign="center">
              Comprehensive React Native template with TypeScript
            </Text>
            <Text fontSize="$sm" color="$textLight400" textAlign="center" mt="$2">
              Version 1.0.0
            </Text>
          </VStack>

          {/* Configuration Status */}
          <InfoCard title="Configuration Status">
            <VStack space="sm">
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$md" color="$textLight700">MongoDB Connection</Text>
                <Text fontSize="$md" color={isConnected ? '$success600' : '$error600'}>
                  {isConnected ? '✅ Configured' : '⚠️ Not Configured'}
                </Text>
              </HStack>
              <HStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$md" color="$textLight700">Cloudinary</Text>
                <Text fontSize="$md" color={cloudinaryConfigured ? '$success600' : '$error600'}>
                  {cloudinaryConfigured ? '✅ Configured' : '⚠️ Not Configured'}
                </Text>
              </HStack>
              <Divider my="$2" />
              <Text fontSize="$xs" color="$textLight400" fontStyle="italic">
                Configure in .env file (see .env.example)
              </Text>
            </VStack>
          </InfoCard>

          {/* Features */}
          <InfoCard title="✨ Features">
            <VStack space="sm">
              {features.map((feature, index) => (
                <HStack key={index} space="md" alignItems="flex-start">
                  <Text fontSize="$lg">{feature.icon}</Text>
                  <VStack flex={1}>
                    <Text fontSize="$md" color="$textLight900" fontWeight="$medium">
                      {feature.name}
                    </Text>
                    <Text fontSize="$sm" color="$textLight600">
                      {feature.description}
                    </Text>
                  </VStack>
                </HStack>
              ))}
            </VStack>
          </InfoCard>

          {/* Core Dependencies */}
          <InfoCard title="📦 Core Dependencies">
            <VStack space="xs">
              {coreDependencies.map((dep, index) => (
                <DependencyItem key={index} name={dep.name} version={dep.version} />
              ))}
            </VStack>
          </InfoCard>

          {/* Navigation Dependencies */}
          <InfoCard title="🧭 Navigation Dependencies">
            <VStack space="xs">
              {navigationDeps.map((dep, index) => (
                <DependencyItem key={index} name={dep.name} version={dep.version} />
              ))}
            </VStack>
          </InfoCard>

          {/* UI Dependencies */}
          <InfoCard title="🎨 UI Dependencies">
            <VStack space="xs">
              {uiDeps.map((dep, index) => (
                <DependencyItem key={index} name={dep.name} version={dep.version} />
              ))}
            </VStack>
          </InfoCard>

          {/* Feature Dependencies */}
          <InfoCard title="🚀 Feature Dependencies">
            <VStack space="xs">
              {featureDeps.map((dep, index) => (
                <DependencyItem key={index} name={dep.name} version={dep.version} feature={dep.feature} />
              ))}
            </VStack>
          </InfoCard>

          {/* Aria Dependencies */}
          <InfoCard title="♿ Accessibility Dependencies">
            <VStack space="xs">
              {ariaDeps.map((dep, index) => (
                <DependencyItem key={index} name={dep.name} version={dep.version} />
              ))}
            </VStack>
          </InfoCard>

          {/* Reusable Components */}
          <InfoCard title="🧩 Reusable Components">
            <VStack space="sm">
              {reusableComponents.map((component, index) => (
                <Box key={index} py="$2" borderBottomWidth={index < reusableComponents.length - 1 ? 1 : 0} borderBottomColor="$borderLight200">
                  <VStack space="xs">
                    <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                      {component.name}
                    </Text>
                    <Text fontSize="$xs" color="$textLight500" fontFamily="$mono">
                      {component.path}
                    </Text>
                    <Text fontSize="$xs" color="$textLight600">
                      {component.description}
                    </Text>
                  </VStack>
                </Box>
              ))}
            </VStack>
          </InfoCard>

          {/* Services */}
          <InfoCard title="⚙️ Services">
            <VStack space="sm">
              {services.map((service, index) => (
                <HStack key={index} justifyContent="space-between" alignItems="center" py="$1">
                  <VStack flex={1}>
                    <Text fontSize="$sm" color="$textLight900" fontWeight="$medium">
                      {service.name}
                    </Text>
                    <Text fontSize="$xs" color="$textLight500" fontFamily="$mono">
                      {service.path}
                    </Text>
                  </VStack>
                  <Text fontSize="$lg">{service.status}</Text>
                </HStack>
              ))}
            </VStack>
          </InfoCard>

          {/* Documentation */}
          <InfoCard title="📚 Documentation">
            <VStack space="sm">
              <Text fontSize="$sm" color="$textLight700">
                • Feature docs: features/*.md
              </Text>
              <Text fontSize="$sm" color="$textLight700">
                • Gherkin scenarios: features/*.feature
              </Text>
              <Text fontSize="$sm" color="$textLight700">
                • Cleanup guide: CLEANUP.md
          </Text>
              <Text fontSize="$sm" color="$textLight700">
                • Environment: .env.example
          </Text>
            </VStack>
          </InfoCard>

          {/* Footer */}
          <Box py="$4" width="100%">
            <Text fontSize="$xs" color="$textLight400" textAlign="center">
              Use the drawer menu (☰) to navigate between screens
            </Text>
          </Box>
        </VStack>
      </ScrollView>
    </Box>
  );
}


