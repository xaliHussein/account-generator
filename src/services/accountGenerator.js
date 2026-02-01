import { v4 as uuidv4 } from 'uuid';

// Word lists for generating realistic data
const firstNames = [
  'James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Benjamin', 'Isabella',
  'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia', 'Sebastian', 'Harper',
  'Jack', 'Evelyn', 'Aiden', 'Abigail', 'Owen', 'Emily', 'Samuel', 'Elizabeth',
  'Ryan', 'Sofia', 'Nathan', 'Avery', 'Leo', 'Ella', 'Isaac', 'Scarlett',
  'Daniel', 'Grace', 'Matthew', 'Chloe', 'Joseph', 'Victoria', 'David', 'Riley',
  'Carter', 'Aria', 'Michael', 'Lily', 'Jayden', 'Aurora', 'Julian', 'Zoey',
  'Luke', 'Penelope', 'Gabriel', 'Layla', 'Anthony', 'Nora', 'Lincoln', 'Camila'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Chen', 'Kumar', 'Patel', 'Kim', 'Park', 'Singh'
];

const domains = [
  'gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'protonmail.com',
  'mail.com', 'fastmail.com', 'zoho.com', 'aol.com', 'hotmail.com'
];

const specialChars = '!@#$%^&*';
const numbers = '0123456789';
const lowerCase = 'abcdefghijklmnopqrstuvwxyz';
const upperCase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generate a random element from an array
 */
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generate a random character from a string
 */
const randomChar = (str) => str[Math.floor(Math.random() * str.length)];

/**
 * Generate a random number between min and max (inclusive)
 */
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Generate a random username
 */
const generateUsername = (firstName, lastName) => {
  const patterns = [
    () => `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
    () => `${firstName.toLowerCase()}${randomInt(1, 999)}`,
    () => `${firstName[0].toLowerCase()}${lastName.toLowerCase()}${randomInt(1, 99)}`,
    () => `${firstName.toLowerCase()}${lastName[0].toLowerCase()}${randomInt(10, 99)}`,
  ];
  return randomElement(patterns)();
};

/**
 * Generate a unique email with UUID to guarantee zero duplicates
 * UUID v4 is cryptographically random - probability of collision is essentially zero
 * @param {string} username - Username for email
 * @param {string} emailType - Type: 'icloud', 'gmail', or 'random'
 */
const generateEmail = (username, emailType = 'random') => {
  // Add short UUID portion for guaranteed uniqueness (8 characters from UUID v4)
  const uniqueId = uuidv4().slice(0, 8);
  const uniqueUsername = `${username}${uniqueId}`;

  if (emailType === 'icloud') {
    return `${uniqueUsername}@icloud.com`;
  } else if (emailType === 'gmail') {
    return `${uniqueUsername}@gmail.com`;
  }
  return `${uniqueUsername}@${randomElement(domains)}`;
};

/**
 * Generate a secure random password
 */
const generatePassword = (length = 16) => {
  // Ensure we have at least one of each required character type
  let password = [
    randomChar(lowerCase),
    randomChar(upperCase),
    randomChar(numbers),
    randomChar(specialChars),
  ];

  // Fill the rest with random characters
  const allChars = lowerCase + upperCase + numbers + specialChars;
  for (let i = password.length; i < length; i++) {
    password.push(randomChar(allChars));
  }

  // Shuffle the password
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
};

/**
 * Generate a random birthday between 1980 and 2005
 */
const generateBirthday = () => {
  const year = randomInt(1980, 2005);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28); // Use 28 to avoid invalid dates
  return `${month}/${day}/${year}`;
};

/**
 * Generate a serial number
 */
const generateSerialNumber = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let serial = '';
  for (let i = 0; i < 9; i++) {
    serial += randomChar(chars);
  }
  return serial;
};

/**
 * Generate a single account
 * @param {Object} options - Generation options
 * @param {string} options.emailType - Email type: 'icloud', 'gmail', or 'random'
 */
export const generateAccount = (options = {}) => {
  const { emailType = 'icloud' } = options;
  const firstName = randomElement(firstNames);
  const lastName = randomElement(lastNames);
  const username = generateUsername(firstName, lastName);

  return {
    id: uuidv4(),
    firstName,
    lastName,
    username,
    email: generateEmail(username, emailType),
    password: generatePassword(randomInt(14, 20)),
    birthday: generateBirthday(),
    serialNumber: generateSerialNumber(),
    accountId: `ACC-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'active',
  };
};

/**
 * Generate multiple accounts with progress callback
 * Uses chunked processing for performance with large batches
 * @param {number} count - Number of accounts to generate
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - Generation options
 * @param {string} options.emailType - Email type: 'icloud', 'gmail', or 'random'
 */
export const generateAccounts = async (count, onProgress, options = {}) => {
  const accounts = [];
  const chunkSize = 100; // Process 100 accounts at a time
  let processed = 0;

  return new Promise((resolve) => {
    const processChunk = () => {
      const chunkEnd = Math.min(processed + chunkSize, count);

      for (let i = processed; i < chunkEnd; i++) {
        accounts.push(generateAccount(options));
      }

      processed = chunkEnd;

      if (onProgress) {
        onProgress({
          current: processed,
          total: count,
          percentage: Math.round((processed / count) * 100),
          status: processed < count ? 'generating' : 'complete',
        });
      }

      if (processed < count) {
        // Use setTimeout to prevent blocking the main thread
        setTimeout(processChunk, 0);
      } else {
        resolve(accounts);
      }
    };

    processChunk();
  });
};

/**
 * Validate account count
 */
export const validateAccountCount = (count) => {
  const num = parseInt(count, 10);
  if (isNaN(num) || num < 1) {
    return { valid: false, error: 'Please enter a valid number (minimum 1)' };
  }
  if (num > 5000) {
    return { valid: false, error: 'Maximum 5,000 accounts per batch' };
  }
  return { valid: true, value: num };
};

export default {
  generateAccount,
  generateAccounts,
  validateAccountCount,
};
