import React, { useState } from 'react';
import { Platform, Pressable as RNPressable } from 'react-native';
import {
  Box,
  VStack,
  Input,
  InputField,
  Button,
  ButtonText,
  Text,
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from '@gluestack-ui/themed';
import { useBrandTheme } from '../theme/useBrandTheme';

let DateTimePicker: React.ComponentType<any> | null = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch {
  DateTimePicker = null;
}
const isWeb = Platform.OS === 'web';
const hasNativeDatePicker = DateTimePicker != null && !isWeb;

class DatePickerBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError = () => ({ hasError: true });
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export interface FormField {
  name: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  required?: boolean;
  value?: string;
}

interface FormComponentProps {
  title?: string;
  fields: FormField[];
  submitLabel?: string;
  onSubmit: (data: Record<string, string>) => void;
  initialValues?: Record<string, string>;
}

export default function FormComponent({
  title,
  fields,
  submitLabel = 'Submit',
  onSubmit,
  initialValues = {},
}: FormComponentProps) {
  const { brand } = useBrandTheme();
  const [formData, setFormData] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      if (field.required && !formData[field.name]?.trim()) {
        newErrors[field.name] = `${field.label} is required`;
      } else if (field.type === 'email' && formData[field.name]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.name])) {
          newErrors[field.name] = 'Invalid email format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  // Parse date string (DD/MM/YYYY or YYYY-MM-DD) to Date
  const parseDate = (s: string): Date => {
    if (!s?.trim()) return new Date(1990, 0, 1);
    const d = s.trim();
    const iso = /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (iso) {
      const [y, m, day] = d.split('-').map(Number);
      return new Date(y, m - 1, day);
    }
    const parts = d.split(/[/.-]/);
    if (parts.length >= 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(year) && year > 1900) return new Date(year, month, day);
    }
    return new Date(1990, 0, 1);
  };

  const formatDateForDisplay = (date: Date, locale: 'es' | 'en' = 'es'): string => {
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    if (locale === 'es') return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
  };

  const formatDateForStorage = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [datePickerField, setDatePickerField] = useState<string | null>(null);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date(1990, 0, 1));

  const openDatePicker = (fieldName: string) => {
    const value = formData[fieldName] || '';
    setDatePickerValue(parseDate(value));
    setDatePickerField(fieldName);
  };

  const onDatePickerChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setDatePickerField(null);
    if (selectedDate == null) return;
    setDatePickerValue(selectedDate);
    const field = fields.find((f) => f.name === datePickerField);
    const storageFormat = formatDateForStorage(selectedDate);
    handleChange(datePickerField!, storageFormat);
  };

  const isWeb = Platform.OS === 'web';

  return (
    <Box width="100%" p="$4">
      {title && (
        <Text fontSize="$2xl" fontWeight="$bold" color="$textLight900" mb="$4" textAlign="center">
          {title}
        </Text>
      )}
      <VStack space="lg">
        {fields.map((field) => (
          <FormControl key={field.name} isInvalid={!!errors[field.name]}>
            <FormControlLabel>
              <FormControlLabelText color="$textLight900">
                {field.label}
                {field.required && <Text color="$error500"> *</Text>}
              </FormControlLabelText>
            </FormControlLabel>
            {field.type === 'date' ? (
              <>
                {(!hasNativeDatePicker || isWeb) ? (
                  <Input>
                    <InputField
                      placeholder={field.placeholder || 'YYYY-MM-DD'}
                      value={formData[field.name] || ''}
                      onChangeText={(value) => handleChange(field.name, value)}
                    />
                  </Input>
                ) : (
                  <RNPressable onPress={() => openDatePicker(field.name)}>
                    <Box
                      bg="$backgroundLight0"
                      borderWidth={1}
                      borderColor="$borderLight300"
                      borderRadius="$md"
                      px="$4"
                      py="$3"
                      minHeight={44}
                      justifyContent="center"
                    >
                      <Text color={formData[field.name] ? '$textLight900' : '$textLight500'}>
                        {formData[field.name]
                          ? formatDateForDisplay(parseDate(formData[field.name]), 'es')
                          : (field.placeholder || 'DD/MM/AAAA')}
                      </Text>
                    </Box>
                  </RNPressable>
                )}
                {hasNativeDatePicker && datePickerField === field.name && DateTimePicker && (
                  <DatePickerBoundary
                    fallback={
                      <Input>
                        <InputField
                          placeholder={field.placeholder || 'YYYY-MM-DD'}
                          value={formData[field.name] || ''}
                          onChangeText={(value) => handleChange(field.name, value)}
                        />
                      </Input>
                    }
                  >
                    <>
                      <DateTimePicker
                        value={datePickerValue}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDatePickerChange}
                        maximumDate={new Date()}
                        onTouchCancel={() => setDatePickerField(null)}
                      />
                      {Platform.OS === 'ios' && (
                        <Button size="sm" mt="$2" onPress={() => setDatePickerField(null)}>
                          <ButtonText>Listo</ButtonText>
                        </Button>
                      )}
                    </>
                  </DatePickerBoundary>
                )}
              </>
            ) : (
              <Input>
                <InputField
                  type={field.type || 'text'}
                  placeholder={field.placeholder || field.label}
                  value={formData[field.name] || ''}
                  onChangeText={(value) => handleChange(field.name, value)}
                />
              </Input>
            )}
            {errors[field.name] && (
              <Text fontSize="$sm" color="$error500" mt="$1">
                {errors[field.name]}
              </Text>
            )}
          </FormControl>
        ))}
        <Button onPress={handleSubmit} mt="$4" bg={brand}>
          <ButtonText color="$white">{submitLabel}</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}

