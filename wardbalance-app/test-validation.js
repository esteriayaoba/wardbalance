const { z } = require('zod');

const formSchema = z.object({
  fullName: z.string().min(1).max(120),
  schoolName: z.string().min(1).max(160),
  email: z.string().min(1).email(),
  phone: z.string().min(1).max(30),
  numberOfStudents: z.string().optional(),
  numberOfBranches: z.string().optional(),
  consentToContact: z.boolean().refine(function(v) { return v === true; }, { message: 'You must agree to be contacted' }),
  message: z.string().max(1000).optional(),
  website: z.string().optional(),
});

var validPayload = {
  fullName: 'John Doe',
  schoolName: 'Test School',
  email: 'john@test.com',
  phone: '+234 801 234 5678',
  numberOfStudents: '',
  numberOfBranches: '',
  consentToContact: true,
  message: '',
  website: '',
};

var r1 = formSchema.safeParse(validPayload);
console.log('Valid payload:', r1.success);

var r2 = formSchema.safeParse(Object.assign({}, validPayload, { consentToContact: 'on' }));
console.log('String consent:', r2.success, r2.success ? '' : JSON.stringify(r2.error.issues));

var p3 = Object.assign({}, validPayload);
delete p3.consentToContact;
var r3 = formSchema.safeParse(p3);
console.log('Missing consent:', r3.success, r3.success ? '' : JSON.stringify(r3.error.issues));

var raw = {};
var uncheckedConsent = raw.consentToContact === 'on';
console.log('Unchecked consent:', uncheckedConsent);
var r4 = formSchema.safeParse(Object.assign({}, validPayload, { consentToContact: uncheckedConsent }));
console.log('Unchecked validation:', r4.success, r4.success ? '' : JSON.stringify(r4.error.issues));

var checkedConsent = 'on' === 'on';
console.log('Checked consent transform:', checkedConsent);
var r5 = formSchema.safeParse(Object.assign({}, validPayload, { consentToContact: checkedConsent }));
console.log('Checked validation:', r5.success, r5.success ? '' : JSON.stringify(r5.error.issues));

var signupSchema = z.object({
  schoolName: z.string().min(1).max(160).transform(function(v) { return v.trim(); }),
  schoolType: z.enum(['Nursery','Primary','Secondary','Nursery & Primary','Primary & Secondary','Nursery, Primary & Secondary','Other']).optional(),
  country: z.string().min(1).max(80).default('Nigeria').transform(function(v) { return v.trim(); }).optional(),
  state: z.string().max(80).transform(function(v) { return v.trim(); }).optional().or(z.literal('')),
  city: z.string().max(80).transform(function(v) { return v.trim(); }).optional().or(z.literal('')),
  estimatedStudents: z.coerce.number().int().positive().optional(),
  ownerFullName: z.string().min(1).max(120).transform(function(v) { return v.trim(); }),
  ownerEmail: z.string().min(1).email().transform(function(v) { return v.toLowerCase().trim(); }),
  ownerPhone: z.string().min(1).max(30).transform(function(v) { return v.trim(); }),
  password: z.string().min(8).max(100)
    .refine(function(val) { return /[^a-zA-Z0-9\s]/.test(val); }, { message: 'Must contain at least one special character' })
    .refine(function(val) { return /[A-Z]/.test(val); }, { message: 'Must contain at least one uppercase letter' })
    .refine(function(val) { return /[a-z]/.test(val); }, { message: 'Must contain at least one lowercase letter' }),
  agreedToTerms: z.literal(true, { message: 'You must agree to the terms' }),
  plan: z.enum(['freemium', 'business']).default('freemium'),
  source: z.string().optional(),
});

var sp = {
  schoolName: 'Test School',
  ownerFullName: 'John Doe',
  ownerEmail: 'john@test.com',
  ownerPhone: '+234 801 234 5678',
  password: 'SecurePass123!',
  agreedToTerms: true,
  schoolType: undefined,
  estimatedStudents: undefined,
  source: 'direct',
};

var sr = signupSchema.safeParse(sp);
console.log('\nSignup valid:', sr.success, sr.success ? '' : JSON.stringify(sr.error.issues));
if (sr.success) console.log('  Parsed:', JSON.stringify(sr.data));

var sp2 = {
  schoolName: 'Test School',
  ownerFullName: 'John Doe',
  ownerEmail: 'john@test.com',
  ownerPhone: '+234 801 234 5678',
  password: 'SecurePass123!',
  agreedToTerms: true,
  schoolType: '',
  estimatedStudents: '',
  source: 'direct',
};

var sr2 = signupSchema.safeParse(sp2);
console.log('Signup empty optionals:', sr2.success, sr2.success ? '' : JSON.stringify(sr2.error.issues));
