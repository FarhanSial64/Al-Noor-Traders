/**
 * Email Service
 * Handles sending emails for password resets, notifications, etc.
 * 
 * If SMTP is not configured, emails are logged to console (useful for development)
 */

// Check if nodemailer is available
let nodemailer;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  nodemailer = null;
}

// Create transporter if SMTP is configured
let transporter = null;

const initializeTransporter = () => {
  if (!nodemailer) {
    console.log('Nodemailer not installed. Emails will be logged to console.');
    return null;
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.log('SMTP not configured. Emails will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT) || 587,
    secure: parseInt(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });
};

// Initialize on first use
const getTransporter = () => {
  if (transporter === null) {
    transporter = initializeTransporter();
  }
  return transporter;
};

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 */
const sendEmail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();
  const fromName = process.env.FROM_NAME || 'Al Noor Traders';
  const fromEmail = process.env.FROM_EMAIL || 'noreply@alnoortraders.com';
  const from = `${fromName} <${fromEmail}>`;

  if (!transport) {
    // Log email to console if SMTP not configured
    console.log('\n========== EMAIL (NOT SENT - SMTP NOT CONFIGURED) ==========');
    console.log(`To: ${to}`);
    console.log(`From: ${from}`);
    console.log(`Subject: ${subject}`);
    console.log('Body:');
    console.log(text);
    console.log('============================================================\n');
    return { success: true, logged: true };
  }

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
};

/**
 * Send password reset notification with new temporary password
 * @param {Object} user - User object with email and fullName
 * @param {string} temporaryPassword - The new temporary password
 */
/**
 * Send password reset link email
 * @param {Object} user - User object with email and fullName
 * @param {string} resetUrl - The secure reset URL with token
 */
const sendPasswordResetLinkEmail = async (user, resetUrl) => {
  const subject = 'AL NOOR TRADERS - Password Reset Request Approved';
  
  const text = `
Dear ${user.fullName},

Your password reset request has been approved!

Click the link below to create a new password:
${resetUrl}

IMPORTANT: This link will expire in 20 minutes for security reasons.

If you did not request this password reset, please contact the administrator immediately.

Best regards,
AL NOOR TRADERS Distribution Management System
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #2e7d32 0%, #4caf50 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
      <h1 style="margin: 0; font-size: 24px;">Password Reset Approved</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">AL NOOR TRADERS</p>
    </div>
    
    <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${user.fullName}</strong>,</p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">Great news! Your password reset request has been approved. Click the button below to create a new password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: #ffffff !important; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(25, 118, 210, 0.4);">
          🔐 Create New Password
        </a>
      </div>
      
      <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border-left: 4px solid #ff9800; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; font-weight: bold; color: #e65100;">⏰ Time Sensitive</p>
        <p style="margin: 8px 0 0 0; color: #ef6c00;">This link will expire in <strong>20 minutes</strong> for security reasons.</p>
      </div>
      
      <p style="font-size: 14px; color: #666; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #1976d2; word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">${resetUrl}</p>
      
      <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #c62828;">
          <strong>⚠️ Security Notice:</strong> If you did not request this password reset, please contact the administrator immediately.
        </p>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
      <p style="margin: 0;">This is an automated message from</p>
      <p style="margin: 5px 0; font-weight: bold;">AL NOOR TRADERS Distribution Management System</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: user.email, subject, text, html });
};

/**
 * Send notification to distributor about new password reset request
 * @param {Object} distributor - Distributor user object
 * @param {Object} requestingUser - User who requested password reset
 * @param {string} reason - Reason for reset request
 */
const sendPasswordResetRequestNotification = async (distributor, requestingUser, reason) => {
  const subject = 'AL NOOR TRADERS - New Password Reset Request';
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const roleDisplay = {
    'distributor': 'Distributor',
    'computer_operator': 'Computer Operator',
    'order_booker': 'Order Booker',
    'customer': 'Customer'
  };
  
  const text = `
Dear ${distributor.fullName},

A new password reset request has been submitted.

User Details:
- Name: ${requestingUser.fullName}
- Username: ${requestingUser.username}
- Email: ${requestingUser.email}
- Role: ${roleDisplay[requestingUser.role] || requestingUser.role}

Reason: ${reason || 'Not specified'}

Please login to the system to review and process this request.
${loginUrl}/users/password-reset-requests

Best regards,
AL NOOR TRADERS Distribution Management System
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f0f2f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="font-size: 48px; margin-bottom: 10px;">🔑</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Password Reset Request</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">Action Required</p>
    </div>
    
    <!-- Content -->
    <div style="background: #ffffff; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 20px 0; font-size: 16px;">Dear <strong>${distributor.fullName}</strong>,</p>
      
      <p style="margin: 0 0 20px 0; color: #555;">A user has submitted a password reset request that requires your attention.</p>
      
      <!-- User Details Card -->
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 10px; padding: 25px; margin: 20px 0; border-left: 4px solid #1976d2;">
        <h3 style="margin: 0 0 15px 0; color: #1976d2; font-size: 16px;">👤 User Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px; width: 100px;">Name:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #333; font-size: 14px;">${requestingUser.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Username:</td>
            <td style="padding: 8px 0; font-weight: bold; color: #1976d2; font-size: 14px;">${requestingUser.username}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Email:</td>
            <td style="padding: 8px 0; color: #333; font-size: 14px;">${requestingUser.email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666; font-size: 14px;">Role:</td>
            <td style="padding: 8px 0; font-size: 14px;">
              <span style="background: #e3f2fd; color: #1565c0; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                ${roleDisplay[requestingUser.role] || requestingUser.role}
              </span>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Reason Box -->
      <div style="background: #fff3e0; border-radius: 10px; padding: 20px; margin: 20px 0; border-left: 4px solid #ff9800;">
        <h3 style="margin: 0 0 10px 0; color: #e65100; font-size: 14px;">📝 Reason for Request</h3>
        <p style="margin: 0; color: #555; font-style: italic;">"${reason || 'Not specified'}"</p>
      </div>
      
      <!-- Action Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}/users/password-reset-requests" style="display: inline-block; background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%); color: #ffffff !important; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);">
          Review Request
        </a>
      </div>
      
      <!-- Info Box -->
      <div style="background: #e8f5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
        <p style="margin: 0; color: #2e7d32; font-size: 13px;">
          <strong>💡 Tip:</strong> Once approved, the user will receive an email with their new temporary password.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; margin-top: 20px; color: #888; font-size: 12px;">
      <p style="margin: 0;">This is an automated notification from</p>
      <p style="margin: 5px 0 0 0; font-weight: bold; color: #666;">AL NOOR TRADERS Distribution Management System</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: distributor.email, subject, text, html });
};

