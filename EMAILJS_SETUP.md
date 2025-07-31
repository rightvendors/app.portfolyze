# EmailJS Setup Guide for Contact Form

## Overview
The contact form now uses EmailJS to deliver emails directly to `ravisankarpeela@gmail.com`. This guide will help you set up EmailJS properly.

## Step-by-Step Setup

### 1. Create EmailJS Account
1. Go to [https://www.emailjs.com/](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### 2. Create Email Service
1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail recommended)
4. Connect your email account (ravisankarpeela@gmail.com)
5. Note down the **Service ID** (e.g., `service_abc123`)

### 3. Create Email Template
1. Go to "Email Templates"
2. Click "Create New Template"
3. Use this template structure:

**Template Name:** `Portfolyze Contact Form`

**Subject:** `Contact Form Message from {{from_name}}`

**Email Content:**
```
Hello,

You have received a new message from the Portfolyze contact form:

Name: {{from_name}}
Email: {{from_email}}

Message:
{{message}}

---
This message was sent from the Portfolyze website contact form.
```

4. Save the template and note down the **Template ID** (e.g., `template_xyz789`)

### 4. Get Your Public Key
1. Go to "Account" → "API Keys"
2. Copy your **Public Key**

### 5. Update Configuration
1. Open `src/config/emailjs.ts`
2. Replace the placeholder values:

```typescript
export const EMAILJS_CONFIG = {
  SERVICE_ID: 'your_service_id_here',        // From step 2
  TEMPLATE_ID: 'your_template_id_here',      // From step 3
  PUBLIC_KEY: 'your_public_key_here',        // From step 4
  TO_EMAIL: 'ravisankarpeela@gmail.com'      // Already set
};
```

### 6. Test the Setup
1. Start the development server: `npm run dev`
2. Go to the contact form
3. Fill out and submit a test message
4. Check if the email is delivered to `ravisankarpeela@gmail.com`

## Troubleshooting

### Email Not Being Delivered
1. **Check Configuration:** Ensure all IDs in `emailjs.ts` are correct
2. **Check Console:** Look for error messages in browser console
3. **Check EmailJS Dashboard:** Verify service is connected and template exists
4. **Check Spam Folder:** Emails might go to spam initially

### Common Errors
- **"EmailJS not configured"**: Update the configuration file
- **"Service not found"**: Check Service ID
- **"Template not found"**: Check Template ID
- **"Invalid public key"**: Check Public Key

### Fallback System
If EmailJS fails, the system will:
1. Try to open the user's email client with a pre-filled message
2. Show an error message with direct contact information

## Security Notes
- The Public Key is safe to use in frontend code
- EmailJS handles email delivery securely
- No sensitive credentials are exposed in the code

## Support
If you need help with EmailJS setup:
- EmailJS Documentation: [https://www.emailjs.com/docs/](https://www.emailjs.com/docs/)
- Contact: ravisankarpeela@gmail.com 