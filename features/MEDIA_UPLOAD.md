# Media Upload Feature Documentation

## Overview
The Media Upload feature allows users to select and upload images from their device's gallery or camera.

## Component: MediaUploadComponent

### Location
`src/components/MediaUploadComponent.tsx`

### Props
- `title?: string` - Optional title for the component (default: "Upload Media")
- `onMediaSelected?: (uri: string, cloudinaryUrl?: string) => void` - Callback when media is selected (includes Cloudinary URL if uploaded)
- `onMediaRemoved?: () => void` - Callback when media is removed
- `maxImages?: number` - Maximum number of images allowed (default: 1)
- `allowMultiple?: boolean` - Whether to allow multiple image selection (default: false)
- `uploadToCloud?: boolean` - Enable automatic Cloudinary upload (default: false)
- `cloudinaryFolder?: string` - Cloudinary folder for organizing uploads (optional)

## Features

### Image Selection
- **Gallery Access**: Select images from device gallery
- **Camera Access**: Take photos directly with device camera
- **Multiple Selection**: Support for selecting multiple images (configurable)
- **Image Preview**: Display selected images with preview
- **Image Removal**: Remove selected images individually

### Permissions
- **Media Library Permission**: Requests access to device photo library
- **Camera Permission**: Requests access to device camera
- **Permission Handling**: Graceful handling of denied permissions with user-friendly messages

### Image Processing
- **Image Editing**: Allows basic image editing (crop, resize)
- **Quality Control**: Configurable image quality (default: 0.8)
- **Aspect Ratio**: Maintains 4:3 aspect ratio for consistency

### Cloudinary Integration
- **Automatic Upload**: Upload images to Cloudinary automatically
- **Upload Progress**: Visual progress indicator during upload
- **Success Indicator**: Badge showing successful cloud upload
- **Fallback**: Falls back to local storage if upload fails
- **Folder Organization**: Organize uploads in Cloudinary folders
- See [CLOUDINARY.md](CLOUDINARY.md) for detailed Cloudinary setup and usage

## Usage Example

```typescript
import MediaUploadComponent from '../components/MediaUploadComponent';

const handleMediaSelected = (uri: string, cloudinaryUrl?: string) => {
  console.log('Local URI:', uri);
  if (cloudinaryUrl) {
    console.log('Cloudinary URL:', cloudinaryUrl);
    // Save cloudinaryUrl to database
  }
};

const handleMediaRemoved = () => {
  console.log('Media removed');
  // Handle removal if needed
};

// Basic usage
<MediaUploadComponent
  title="Upload Media"
  onMediaSelected={handleMediaSelected}
  onMediaRemoved={handleMediaRemoved}
  maxImages={5}
  allowMultiple={true}
/>

// With Cloudinary upload
<MediaUploadComponent
  title="Upload Media"
  onMediaSelected={handleMediaSelected}
  onMediaRemoved={handleMediaRemoved}
  maxImages={5}
  allowMultiple={true}
  uploadToCloud={true}
  cloudinaryFolder="user-uploads"
/>
```

## Screen: MediaUploadScreen

### Location
`src/screens/MediaUploadScreen.tsx`

### Description
Example implementation allowing users to upload up to 5 images with multiple selection enabled.

## Dependencies
- `expo-image-picker` - For accessing device camera and gallery
- Cloudinary service (via REST API) - For cloud image storage

## Cloudinary Setup
To enable Cloudinary uploads:
1. Create a Cloudinary account at https://cloudinary.com
2. Get your cloud name and create an unsigned upload preset
3. Add credentials to `.env` file:
   ```env
   EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
   ```
4. Set `uploadToCloud={true}` in MediaUploadComponent

See [CLOUDINARY.md](CLOUDINARY.md) for complete setup guide.

## Testing
See `features/media-upload.feature` for Gherkin test scenarios.

## Permissions Required

### iOS (Info.plist)
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to upload images</string>
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CAMERA" />
```

