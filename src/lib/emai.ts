import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendResultEmail(email: string, result: any) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: email,
    subject: 'Your Exam Results',
    html: `
      <h2>Exam Results</h2>
      <p>Score: ${result.totalScore}/${result.maxScore}</p>
      <p>Accuracy: ${result.accuracy}%</p>
    `,
  });
}