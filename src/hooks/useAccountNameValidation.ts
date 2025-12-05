import { useState, useCallback } from 'react';

export const useAccountNameValidation = () => {
  const [accountName, setAccountName] = useState('');
  const [error, setError] = useState('');

  const validateAndSetAccountName = useCallback((input: string) => {
    // Check for uppercase characters
    if (/[A-Z]/.test(input)) {
      setError('Uppercase letters not allowed. Use lowercase only.');
    } else {
      setError('');
    }

    // Convert to lowercase and remove invalid characters
    const name = input.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15);
    setAccountName(name);

    // Check length limit
    if (input.length > 15) {
      setError('Maximum 15 characters allowed.');
    }

    return name;
  }, []);

  const clearAccountName = useCallback(() => {
    setAccountName('');
    setError('');
  }, []);

  const isValid = !error && accountName.length > 0;

  return {
    accountName,
    error,
    isValid,
    validateAndSetAccountName,
    clearAccountName,
  };
};
