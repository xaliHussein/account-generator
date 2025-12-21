/**
 * Copy text to clipboard with fallback for older browsers
 */
export const copyToClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        return { success: true };
      } else {
        throw new Error('Copy command failed');
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Copy account credentials in a formatted string
 */
export const copyAccountCredentials = async (account) => {
  const text = `Account ID: ${account.accountId}
Username: ${account.username}
Email: ${account.email}
Password: ${account.password}`;
  
  return await copyToClipboard(text);
};

/**
 * Copy just the password
 */
export const copyPassword = async (password) => {
  return await copyToClipboard(password);
};

/**
 * Copy just the email
 */
export const copyEmail = async (email) => {
  return await copyToClipboard(email);
};

/**
 * Copy just the username
 */
export const copyUsername = async (username) => {
  return await copyToClipboard(username);
};

export default {
  copyToClipboard,
  copyAccountCredentials,
  copyPassword,
  copyEmail,
  copyUsername,
};
