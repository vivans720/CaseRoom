const axios = require("axios");

/**
 * Sends an OTP email to the user
 * @param {string} email
 * @param {string} otp
 * @param {string} type
 */
const sendOTP = async (email, otp, type) => {
  let subject = "";
  let introText = "";

  switch (type) {
    case "registration":
      subject = "CaseRoom - Verify Your Registration";
      introText =
        "Welcome! Please use the following OTP to complete your registration.";
      break;

    case "reset_password":
      subject = "CaseRoom - Reset Your Password";
      introText =
        "You requested a password reset. Please use the following OTP to reset your password.";
      break;

    case "login":
    default:
      subject = "CaseRoom - Login OTP";
      introText =
        "A login attempt was made to your account. Use the OTP below to continue.";
      break;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
      
      <div style="background-color: #0077B6; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">
          CaseRoom
        </h2>
      </div>

      <div style="padding: 30px; background-color: white;">

        <p style="font-size: 16px; color: #1A202C;">
          ${introText}
        </p>

        <div style="text-align: center; margin: 30px 0;">

          <span
            style="
              display: inline-block;
              font-size: 32px;
              font-weight: bold;
              padding: 15px 30px;
              background-color: #F1F4F8;
              color: #0077B6;
              letter-spacing: 5px;
              border-radius: 8px;
              border: 1px dashed #0077B6;
            "
          >
            ${otp}
          </span>

        </div>

        <p style="font-size: 14px; color: #64748B;">
          This OTP is valid for 5 minutes.
        </p>

      </div>
    </div>
  `;

  try {
    if (!process.env.BREVO_API_KEY) {
      throw new Error("BREVO_API_KEY missing in environment variables");
    }

    await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "CaseRoom Support",
          email: process.env.EMAIL_FROM,
        },

        to: [
          {
            email,
          },
        ],

        subject,
        htmlContent,
      },

      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`OTP email successfully sent to ${email}`);

    return true;
  } catch (error) {
    console.error(
      "Brevo API Error:",
      error.response?.data || error.message
    );

    throw new Error("Failed to send OTP email");
  }
};

module.exports = {
  sendOTP,
};