import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  // State to store our value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = (value) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  // Listen for changes to this key in other tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage change for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

// Helper hook for multiple localStorage values
export function useLocalStorageMultiple(keys) {
  const [values, setValues] = useState(() => {
    const initialValues = {};
    keys.forEach(({ key, initialValue }) => {
      try {
        const item = window.localStorage.getItem(key);
        initialValues[key] = item ? JSON.parse(item) : initialValue;
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error);
        initialValues[key] = initialValue;
      }
    });
    return initialValues;
  });

  const setValueFor = (key, value) => {
    try {
      const valueToStore = value instanceof Function ? value(values[key]) : value;
      setValues(prev => ({ ...prev, [key]: valueToStore }));
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValueFor = (key) => {
    try {
      window.localStorage.removeItem(key);
      const keyConfig = keys.find(k => k.key === key);
      setValues(prev => ({ ...prev, [key]: keyConfig?.initialValue }));
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [values, setValueFor, removeValueFor];
}
