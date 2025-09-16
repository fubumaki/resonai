export const PERMISSION_PRIMER_COPY = {
  title: 'Microphone Access',
  body: [
    'We use your mic to give you instant feedback during practice.',
    "You're in control; recordings stay on your device during practice.",
  ],
  actions: {
    primary: 'Continue',
    secondary: 'Not now',
  },
  aria: {
    titleId: 'primer-title',
    descriptionId: 'primer-description',
  },
} as const;

export type PermissionPrimerCopy = typeof PERMISSION_PRIMER_COPY;

export function getPermissionPrimerCopy(): PermissionPrimerCopy {
  return PERMISSION_PRIMER_COPY;
}
