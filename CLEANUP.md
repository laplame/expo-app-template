# Cleanup and Modification Guide

This document lists files and code sections that can be deleted or modified.

## 🗑️ Files to Delete

### 1. `src/components/CollapsibleMenu.tsx`
**Status:** ⚠️ DEPRECATED - Can be deleted

**Reason:** 
- Replaced by `CustomDrawerContent.tsx`
- No longer used in any screens
- Legacy component from before drawer navigation implementation

**Action:** 
```bash
rm src/components/CollapsibleMenu.tsx
```

**Note:** If you want to keep it for reference, it's already marked with deprecation comments.

---

## ✏️ Files to Modify

### 1. `src/navigation/AppNavigator.tsx`

#### Header Styling (Lines 30-35)
**Current:** Purple header (#6200ee) with white text
**TODO:** Customize colors to match your brand
```typescript
headerStyle: {
  backgroundColor: '#6200ee',  // MODIFY: Change to your brand color
},
headerTintColor: '#fff',  // MODIFY: Change text color if needed
```

#### Drawer Width (Line 88)
**Current:** 280px
**TODO:** Adjust based on your design needs
```typescript
drawerStyle: {
  width: 280,  // MODIFY: Adjust drawer width
},
```

#### Adding New Screens
**Location:** `RootStackParamList` type (Lines 14-20)
**TODO:** Add new screen types when creating new screens
1. Add screen name and params to `RootStackParamList`
2. Add screen to `Stack.Navigator`
3. Add menu item to `CustomDrawerContent.tsx`

---

### 2. `src/services/mongodb.ts`

#### API Base URL (Line 7)
**Current:** `http://localhost:3000/api`
**TODO:** Update with your backend API URL
```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
```

**Action:**
1. Create `.env` file with `EXPO_PUBLIC_API_URL=your-api-url`
2. Or modify the default URL in the code

---

### 3. `src/components/CustomDrawerContent.tsx`

#### Menu Items (Lines 16-20)
**Current:** 5 menu items (Home, Details, Form, Media Upload, GPS Navigation)
**TODO:** Add/remove/modify menu items as needed
```typescript
const drawerItems: DrawerItem[] = [
  { id: '1', title: 'Home', screen: 'Home', icon: '🏠' },
  // MODIFY: Add or remove items here
];
```

---

### 4. Screen Components

#### HomeScreen.tsx
**TODO:** 
- Modify MongoDB connection status display (Lines 34-42)
- Update feature list (Lines 46-73)
- Customize welcome message

#### DetailsScreen.tsx
**TODO:**
- Modify item information display
- Update navigation features list
- Customize details card content

#### FormScreen.tsx
**TODO:**
- Modify form fields (Lines 7-35)
- Update submit handler (Lines 38-45)
- Customize form title and labels

#### MediaUploadScreen.tsx
**TODO:**
- Modify max images limit (Line 19)
- Update allowMultiple setting (Line 20)
- Customize media selection handlers

#### GPSNavigationScreen.tsx
**TODO:**
- Modify watchLocation setting (Line 18)
- Update updateInterval (Line 19)
- Customize location update handler

---

## 📝 Code Sections with TODO Comments

All files with TODO comments are marked for modification. Search for `TODO:` in the codebase to find all items:

```bash
# Find all TODO comments
grep -r "TODO:" src/
```

### Common TODO Locations:
- `src/navigation/AppNavigator.tsx` - Navigation configuration
- `src/services/mongodb.ts` - API configuration
- `src/components/CustomDrawerContent.tsx` - Menu items
- All screen components - Content and behavior customization

---

## 🔄 Migration Notes

### From CollapsibleMenu to Drawer
If you're migrating from the old CollapsibleMenu:
1. ✅ Drawer is already implemented
2. ✅ All screens use drawer navigation
3. 🗑️ CollapsibleMenu.tsx can be deleted
4. ✅ No code changes needed

---

## 📋 Checklist

- [ ] Delete `src/components/CollapsibleMenu.tsx` (if not needed)
- [ ] Update API URL in `src/services/mongodb.ts`
- [ ] Customize header colors in `src/navigation/AppNavigator.tsx`
- [ ] Adjust drawer width if needed
- [ ] Update menu items in `CustomDrawerContent.tsx`
- [ ] Customize screen content in each screen component
- [ ] Update form fields in `FormScreen.tsx`
- [ ] Configure media upload limits
- [ ] Set GPS navigation preferences

---

## 🎨 Styling Customization

### Colors
All components use gluestack-ui tokens. To customize:
- Edit `@gluestack-ui/config` theme
- Or use custom colors in component props

### Typography
Font sizes use gluestack-ui scale:
- `$xs`, `$sm`, `$md`, `$lg`, `$xl`, `$2xl`, `$3xl`, `$4xl`

### Spacing
Use gluestack-ui spacing tokens:
- `$1`, `$2`, `$3`, `$4`, `$5`, etc.

---

## 📚 Related Documentation

- Component documentation: `features/*.md`
- Gherkin scenarios: `features/*.feature`
- Main README: `README.md`

