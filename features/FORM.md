# Form Feature Documentation

## Overview
The Form feature provides a reusable form component that allows users to input and submit data with validation.

## Component: FormComponent

### Location
`src/components/FormComponent.tsx`

### Props
- `title?: string` - Optional title for the form
- `fields: FormField[]` - Array of form field definitions
- `submitLabel?: string` - Label for the submit button (default: "Submit")
- `onSubmit: (data: Record<string, string>) => void` - Callback function called when form is submitted
- `initialValues?: Record<string, string>` - Initial values for form fields

### FormField Interface
```typescript
interface FormField {
  name: string;              // Field identifier
  label: string;             // Display label
  placeholder?: string;      // Placeholder text
  type?: 'text' | 'email' | 'password' | 'number';  // Input type
  required?: boolean;        // Whether field is required
  value?: string;            // Initial value
}
```

## Features

### Validation
- **Required Fields**: Validates that required fields are not empty
- **Email Format**: Validates email format using regex pattern
- **Error Display**: Shows error messages below invalid fields
- **Real-time Error Clearing**: Errors disappear when user starts typing

### User Experience
- Clean, modern UI using gluestack-ui components
- Clear error messages
- Visual feedback for required fields (asterisk)
- Responsive design

## Usage Example

```typescript
import FormComponent, { FormField } from '../components/FormComponent';

const formFields: FormField[] = [
  {
    name: 'name',
    label: 'Full Name',
    placeholder: 'Enter your full name',
    type: 'text',
    required: true,
  },
  {
    name: 'email',
    label: 'Email',
    placeholder: 'Enter your email',
    type: 'email',
    required: true,
  },
];

const handleSubmit = (data: Record<string, string>) => {
  console.log('Form data:', data);
  // Process form submission
};

<FormComponent
  title="Contact Form"
  fields={formFields}
  submitLabel="Submit Form"
  onSubmit={handleSubmit}
/>
```

## Screen: FormScreen

### Location
`src/screens/FormScreen.tsx`

### Description
Example implementation of the FormComponent with a contact form including:
- Full Name (required)
- Email (required, validated)
- Phone Number (optional)
- Message (optional)

## Testing
See `features/form.feature` for Gherkin test scenarios.

