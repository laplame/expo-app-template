# GPS Navigation Feature Documentation

## Overview
The GPS Navigation feature provides location services including current location retrieval and real-time location tracking.

## Component: GPSNavigationComponent

### Location
`src/components/GPSNavigationComponent.tsx`

### Props
- `onLocationUpdate?: (location: LocationData) => void` - Callback when location is updated
- `watchLocation?: boolean` - Whether to automatically watch location changes (default: false)
- `updateInterval?: number` - Interval for location updates in milliseconds (default: 1000)

### LocationData Interface
```typescript
interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;      // Accuracy in meters
  altitude?: number;      // Altitude in meters
  heading?: number;       // Heading in degrees
  speed?: number;         // Speed in m/s
}
```

## Features

### Location Services
- **Current Location**: Get one-time current location
- **Location Watching**: Continuously track location changes
- **Location Details**: Display comprehensive location information including:
  - Latitude and Longitude (formatted to 6 decimal places)
  - Accuracy in meters
  - Altitude in meters
  - Speed in m/s
  - Heading in degrees

### Permissions
- **Location Permission**: Requests foreground location permissions
- **Permission Handling**: Graceful handling of denied permissions with user-friendly messages

### User Experience
- Loading states during location retrieval
- Error handling for GPS unavailability
- Real-time location updates when watching
- Clear display of location coordinates and metadata

## Usage Example

```typescript
import GPSNavigationComponent from '../components/GPSNavigationComponent';

const handleLocationUpdate = (location: LocationData) => {
  console.log('Location:', location);
  // Save to database, send to server, update map, etc.
};

<GPSNavigationComponent
  onLocationUpdate={handleLocationUpdate}
  watchLocation={false}
  updateInterval={1000}
/>
```

## Screen: GPSNavigationScreen

### Location
`src/screens/GPSNavigationScreen.tsx`

### Description
Example implementation showing current location with all available location data.

## Dependencies
- `expo-location` - For accessing device GPS and location services

## Testing
See `features/gps-navigation.feature` for Gherkin test scenarios.

## Permissions Required

### iOS (Info.plist)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need access to your location for GPS navigation</string>
```

### Android (AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## Accuracy Levels

The component uses `Location.Accuracy.Balanced` which provides:
- Good balance between accuracy and battery usage
- Suitable for most navigation use cases
- Updates based on device movement (10m distance interval)

## Best Practices

1. **Battery Optimization**: Only watch location when necessary
2. **Permission Handling**: Always check and request permissions before accessing location
3. **Error Handling**: Provide clear error messages when location is unavailable
4. **Privacy**: Inform users why location access is needed

