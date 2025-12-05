import React from 'react';
import { Box, ScrollView, VStack } from '@gluestack-ui/themed';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import FormComponent, { FormField } from '../components/FormComponent';

export default function FormScreen() {
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
    {
      name: 'phone',
      label: 'Phone Number',
      placeholder: 'Enter your phone number',
      type: 'text',
      required: false,
    },
    {
      name: 'message',
      label: 'Message',
      placeholder: 'Enter your message',
      type: 'text',
      required: false,
    },
  ];

  const handleSubmit = (data: Record<string, string>) => {
    console.log('Form submitted:', data);
    // Here you can add your form submission logic
    // For example, send to API, save to database, etc.
    Alert.alert('Success', 'Form submitted successfully!', [
      { text: 'OK' }
    ]);
  };

  return (
    <Box flex={1} bg="$backgroundLight0">
      <StatusBar style="light" />
      <ScrollView flex={1} contentContainerStyle={{ padding: 20 }}>
        <VStack space="lg" alignItems="center">
          <FormComponent
            title="Contact Form"
            fields={formFields}
            submitLabel="Submit Form"
            onSubmit={handleSubmit}
          />
        </VStack>
      </ScrollView>
    </Box>
  );
}

