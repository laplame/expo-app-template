/**
 * Cloudinary Service
 * 
 * Handles image uploads to Cloudinary using their REST API
 * 
 * Setup:
 * 1. Create a Cloudinary account at https://cloudinary.com
 * 2. Get your cloud name, API key, and API secret from the dashboard
 * 3. Create an unsigned upload preset (recommended for client-side uploads)
 * 4. Add credentials to .env file
 */

const CLOUDINARY_CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
const CLOUDINARY_UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '';
const CLOUDINARY_UPLOAD_FOLDER = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_FOLDER || '';

if (!CLOUDINARY_CLOUD_NAME) {
  console.warn('⚠️ Cloudinary cloud name not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME in .env');
}

if (!CLOUDINARY_UPLOAD_PRESET) {
  console.warn('⚠️ Cloudinary upload preset not configured. Set EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env');
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  transformation?: string;
  tags?: string[];
  context?: Record<string, string>;
}

/**
 * Upload image to Cloudinary
 * 
 * @param imageUri - Local URI of the image (from ImagePicker)
 * @param options - Upload options (folder, tags, transformations, etc.)
 * @returns Promise with upload result containing Cloudinary URL
 */
export async function uploadToCloudinary(
  imageUri: string,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name is not configured');
  }

  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload preset is not configured');
  }

  // Create form data
  const formData = new FormData();
  
  // Convert local URI to blob for upload
  const filename = imageUri.split('/').pop() || 'image.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  // @ts-ignore - FormData append with file object
  formData.append('file', {
    uri: imageUri,
    name: filename,
    type: type,
  } as any);

  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

  // Add folder if specified
  const folder = options.folder || CLOUDINARY_UPLOAD_FOLDER;
  if (folder) {
    formData.append('folder', folder);
  }

  // Add public ID if specified
  if (options.publicId) {
    formData.append('public_id', options.publicId);
  }

  // Add transformations if specified
  if (options.transformation) {
    formData.append('transformation', options.transformation);
  }

  // Add tags if specified
  if (options.tags && options.tags.length > 0) {
    formData.append('tags', options.tags.join(','));
  }

  // Add context if specified
  if (options.context) {
    const contextStrings = Object.entries(options.context).map(
      ([key, value]) => `${key}=${value}`
    );
    formData.append('context', contextStrings.join('|'));
  }

  try {
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Upload failed: ${response.statusText}`
      );
    }

    const result: CloudinaryUploadResult = await response.json();
    return result;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Delete image from Cloudinary
 * 
 * @param publicId - Public ID of the image to delete
 * @param apiKey - Cloudinary API key
 * @param apiSecret - Cloudinary API secret
 * @returns Promise with deletion result
 * 
 * NOTE: This requires API key and secret, typically done server-side
 * For client-side, use a server endpoint that handles deletion
 */
export async function deleteFromCloudinary(
  publicId: string,
  apiKey: string,
  apiSecret: string
): Promise<void> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name is not configured');
  }

  // Generate signature for authenticated request
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  // In production, use a proper hash function like SHA-1

  const deleteUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/destroy`;

  try {
    const formData = new FormData();
    formData.append('public_id', publicId);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);

    const response = await fetch(deleteUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || `Delete failed: ${response.statusText}`
      );
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Get Cloudinary image URL with transformations
 * 
 * @param publicId - Public ID of the image
 * @param transformations - Cloudinary transformation string
 * @returns Full Cloudinary URL
 */
export function getCloudinaryUrl(
  publicId: string,
  transformations?: string
): string {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name is not configured');
  }

  const baseUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  
  if (transformations) {
    return `${baseUrl}/${transformations}/${publicId}`;
  }
  
  return `${baseUrl}/${publicId}`;
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET);
}

