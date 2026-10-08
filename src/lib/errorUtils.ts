// Friendly Firebase and Application Error Message Utilities

export function getFriendlyErrorMessage(error: unknown, fallback: string = 'An unexpected error occurred.'): string {
  if (!error) return fallback;

  const rawMsg = error instanceof Error ? error.message : String(error);

  if (rawMsg.includes('auth/email-already-in-use')) {
    return 'This email address is already in use by an existing account.';
  }
  if (rawMsg.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (rawMsg.includes('auth/weak-password')) {
    return 'Password is too weak. Please use at least 8 characters (or 12+ characters for generated credentials).';
  }
  if (rawMsg.includes('auth/wrong-password') || rawMsg.includes('auth/invalid-credential')) {
    return 'Incorrect email or password. Please verify your credentials and try again.';
  }
  if (rawMsg.includes('auth/user-not-found')) {
    return 'No account exists with this email address.';
  }
  if (rawMsg.includes('auth/too-many-requests')) {
    return 'Too many attempts. Access temporarily locked for security. Please try again shortly.';
  }
  if (rawMsg.includes('auth/network-request-failed')) {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('permission_denied')) {
    return 'Permission denied by system security rules.';
  }

  return rawMsg;
}
