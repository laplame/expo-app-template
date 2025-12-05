import React, { useState } from 'react';
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

export interface FormField {
  name: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
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
            <Input>
              <InputField
                type={field.type || 'text'}
                placeholder={field.placeholder || field.label}
                value={formData[field.name] || ''}
                onChangeText={(value) => handleChange(field.name, value)}
              />
            </Input>
            {errors[field.name] && (
              <Text fontSize="$sm" color="$error500" mt="$1">
                {errors[field.name]}
              </Text>
            )}
          </FormControl>
        ))}
        <Button onPress={handleSubmit} mt="$4">
          <ButtonText>{submitLabel}</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}