/**
 * Send welcome email with login credentials to new user
 * @param {Object} user - User object with email, fullName, username
 * @param {string} password - The user's password (plaintext before hashing)
 */
const sendNewUserCredentials = async (user, password) => {
  const subject = 'AL NOOR TRADERS - Welcome! Your Account Credentials';
  const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  const roleDisplay = {
    'distributor': 'Distributor',
    'computer_operator': 'Computer Operator',
    'order_booker': 'Order Booker',
    'customer': 'Customer'
  };
  
  const text = `
Dear ${user.fullName},

Welcome to AL NOOR TRADERS Distribution Management System!

Your account has been created successfully. Below are your login credentials:

Username: ${user.username}
Password: ${password}
Role: ${roleDisplay[user.role] || user.role}

Login URL: ${loginUrl}/login

IMPORTANT SECURITY NOTICE:
- Please keep your password secure and do not share it with anyone
- We recommend changing your password after first login
- If you did not expect this account, please contact the administrator immediately

Best regards,
AL NOOR TRADERS Distribution Management System
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials-box { background: #fff; border: 2px solid #1976d2; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .credential-row { display: flex; margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
    .credential-label { font-weight: bold; color: #666; min-width: 100px; }
    .credential-value { font-size: 18px; font-weight: bold; color: #1976d2; }
    .warning { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome!</h1>
      <p>AL NOOR TRADERS</p>
    </div>
    <div class="content">
      <p>Dear <strong>${user.fullName}</strong>,</p>
      <p>Welcome to AL NOOR TRADERS Distribution Management System! Your account has been created successfully.</p>
      
      <div class="credentials-box">
        <h3 style="margin-top: 0; color: #1976d2;">🔐 Your Login Credentials</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; font-weight: bold; color: #666;">Username:</td>
            <td style="padding: 12px; font-size: 18px; font-weight: bold; color: #1976d2;">${user.username}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: bold; color: #666;">Password:</td>
            <td style="padding: 12px; font-size: 18px; font-weight: bold; color: #1976d2; letter-spacing: 1px;">${password}</td>
          </tr>
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; font-weight: bold; color: #666;">Role:</td>
            <td style="padding: 12px; font-weight: bold; color: #333;">${roleDisplay[user.role] || user.role}</td>
          </tr>
        </table>
      </div>
      
      <div class="warning">
        <strong>⚠️ Important Security Notice:</strong>
        <ul style="margin: 5px 0;">
          <li>Please keep your password secure and do not share it with anyone</li>
          <li>We recommend changing your password after first login</li>
          <li>If you did not expect this account, please contact the administrator immediately</li>
        </ul>
      </div>
      
      <center>
        <a href="${loginUrl}/login" style="display: inline-block; background: #1976d2; color: #ffffff !important; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px;">Login Now</a>
      </center>
    </div>
    <div class="footer">
      <p>This is an automated message from AL NOOR TRADERS Distribution Management System</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({ to: user.email, subject, text, html });
};

module.exports = {
  sendEmail,
  sendPasswordResetLinkEmail,
  sendPasswordResetRequestNotification,
  sendNewUserCredentials,
};
