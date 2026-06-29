export interface TermiiSendResponse {
  message_id: string;
  message: string;
  balance: number;
  user: string;
}

export async function sendTermiiSMS(to: string, sms: string): Promise<TermiiSendResponse | null> {
  const apiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || "WardBalance";

  if (!apiKey || apiKey === "mock") {
    console.log(`[Mock Termii SMS] To: ${to} | Msg: ${sms}`);
    return {
      message_id: `mock-${Date.now()}`,
      message: "Successfully Sent (Mock)",
      balance: 100,
      user: "mock user"
    };
  }

  // Format Nigerian numbers to 234xxxxxxxxxx if they start with 0
  let formattedTo = to.replace(/\s+/g, '');
  if (formattedTo.startsWith('0')) {
    formattedTo = '234' + formattedTo.slice(1);
  } else if (formattedTo.startsWith('+')) {
    formattedTo = formattedTo.slice(1);
  }

  try {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: formattedTo,
        from: senderId,
        sms,
        type: "plain",
        channel: "generic",
        api_key: apiKey,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Termii error: ${response.status} - ${errorBody}`);
      throw new Error(`Failed to send SMS via Termii: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Termii sending error:", error);
    throw error;
  }
}
