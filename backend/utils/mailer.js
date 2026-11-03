import nodemailer from 'nodemailer';

/**
 * Send interview invitation email to candidate with fallback to console logging
 */
export const sendInterviewEmail = async ({
  to,
  candidateName,
  positionTitle,
  date,
  type,
  meetingLink,
  note
}) => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Fallback: If email credentials are not filled, simply log in console
  if (!user || !pass || user.includes('your_email@gmail.com')) {
    console.log('---------------------------------------------------------');
    console.log('[Recruitment Mailer Fallback] SMTP credentials not configured.');
    console.log(`[Interview Scheduled] To: ${to}`);
    console.log(`Candidate: ${candidateName} | Position: ${positionTitle}`);
    console.log(`Format: ${type} | Date: ${date}`);
    console.log(`Meeting Link / Room: ${meetingLink || 'N/A'}`);
    if (note) console.log(`Note: ${note}`);
    console.log('---------------------------------------------------------');
    return { sent: false, reason: 'credentials_missing' };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user,
        pass,
      },
    });

    const formattedDate = date
      ? new Date(date).toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        })
      : 'Scheduled Date & Time';

    const isOnline = type === 'online';

    const subject = `Interview Invitation: ${positionTitle || 'Job Application'} at Golden Tech`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">Golden Tech</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Talent & Recruitment Portal</p>
        </div>
        <p>Dear <strong>${candidateName}</strong>,</p>
        <p>We are pleased to invite you for an interview for the position of <strong>${positionTitle || 'your application'}</strong> at Golden Tech.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0;"><strong>Format:</strong> ${type ? type.toUpperCase() : 'Interview'}</p>
          <p style="margin: 0 0 8px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
          ${
            isOnline && meetingLink
              ? `
            <p style="margin: 0 0 10px 0;"><strong>Meeting Link:</strong> <a href="${meetingLink}" target="_blank" style="color: #4f46e5; word-break: break-all;">${meetingLink}</a></p>
            <div style="margin: 14px 0 6px 0;">
              <a href="${meetingLink}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Video Interview</a>
            </div>
          `
              : meetingLink
              ? `<p style="margin: 0 0 8px 0;"><strong>Room / Address:</strong> ${meetingLink}</p>`
              : ''
          }
          ${note ? `<p style="margin: 12px 0 0 0; color: #475569;"><strong>Note:</strong> ${note}</p>` : ''}
        </div>

        <p>Please ensure you are ready 5 minutes before the scheduled interview time. If you need to make changes or have questions, please feel free to reach out.</p>
        
        <p style="margin-top: 32px; font-size: 14px; color: #64748b;">
          Best regards,<br/>
          <strong>Golden Tech Recruitment Team</strong>
        </p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"GT Recruitment" <${user}>`,
      to,
      subject,
      html,
    });

    console.log('[Recruitment Mailer] Email sent successfully to:', to, 'MessageId:', info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Recruitment Mailer] Failed to send email to:', to, err.message);
    return { sent: false, error: err.message };
  }
};
