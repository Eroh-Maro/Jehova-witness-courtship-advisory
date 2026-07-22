import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import logger from "../utils/logger.js";

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT) || 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure:
      process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === "true"
        : port === 465,

    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
};

export const verifyEmailConnection = async () => {
  try {
    await getTransporter().verify();
    logger.info("SMTP server connected successfully.");
  } catch (error) {
    logger.error(`SMTP connection failed: ${error.message}`);
    throw error;
  }
};

const TEMPLATE_DIR = path.resolve("templates");

// Very small mustache-style {{variable}} renderer
const renderTemplate = async (templateName, variables = {}) => {
  const filePath = path.join(TEMPLATE_DIR, `${templateName}.html`);

  let html = await fs.readFile(filePath, "utf8");

  const allVars = {
    platformName:
      process.env.PLATFORM_NAME || "Marriage Advisory Platform",
    year: new Date().getFullYear(),
    ...variables,
  };

  for (const [key, value] of Object.entries(allVars)) {
    html = html.replaceAll(`{{${key}}}`, value ?? "");
  }

  return html;
};

export const sendEmail = async ({
  to,
  subject,
  template,
  variables = {},
  attachments = [],
}) => {
  try {
    const html = await renderTemplate(template, variables);

    const info = await getTransporter().sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || "Marriage Advisory Platform"}" <${
        process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER
      }>`,
      to,
      subject,
      html,
      attachments,
    });

    logger.info(
      `Email sent successfully to ${to}. Message ID: ${info.messageId}`
    );

    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

export default {
  sendEmail,
  verifyEmailConnection,
};