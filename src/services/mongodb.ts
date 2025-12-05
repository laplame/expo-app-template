import { useState, useEffect } from 'react';

/**
 * TODO: MODIFY - Update API base URL
 * 
 * Backend API base URL
 * IMPORTANT: The MongoDB driver cannot run directly in React Native/Expo.
 * You need to create a backend API (Node.js, Express, etc.) that connects to MongoDB Atlas.
 * This service provides a client interface to communicate with your backend API.
 * 
 * To modify:
 * 1. Set EXPO_PUBLIC_API_URL in .env file
 * 2. Or update the default URL below
 */
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Check connection to backend API (which connects to MongoDB Atlas)
 * Note: This requires a backend server running that connects to MongoDB Atlas.
 * The MongoDB driver cannot run directly in React Native/Expo.
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Error checking API connection:', error);
    return false;
  }
}

/**
 * React hook for MongoDB connection status (via backend API)
 * Note: This checks the connection to your backend API, which should connect to MongoDB Atlas.
 */
export function useMongoDB() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkConnectionStatus = async () => {
      setIsLoading(true);
      try {
        const connected = await checkConnection();
        setIsConnected(connected);
      } catch (error) {
        console.error('Error checking connection:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkConnectionStatus();
  }, []);

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const connected = await checkConnection();
      setIsConnected(connected);
    } catch (error) {
      console.error('Connection test failed:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    isLoading,
    testConnection,
  };
}

/**
 * CRUD operations via backend API
 * These functions call your backend API endpoints which handle MongoDB Atlas operations.
 * 
 * Example backend endpoint structure:
 * POST   /api/:collection     - Create document
 * GET    /api/:collection     - Find documents
 * GET    /api/:collection/:id - Get document by ID
 * PUT    /api/:collection/:id - Update document
 * DELETE /api/:collection/:id - Delete document
 */
export const mongoOperations = {
  // Create a document
  async create(collectionName: string, document: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/${collectionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(document),
      });
      if (!response.ok) throw new Error('Failed to create document');
      return await response.json();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  },

  // Read documents
  async find(collectionName: string, query: any = {}) {
    try {
      const queryString = new URLSearchParams(query).toString();
      const url = `${API_BASE_URL}/${collectionName}${queryString ? `?${queryString}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch documents');
      return await response.json();
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
  },

  // Get document by ID
  async findById(collectionName: string, id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/${collectionName}/${id}`);
      if (!response.ok) throw new Error('Failed to fetch document');
      return await response.json();
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  },

  // Update a document
  async update(collectionName: string, id: string, update: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/${collectionName}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });
      if (!response.ok) throw new Error('Failed to update document');
      return await response.json();
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  // Delete a document
  async delete(collectionName: string, id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/${collectionName}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete document');
      return await response.json();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },
};

