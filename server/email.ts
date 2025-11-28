import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from './config';
import { log } from './utils';

const ses = new SESClient({ region: config.awsRegion });
const SOURCE_EMAIL = config.supportEmail; // verified in SES
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || config.supportEmail; // Admin notification recipient

export async function sendOtpEmail(to: string, code: string) {
  const params = {
    Destination: { ToAddresses: [to] },
    Source: SOURCE_EMAIL,
    Message: {
      Subject: { Data: 'Your Roxonn Wallet Export Code' },
      Body: {
        Text: {
          Data: `Your one-time code to export your wallet is: ${code}\n\nThis code will expire in 5 minutes.`
        }
      }
    }
  };
  try {
    await ses.send(new SendEmailCommand(params));
    log(`OTP email sent to ${to}`, 'email');
  } catch (err: any) {
    log(`Failed to send OTP email: ${err.message}`, 'email');
    throw new Error('Failed to send verification email');
  }
}

/**
 * Send notification to admin when a user requests a referral payout
 */
export async function sendPayoutRequestNotification(data: {
  requestId: number;
  username: string;
  usdcAmount: string;
  roxnAmount: string;
  walletAddress: string;
}) {
  const params = {
    Destination: { ToAddresses: [ADMIN_EMAIL] },
    Source: SOURCE_EMAIL,
    Message: {
      Subject: { Data: `[Action Required] New Referral Payout Request #${data.requestId}` },
      Body: {
        Text: {
          Data: `A new referral payout request has been submitted and requires your review.

Request Details:
----------------
Request ID: ${data.requestId}
Username: ${data.username}
USDC Amount: $${data.usdcAmount}
ROXN Amount: ${data.roxnAmount} ROXN
Wallet Address: ${data.walletAddress}

Action Required:
1. Log in to the Roxonn admin panel
2. Review the payout request at /api/referral/admin/payouts/pending
3. Verify the amounts and wallet address
4. Process the payment via the blockchain
5. Mark as paid with the transaction hashes

---
This is an automated notification from Roxonn Referral System.`
        },
        Html: {
          Data: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
    .label { color: #6b7280; }
    .value { font-weight: bold; }
    .amount { color: #059669; font-size: 18px; }
    .action { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin-top: 15px; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; padding: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">New Payout Request</h2>
      <p style="margin:5px 0 0 0;opacity:0.9;">Request #${data.requestId}</p>
    </div>
    <div class="content">
      <p>A new referral payout request has been submitted and requires your review.</p>

      <div class="details">
        <div class="detail-row">
          <span class="label">Username</span>
          <span class="value">${data.username}</span>
        </div>
        <div class="detail-row">
          <span class="label">USDC Amount</span>
          <span class="value amount">$${data.usdcAmount}</span>
        </div>
        <div class="detail-row">
          <span class="label">ROXN Amount</span>
          <span class="value amount">${data.roxnAmount} ROXN</span>
        </div>
        <div class="detail-row">
          <span class="label">Wallet Address</span>
          <span class="value" style="font-family:monospace;font-size:12px;">${data.walletAddress}</span>
        </div>
      </div>

      <div class="action">
        <strong>Action Required:</strong>
        <ol style="margin:10px 0 0 0;padding-left:20px;">
          <li>Review the payout request in admin panel</li>
          <li>Process the payment via the blockchain</li>
          <li>Mark as paid with transaction hashes</li>
        </ol>
      </div>
    </div>
    <div class="footer">
      Roxonn Referral System - Automated Notification
    </div>
  </div>
</body>
</html>`
        }
      }
    }
  };

  try {
    await ses.send(new SendEmailCommand(params));
    log(`Payout request notification sent to admin for request #${data.requestId}`, 'email');
  } catch (err: any) {
    // Log error but don't throw - email failure shouldn't block the payout request
    log(`Failed to send payout notification email: ${err.message}`, 'email-ERROR');
  }
}
