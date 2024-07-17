import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import transporter from '../config/emailConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sendMail = async (options) => {
    const {email, subject, template, data} = options;
    // get the email template path
    const templatePath = path.join(__dirname, '../mails', template);

    const html = await ejs.renderFile(templatePath, data);
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject,
        html
    };
    await transporter.sendMail(mailOptions);
};

export default sendMail;