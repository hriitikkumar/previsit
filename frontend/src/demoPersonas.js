import { colors } from './theme';

// Cosmetic metadata for the four seeded demo patients (see seed_data/seed.py).
// Keyed by patient name so the picker/dashboard can decorate whatever the
// backend actually returns without hardcoding IDs.
export const DEMO_PERSONAS = [
  { name: 'Ramesh Sharma', initials: 'RS', avatarColor: colors.purple, reason: 'Reflux follow-up' },
  { name: 'Priya Verma', initials: 'PV', avatarColor: colors.orange, reason: 'IBS follow-up' },
  { name: 'Fatima Sheikh', initials: 'FS', avatarColor: colors.blue, reason: 'Colonoscopy prep' },
  { name: 'Arjun Nair', initials: 'AN', avatarColor: colors.green, reason: 'Routine gastritis check' },
];

export function personaFor(name) {
  return (
    DEMO_PERSONAS.find((p) => p.name === name) || {
      name,
      initials: name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
      avatarColor: colors.purple,
      reason: '',
    }
  );
}
