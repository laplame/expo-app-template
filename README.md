# Expo App Template

A comprehensive Expo app template with TypeScript, React Navigation, drawer menu, reusable components, and MongoDB Atlas integration.

## Features

- ✅ TypeScript (TSX) support
- ✅ React Navigation with drawer and stack navigators
- ✅ Multiple screens (Home, Details, Form, Media Upload, GPS Navigation)
- ✅ Drawer menu component with smooth animations
- ✅ Reusable form component with validation
- ✅ Media upload component (gallery & camera)
- ✅ GPS navigation component with location tracking
- ✅ MongoDB Atlas integration
- ✅ Type-safe navigation
- ✅ Gluestack UI components
- ✅ Feature documentation with Gherkin scenarios

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your credentials:
# - MongoDB/Backend API URL
# - Cloudinary credentials (cloud name, upload preset)
# - Optional: Google Maps API key, etc.
```

See `.env.example` for all available configuration options.

2. Configure MongoDB Atlas:
   - Copy `.env.example` to `.env`
   - Get your MongoDB Atlas connection string from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Replace the placeholder values in `.env` with your actual credentials

3. Start the app:
```bash
npm start
```

## Project Structure

```
expo-app-template/
├── features/                      # Feature documentation and Gherkin scenarios
│   ├── form.feature              # Form feature scenarios
│   ├── media-upload.feature       # Media upload feature scenarios
│   ├── gps-navigation.feature     # GPS navigation feature scenarios
│   ├── navigation.feature        # Navigation feature scenarios
│   ├── FORM.md                    # Form feature documentation
│   ├── MEDIA_UPLOAD.md           # Media upload documentation
│   ├── GPS_NAVIGATION.md         # GPS navigation documentation
│   └── NAVIGATION.md             # Navigation documentation
├── src/
│   ├── components/
│   │   ├── CustomDrawerContent.tsx    # Drawer menu component
│   │   ├── FormComponent.tsx          # Reusable form component
│   │   ├── MediaUploadComponent.tsx   # Media upload component
│   │   └── GPSNavigationComponent.tsx # GPS navigation component
│   ├── navigation/
│   │   └── AppNavigator.tsx           # Navigation setup
│   ├── screens/
│   │   ├── HomeScreen.tsx             # Home screen
│   │   ├── DetailsScreen.tsx          # Details screen
│   │   ├── FormScreen.tsx            # Form screen
│   │   ├── MediaUploadScreen.tsx     # Media upload screen
│   │   └── GPSNavigationScreen.tsx   # GPS navigation screen
│   └── services/
│       └── mongodb.ts                 # MongoDB Atlas integration
├── App.tsx                            # Main app entry point
└── package.json
```

## MongoDB Atlas Configuration

**Important**: The MongoDB driver cannot run directly in React Native/Expo. You need to create a backend API (Node.js/Express) that connects to MongoDB Atlas.

### Setting up a Backend API

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster and get your connection string
3. Create a backend API (Node.js/Express) that:
   - Connects to MongoDB Atlas using the official MongoDB driver
   - Exposes REST endpoints for CRUD operations
   - Handles authentication and security
4. Update `.env` with your backend API URL:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:3000/api
   ```

### Example Backend Structure

Your backend should have endpoints like:
- `POST /api/:collection` - Create document
- `GET /api/:collection` - Find documents
- `GET /api/:collection/:id` - Get document by ID
- `PUT /api/:collection/:id` - Update document
- `DELETE /api/:collection/:id` - Delete document

## Usage

### Navigation

The app uses React Navigation with a drawer and stack navigator. Navigate between screens using:

```typescript
navigation.navigate('Details', { itemId: '123' });
```

#### Drawer Menu

Access the drawer menu by:
- Clicking the hamburger menu button (☰) in any screen header
- Swiping from the left edge of the screen

Available screens:
- 🏠 Home
- 📄 Details
- 📝 Form
- 📷 Media Upload
- 📍 GPS Navigation

### Reusable Components

#### FormComponent

A reusable form component with validation:

```typescript
import FormComponent, { FormField } from '../components/FormComponent';

const fields: FormField[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
  },
];

<FormComponent
  title="Contact Form"
  fields={fields}
  onSubmit={(data) => console.log(data)}
/>
```

