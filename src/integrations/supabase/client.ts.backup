// Keyper Supabase Client Configuration - Self-Hosting Support
// Made with ❤️ by Pink Pixel
// This file provides the Supabase client with both default and custom configurations.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Default Supabase configuration - placeholder values for self-hosted version
// Users will configure their own Supabase instance through the Settings UI
const DEFAULT_SUPABASE_URL = "https://your-project.supabase.co";
const DEFAULT_SUPABASE_KEY = "your-anon-key";

// Storage keys for Supabase credentials
export const SUPABASE_URL_KEY = 'keyper-supabase-url';
export const SUPABASE_KEY_KEY = 'keyper-supabase-key';
export const SUPABASE_USERNAME_KEY = 'keyper-username';


// Helper function to get the current Supabase URL and key
export const getSupabaseCredentials = () => {
  try {
    // Try to get custom credentials from localStorage
    const customUrl = localStorage.getItem(SUPABASE_URL_KEY);
    const customKey = localStorage.getItem(SUPABASE_KEY_KEY);
    const username = localStorage.getItem(SUPABASE_USERNAME_KEY);

    // Use custom values if they exist, otherwise fall back to defaults
    return {
      supabaseUrl: customUrl || DEFAULT_SUPABASE_URL,
      supabaseKey: customKey || DEFAULT_SUPABASE_KEY,
      username: username || 'self-hosted-user'
    };
  } catch (error) {
    console.error("Error retrieving Supabase credentials from localStorage:", error);
    // Fall back to defaults if localStorage is not available or throws an error
    return {
      supabaseUrl: DEFAULT_SUPABASE_URL,
      supabaseKey: DEFAULT_SUPABASE_KEY,
      username: 'self-hosted-user'
    };
  }
};

// Function to clear custom Supabase credentials and revert to defaults
export const clearSupabaseCredentials = () => {
  try {
    localStorage.removeItem(SUPABASE_URL_KEY);
    localStorage.removeItem(SUPABASE_KEY_KEY);
    localStorage.removeItem(SUPABASE_USERNAME_KEY);
    console.log("Supabase credentials cleared, reverting to defaults");
    return true;
  } catch (error) {
    console.error("Error clearing Supabase credentials:", error);
    return false;
  }
};


// Helper function to get the current username for filtering
export const getCurrentUsername = () => {
  try {
    return localStorage.getItem(SUPABASE_USERNAME_KEY) || 'self-hosted-user';
  } catch (error) {
    console.error("Error retrieving username from localStorage:", error);
    return 'self-hosted-user';
  }
};

// Function to save Supabase credentials to localStorage
export const saveSupabaseCredentials = (url: string, key: string, username?: string) => {
  try {
    localStorage.setItem(SUPABASE_URL_KEY, url);
    localStorage.setItem(SUPABASE_KEY_KEY, key);
    if (username) {
      localStorage.setItem(SUPABASE_USERNAME_KEY, username);
    }
    console.log("Supabase credentials saved to localStorage");
    return true;
  } catch (error) {
    console.error("Error saving Supabase credentials:", error);
    return false;
  }
};


// Create Supabase client with current credentials
let supabaseClient: ReturnType<typeof createClient<Database>>;

// Initialize the client lazily to ensure we have the latest credentials
const initializeClient = () => {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

  // Create client with options for better error handling
  supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  return supabaseClient;
};

// Export the supabase client, initializing it if needed
export const supabase = initializeClient();

// Function to create a new client with the latest credentials
// Use this when credentials have been updated and a new client is needed
export const createSupabaseClient = () => {
  const { supabaseUrl, supabaseKey } = getSupabaseCredentials();

  // Create client with options for better error handling
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
};

// Function to create a test client with custom credentials
// This is used in Settings to test a connection before saving
export const createTestSupabaseClient = (url: string, key: string) => {
  // Basic validation
  if (!url || !key) {
    throw new Error('URL and API key are required');
  }

  // Validate URL format
  try {
    const urlObj = new URL(url);
    
    // Check if it's a valid HTTP/HTTPS URL
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('URL must use http:// or https:// protocol');
    }
    
    // Flexible validation - allow localhost, IPs, and supabase URLs
    const hostname = urlObj.hostname.toLowerCase();
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.');
    const isSupabaseCloud = hostname.includes('supabase.co') || hostname.includes('supabase.com');
    const isCustomDomain = hostname.includes('supabase') || isLocalhost;
    
    if (!isSupabaseCloud && !isCustomDomain && !isLocalhost) {
      console.warn('URL does not appear to be a Supabase instance. Supported formats:', {
        'Supabase Cloud': 'https://your-project.supabase.co',
        'Self-hosted': 'http://localhost:54321 or https://supabase.yourdomain.com',
        'Local network': 'http://192.168.1.100:54321'
      });
    }
    
    console.log('Supabase URL validation passed:', {
      url: url,
      hostname: hostname,
      isLocalhost,
      isSupabaseCloud,
      isCustomDomain
    });
    
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid URL format: ${url}. Please ensure it includes the protocol (http:// or https://)`);
    }
    throw error;
  }

  // Create test client
  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

// Function to refresh the main supabase client after credentials change
export const refreshSupabaseClient = () => {
  // Reinitialize the client with new credentials
  const newClient = initializeClient();
  // Update the exported reference
  Object.assign(supabase, newClient);
  return supabase;
};