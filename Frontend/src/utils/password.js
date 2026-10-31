export function getPasswordChecks(password = '') {
  return [
    { label: 'More than 8 characters', passed: password.length > 8 },
    { label: 'Uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Special character', passed: /[^A-Za-z0-9]/.test(password) },
  ];
}
