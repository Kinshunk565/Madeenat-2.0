// Twilio / WhatsApp Business API helper
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio sandbox number

/**
 * Sends a WhatsApp message notification using Twilio or simulates it if config is missing.
 * @param {string} toPhoneNumber - Supplier phone number (e.g. +971501234567)
 * @param {string} modelName - Laptop model name
 * @param {string} companyName - Supplier company name
 */
export async function sendWhatsAppNotification(toPhoneNumber, modelName, companyName) {
  const messageBody = `Hi What is the best price of ${modelName}? (Enquiry coming from Madeenat.com)`;
  
  console.log('--- WHATSAPP BACKEND NOTIFICATION ---');
  console.log(`To: ${toPhoneNumber}`);
  console.log(`Message: "${messageBody}"`);
  
  if (!accountSid || !authToken) {
    console.log('[WhatsApp Backend] Status: MOCKED. To enable live sending, configure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    console.log('------------------------------------');
    return { success: true, mode: 'mocked', body: messageBody };
  }

  try {
    const client = twilio(accountSid, authToken);
    
    // Twilio WhatsApp numbers must be prefixed with 'whatsapp:'
    const formattedTo = toPhoneNumber.startsWith('whatsapp:') 
      ? toPhoneNumber 
      : `whatsapp:${toPhoneNumber.trim()}`;
      
    const formattedFrom = fromNumber.startsWith('whatsapp:') 
      ? fromNumber 
      : `whatsapp:${fromNumber.trim()}`;

    const response = await client.messages.create({
      from: formattedFrom,
      to: formattedTo,
      body: messageBody,
    });

    console.log(`[WhatsApp Backend] Status: SENT via Twilio (SID: ${response.sid})`);
    console.log('------------------------------------');
    return { success: true, mode: 'twilio', messageSid: response.sid, body: messageBody };
  } catch (error) {
    console.error(`[WhatsApp Backend] Status: FAILED. Error: ${error.message}`);
    console.log('------------------------------------');
    return { success: false, error: error.message, body: messageBody };
  }
}
