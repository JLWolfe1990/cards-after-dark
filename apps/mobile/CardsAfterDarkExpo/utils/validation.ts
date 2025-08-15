export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validatePhoneNumber = (phoneNumber: string): ValidationResult => {
  if (!phoneNumber || phoneNumber.trim().length === 0) {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digits
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Check if it's a valid US phone number (10 digits)
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'Please enter a valid 10-digit phone number' };
  }

  // Check if it starts with valid area code (not starting with 0 or 1)
  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true };
};

export const validateVerificationCode = (code: string): ValidationResult => {
  if (!code || code.trim().length === 0) {
    return { isValid: false, error: 'Verification code is required' };
  }

  // Remove all non-digits
  const cleaned = code.replace(/\D/g, '');

  if (cleaned.length !== 6) {
    return { isValid: false, error: 'Verification code must be 6 digits' };
  }

  return { isValid: true };
};

export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (name.trim().length > 50) {
    return { isValid: false, error: `${fieldName} must be less than 50 characters` };
  }

  // Check for valid name characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  if (!nameRegex.test(name.trim())) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, hyphens, and apostrophes` };
  }

  return { isValid: true };
};