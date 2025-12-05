# Cloudinary Integration Documentation

## Overview
The app integrates with Cloudinary for cloud-based image storage and management. Images can be uploaded directly from the device to Cloudinary.

## Setup

### 1. Create Cloudinary Account
1. Sign up at https://cloudinary.com (free tier available)
2. Access your dashboard at https://cloudinary.com/console

### 2. Get Credentials
From your Cloudinary dashboard:

**Cloud Name:**
- Found in: Dashboard > Account Details > Cloud name
- Example: `demo`

**API Key & Secret:**
- Found in: Dashboard > Settings > Security > API Keys
- Copy both API Key and API Secret

### 3. Create Upload Preset (Recommended)
1. Go to: Dashboard > Settings > Upload > Upload presets
2. Click "Add upload preset"
3. Set:
   - **Preset name**: e.g., `expo-app-upload`
   - **Signing mode**: Select "Unsigned" (for client-side uploads)
   - **Folder**: Optional, e.g., `expo-app-uploads`
4. Save the preset

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

Optional variables:
```env
EXPO_PUBLIC_CLOUDINARY_UPLOAD_FOLDER=expo-app-uploads
EXPO_PUBLIC_CLOUDINARY_API_KEY=your_api_key
EXPO_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret
```

## Service: cloudinary.ts

### Location
`src/services/cloudinary.ts`

### Functions

#### `uploadToCloudinary(imageUri, options)`
Uploads an image to Cloudinary.

**Parameters:**
- `imageUri: string` - Local URI from ImagePicker
- `options: CloudinaryUploadOptions` - Optional upload settings
  - `folder?: string` - Organize in folder
  - `publicId?: string` - Custom public ID
  - `transformation?: string` - Image transformations
  - `tags?: string[]` - Tags for organization
  - `context?: Record<string, string>` - Metadata

**Returns:** `Promise<CloudinaryUploadResult>`

**Example:**
```typescript
import { uploadToCloudinary } from '../services/cloudinary';

const result = await uploadToCloudinary(imageUri, {
  folder: 'user-uploads',
  tags: ['profile', 'avatar'],
});

console.log('Cloudinary URL:', result.secure_url);
```

#### `getCloudinaryUrl(publicId, transformations?)`
Generates a Cloudinary URL with optional transformations.

**Parameters:**
- `publicId: string` - Cloudinary public ID
- `transformations?: string` - Transformation string

**Returns:** `string`

**Example:**
```typescript
import { getCloudinaryUrl } from '../services/cloudinary';

// Original image
const url = getCloudinaryUrl('sample');

// With transformations (resize to 200x200)
const thumbnail = getCloudinaryUrl('sample', 'w_200,h_200,c_fill');
```

#### `isCloudinaryConfigured()`
Checks if Cloudinary is properly configured.

**Returns:** `boolean`

## Component: MediaUploadComponent

### Cloudinary Integration

The `MediaUploadComponent` supports automatic Cloudinary uploads.

**Props:**
- `uploadToCloud?: boolean` - Enable automatic Cloudinary upload
- `cloudinaryFolder?: string` - Organize uploads in folder

**Example:**
```typescript
<MediaUploadComponent
  uploadToCloud={true}
  cloudinaryFolder="user-uploads"
  onMediaSelected={(localUri, cloudinaryUrl) => {
    console.log('Local:', localUri);
    console.log('Cloudinary:', cloudinaryUrl);
    // Save cloudinaryUrl to database
  }}
/>
```

### Features
- ✅ Automatic upload to Cloudinary
- ✅ Upload progress indicator
- ✅ Success indicator (✓ Cloud badge)
- ✅ Fallback to local storage if upload fails
- ✅ Support for multiple images
- ✅ Folder organization

## Usage Examples

### Basic Upload
```typescript
import { uploadToCloudinary } from '../services/cloudinary';

const handleImage = async (imageUri: string) => {
  try {
    const result = await uploadToCloudinary(imageUri);
    console.log('Uploaded to:', result.secure_url);
    // Save result.secure_url to your database
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

### Upload with Transformations
```typescript
const result = await uploadToCloudinary(imageUri, {
  folder: 'avatars',
  transformation: 'w_400,h_400,c_fill,g_face',
  tags: ['profile', 'avatar'],
});
```

### Get Transformed URL
```typescript
import { getCloudinaryUrl } from '../services/cloudinary';

// Thumbnail
const thumbnail = getCloudinaryUrl('public-id', 'w_150,h_150,c_fill');

// Cropped
const cropped = getCloudinaryUrl('public-id', 'w_800,h_600,c_crop');

// With effects
const filtered = getCloudinaryUrl('public-id', 'e_art:audrey');
```

## Cloudinary Transformations

Common transformation examples:

- **Resize**: `w_400,h_300`
- **Crop**: `w_400,h_300,c_fill`
- **Face detection**: `g_face`
- **Quality**: `q_auto`
- **Format**: `f_auto`
- **Effects**: `e_art:audrey`, `e_sepia`, etc.

Full documentation: https://cloudinary.com/documentation/image_transformations

## Security Best Practices

1. **Use Unsigned Upload Presets** for client-side uploads
2. **Set Upload Limits** in preset settings (max file size, formats)
3. **Use Folders** to organize uploads
4. **Add Tags** for better organization and filtering
5. **Set Expiration** if needed for temporary uploads

## Error Handling

The service includes error handling:
- Configuration validation
- Upload failure recovery
- User-friendly error messages
- Fallback to local storage

## Troubleshooting

### "Cloudinary not configured" warning
- Check `.env` file exists and has correct values
- Verify `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME` is set
- Verify `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET` is set
- Restart Expo dev server after changing `.env`

### Upload fails
- Check internet connection
- Verify upload preset is set to "Unsigned"
- Check file size limits in preset settings
- Verify API credentials are correct

### Images not displaying
- Check Cloudinary URL format
- Verify public_id is correct
- Check if image was successfully uploaded

## Related Files
- `src/services/cloudinary.ts` - Cloudinary service
- `src/components/MediaUploadComponent.tsx` - Upload component
- `src/screens/MediaUploadScreen.tsx` - Example usage
- `.env.example` - Environment variables template