See [features/FORM.md](features/FORM.md) for detailed documentation.

#### MediaUploadComponent

Upload images from gallery or camera:

```typescript
import MediaUploadComponent from '../components/MediaUploadComponent';

<MediaUploadComponent
  onMediaSelected={(uri) => console.log(uri)}
  allowMultiple={true}
  maxImages={5}
/>
```

See [features/MEDIA_UPLOAD.md](features/MEDIA_UPLOAD.md) for detailed documentation.

#### GPSNavigationComponent

Get current location and track GPS:

```typescript
import GPSNavigationComponent from '../components/GPSNavigationComponent';

<GPSNavigationComponent
  onLocationUpdate={(location) => console.log(location)}
  watchLocation={false}
/>
```

See [features/GPS_NAVIGATION.md](features/GPS_NAVIGATION.md) for detailed documentation.

### MongoDB Operations (via Backend API)

Use the MongoDB service to interact with your backend API:

```typescript
import { mongoOperations } from './src/services/mongodb';

// Create
await mongoOperations.create('users', { name: 'John', email: 'john@example.com' });

// Read all
const users = await mongoOperations.find('users');

// Read by ID
const user = await mongoOperations.findById('users', 'user-id-123');

// Update
await mongoOperations.update('users', 'user-id-123', { email: 'newemail@example.com' });

// Delete
await mongoOperations.delete('users', 'user-id-123');
```

## Feature Documentation

All features are documented with:
- **Gherkin scenarios** (`.feature` files) for behavior-driven development
- **Markdown documentation** (`.md` files) with usage examples and API references

### Available Features

1. **Form Management** - [features/FORM.md](features/FORM.md)
   - Reusable form component with validation
   - Email format validation
   - Required field validation
   - Real-time error handling

2. **Media Upload** - [features/MEDIA_UPLOAD.md](features/MEDIA_UPLOAD.md)
   - Gallery and camera access
   - Multiple image selection
   - Image preview and removal
   - Permission handling
   - **Cloudinary integration** - [features/CLOUDINARY.md](features/CLOUDINARY.md)
   - Automatic cloud upload
   - Upload progress indicators

3. **GPS Navigation** - [features/GPS_NAVIGATION.md](features/GPS_NAVIGATION.md)
   - Current location retrieval
   - Real-time location tracking
   - Location data display (coordinates, accuracy, speed, heading)
   - Permission management

4. **Navigation** - [features/NAVIGATION.md](features/NAVIGATION.md)
   - Drawer menu navigation
   - Stack navigator integration
   - Type-safe navigation
   - Smooth animations

## Dependencies

### Core
- `expo` - Expo framework
- `react` & `react-native` - React and React Native
- `typescript` - TypeScript support

### Navigation
- `@react-navigation/native` - Core navigation
- `@react-navigation/native-stack` - Stack navigator
- `@react-navigation/drawer` - Drawer navigator
- `react-native-drawer-layout` - Drawer implementation
- `react-native-gesture-handler` - Gesture handling
- `react-native-safe-area-context` - Safe area handling

### UI Components
- `@gluestack-ui/themed` - UI component library
- `@gluestack-ui/config` - UI configuration
- `@gluestack-style/react` - Styling system

### Features
- `expo-image-picker` - Image selection and camera
- `expo-location` - GPS and location services

### Cloud Storage
- Cloudinary integration (via REST API) - Cloud image storage and management

### Aria Support
- `@react-native-aria/focus` - Focus management
- `@react-native-aria/interactions` - Interaction handling
- `@react-native-aria/overlays` - Overlay management
- `@react-native-aria/utils` - Utility functions

## Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Start on Android
- `npm run ios` - Start on iOS
- `npm run web` - Start on web

## Testing

The project includes Gherkin feature files for behavior-driven development (BDD). These can be used with testing frameworks like:
- Cucumber
- Jest with Gherkin
- Other BDD testing tools

Feature files are located in the `features/` directory:
- `form.feature`
- `media-upload.feature`
- `gps-navigation.feature`
- `navigation.feature`

## Cleanup and Modification Guide

See [CLEANUP.md](CLEANUP.md) for a comprehensive guide on:
- Files that can be deleted
- Code sections that need modification
- TODO comments throughout the codebase
- Customization instructions

## License

MIT

