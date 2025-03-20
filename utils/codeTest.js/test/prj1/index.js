require("dotenv").config();
const nodemailer = require("nodemailer");
const axios = require("axios");
const imap = require("imap-simple");
const { simpleParser } = require("mailparser");

// Gửi email
async function sendEmail(to, subject, text, html) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"Your Name" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

// Xác minh địa chỉ email
async function verifyEmail(email) {
    const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${process.env.ABSTRACT_API_KEY}&email=${email}`;
    try {
        const response = await axios.get(url);
        const { is_valid_format, is_free_email, is_disposable_email } = response.data;
        console.log("Verification result:", response.data);
        return is_valid_format.value && !is_disposable_email.value && !is_free_email.value;
    } catch (error) {
        console.error("Error verifying email:", error);
        return false;
    }
}

// Nhận email
async function receiveEmail() {
    const config = {
        imap: {
            user: process.env.IMAP_USER,
            password: process.env.IMAP_PASS,
            host: process.env.IMAP_HOST,
            port: 993,
            tls: true,
            authTimeout: 3000
        }
    };

    try {
        const connection = await imap.connect({ imap: config.imap });
        await connection.openBox("INBOX");
        const searchCriteria = ["ALL"];
        const fetchOptions = { bodies: ["HEADER", "TEXT"], markSeen: false };

        const messages = await connection.search(searchCriteria, fetchOptions);
        for (const message of messages) {
            const all = message.parts.find(part => part.which === "TEXT");
            const parsed = await simpleParser(all.body);
            console.log("From:", parsed.from.text);
            console.log("Subject:", parsed.subject);
            console.log("Text:", parsed.text);
        }
        connection.end();
    } catch (error) {
        console.error("Error receiving email:", error);
    }
}

// Test các chức năng
(async () => {
    console.log("Verifying email...");
    const isValid = await verifyEmail("test@example.com");
    if (isValid) {
        console.log("Email is valid. Sending email...");
        await sendEmail(
            "recipient@example.com",
            "Test Email",
            "This is a test email.",
            "<b>This is a test email.</b>"
        );
    } else {
        console.log("Email is invalid.");
    }

    console.log("Receiving emails...");
    await receiveEmail();
})();
