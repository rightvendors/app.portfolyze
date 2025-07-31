// EmailJS Configuration
// To set up EmailJS:
// 1. Go to https://www.emailjs.com/ and create an account
// 2. Create an Email Service (Gmail, Outlook, etc.)
// 3. Create an Email Template
// 4. Get your Public Key
// 5. Update the values below

export const EMAILJS_CONFIG = {
  // Replace with your actual EmailJS service ID
  SERVICE_ID: 'service_portfolyze',
  
  // Replace with your actual EmailJS template ID
  TEMPLATE_ID: 'template_portfolyze_contact',
  
  // Replace with your actual EmailJS public key
  PUBLIC_KEY: 'YOUR_PUBLIC_KEY',
  
  // Recipient email address
  TO_EMAIL: 'ravisankarpeela@gmail.com'
};

// EmailJS Template Variables
export interface EmailTemplateParams {
  to_email: string;
  from_name: string;
  from_email: string;
  message: string;
  subject: string;
} 