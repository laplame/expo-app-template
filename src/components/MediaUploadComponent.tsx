import React, { useState } from 'react';
import {
  Box,
  VStack,
  Button,
  ButtonText,
  Text,
  Image,
  HStack,
  Pressable,
  Spinner,
} from '@gluestack-ui/themed';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { uploadToCloudinary, CloudinaryUploadResult, isCloudinaryConfigured } from '../services/cloudinary';

interface MediaUploadComponentProps {
  title?: string;
  onMediaSelected?: (uri: string, cloudinaryUrl?: string) => void;
  onMediaRemoved?: () => void;
  maxImages?: number;
  allowMultiple?: boolean;
  uploadToCloud?: boolean; // Upload to Cloudinary automatically
  cloudinaryFolder?: string; // Cloudinary folder for organization
}

export default function MediaUploadComponent({
  title = 'Upload Media',
  onMediaSelected,
  onMediaRemoved,
  maxImages = 1,
  allowMultiple = false,
  uploadToCloud = false,
  cloudinaryFolder,
}: MediaUploadComponentProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<Map<number, string>>(new Map());
  const [uploading, setUploading] = useState<Map<number, boolean>>(new Map());

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need permission to access your media library to upload images.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: allowMultiple && maxImages > 1,
        selectionLimit: allowMultiple ? maxImages : 1,
      });

      if (!result.canceled) {
        const newImages = result.assets.map((asset) => asset.uri);
        const updatedImages = allowMultiple
          ? [...selectedImages, ...newImages].slice(0, maxImages)
          : newImages;

        setSelectedImages(updatedImages);

        // Upload to Cloudinary if enabled
        if (uploadToCloud && isCloudinaryConfigured()) {
          for (let i = 0; i < newImages.length; i++) {
            const imageIndex = selectedImages.length + i;
            await uploadImageToCloudinary(newImages[i], imageIndex);
          }
        }

        if (onMediaSelected && updatedImages.length > 0) {
          const cloudinaryUrl = uploadedUrls.get(0);
          onMediaSelected(updatedImages[0], cloudinaryUrl);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('ImagePicker error:', error);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need permission to access your camera to take photos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImage = result.assets[0].uri;
        const updatedImages = allowMultiple
          ? [...selectedImages, newImage].slice(0, maxImages)
          : [newImage];

        setSelectedImages(updatedImages);

        // Upload to Cloudinary if enabled
        if (uploadToCloud && isCloudinaryConfigured()) {
          const imageIndex = selectedImages.length;
          await uploadImageToCloudinary(newImage, imageIndex);
        }

        if (onMediaSelected) {
          const cloudinaryUrl = uploadedUrls.get(updatedImages.length - 1);
          onMediaSelected(updatedImages[0], cloudinaryUrl);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.error('Camera error:', error);
    }
  };

  const uploadImageToCloudinary = async (imageUri: string, index: number) => {
    setUploading((prev) => new Map(prev).set(index, true));

    try {
      const result: CloudinaryUploadResult = await uploadToCloudinary(imageUri, {
        folder: cloudinaryFolder,
      });

      setUploadedUrls((prev) => new Map(prev).set(index, result.secure_url));
      
      // Notify parent component of upload
      if (onMediaSelected) {
        onMediaSelected(imageUri, result.secure_url);
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      Alert.alert(
        'Upload Failed',
        'Failed to upload image to cloud. The image is saved locally only.'
      );
    } finally {
      setUploading((prev) => {
        const newMap = new Map(prev);
        newMap.set(index, false);
        return newMap;
      });
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedUrls = new Map(uploadedUrls);
    updatedUrls.delete(index);
    
    setSelectedImages(updatedImages);
    setUploadedUrls(updatedUrls);
    
    if (onMediaRemoved && updatedImages.length === 0) {
      onMediaRemoved();
    }
  };

  return (
    <Box width="100%" p="$4">
      <Text fontSize="$2xl" fontWeight="$bold" color="$textLight900" mb="$4" textAlign="center">
        {title}
      </Text>
      <VStack space="lg">
        <HStack space="md" justifyContent="center">
          <Button onPress={pickImage} flex={1}>
            <ButtonText>Choose from Library</ButtonText>
          </Button>
          <Button onPress={takePhoto} variant="outline" flex={1}>
            <ButtonText>Take Photo</ButtonText>
          </Button>
        </HStack>

        {selectedImages.length > 0 && (
          <VStack space="md" mt="$4">
            <Text fontSize="$md" color="$textLight600">
              Selected Images ({selectedImages.length}/{maxImages})
            </Text>
            {selectedImages.map((uri, index) => {
              const isUploading = uploading.get(index);
              const cloudinaryUrl = uploadedUrls.get(index);
              
              return (
                <Box key={index} position="relative" borderRadius="$lg" overflow="hidden">
                  <Image
                    source={{ uri: cloudinaryUrl || uri }}
                    alt={`Selected image ${index + 1}`}
                    width="100%"
                    height={200}
                    resizeMode="cover"
                  />
                  {isUploading && (
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      bottom={0}
                      bg="$black"
                      opacity={0.5}
                      alignItems="center"
                      justifyContent="center"
                    >
                      <VStack space="sm" alignItems="center">
                        <Spinner color="$white" />
                        <Text color="$white" fontSize="$sm">
                          Uploading...
                        </Text>
                      </VStack>
                    </Box>
                  )}
                  {cloudinaryUrl && !isUploading && (
                    <Box
                      position="absolute"
                      top="$2"
                      left="$2"
                      bg="$success500"
                      px="$2"
                      py="$1"
                      borderRadius="$sm"
                    >
                      <Text color="$white" fontSize="$xs" fontWeight="$bold">
                        ✓ Cloud
                      </Text>
                    </Box>
                  )}
                  <Pressable
                    position="absolute"
                    top="$2"
                    right="$2"
                    bg="$error500"
                    borderRadius="$full"
                    p="$2"
                    onPress={() => removeImage(index)}
                  >
                    <Text color="$white" fontSize="$sm" fontWeight="$bold">
                      ✕
                    </Text>
                  </Pressable>
                </Box>
              );
            })}
          </VStack>
        )}

        {selectedImages.length === 0 && (
          <Box
            bg="$backgroundLight100"
            borderRadius="$lg"
            p="$8"
            alignItems="center"
            justifyContent="center"
            minHeight={200}
          >
            <Text color="$textLight400" fontSize="$md" textAlign="center">
              No images selected
            </Text>
            {uploadToCloud && !isCloudinaryConfigured() && (
              <Text color="$error500" fontSize="$sm" textAlign="center" mt="$2">
                ⚠️ Cloudinary not configured. Set EXPO_PUBLIC_CLOUDINARY_* in .env
              </Text>
            )}
          </Box>
        )}
      </VStack>
    </Box>
  );
}

