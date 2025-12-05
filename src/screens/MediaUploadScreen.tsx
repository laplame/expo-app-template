import React from 'react';
import { Box, ScrollView, VStack } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import MediaUploadComponent from '../components/MediaUploadComponent';

export default function MediaUploadScreen() {
  const handleMediaSelected = (uri: string, cloudinaryUrl?: string) => {
    console.log('Media selected:', uri);
    if (cloudinaryUrl) {
      console.log('Cloudinary URL:', cloudinaryUrl);
      // Here you can save the Cloudinary URL to your database
      // For example: await saveToDatabase({ localUri: uri, cloudinaryUrl });
    }
    // Here you can add your media upload logic
    // For example, save to database, etc.
  };

  const handleMediaRemoved = () => {
    console.log('Media removed');
    // Handle media removal if needed
  };

  return (
    <Box flex={1} bg="$backgroundLight0">
      <StatusBar style="light" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20 }}>
        <VStack space="lg" alignItems="center">
          <MediaUploadComponent
            title="Upload Media"
            onMediaSelected={handleMediaSelected}
            onMediaRemoved={handleMediaRemoved}
            maxImages={5}
            allowMultiple={true}
            uploadToCloud={true} // Enable Cloudinary upload
            cloudinaryFolder="expo-app-uploads" // Optional: organize in folder
          />
        </VStack>
      </ScrollView>
    </Box>
  );
}

