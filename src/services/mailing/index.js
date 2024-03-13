const mailjet = require('../mailjet');


// * Constant
const WEB_URL = process.env.WEB_URL || "https://dev-web-apps.vercel.app"
const MAILER_ADDRESS = process.env.MAILER_ADDRESS || "1721projectacc@gmail.com"

/**
 * Base send email
 * @param {any} data
 * @param {number} template_id
 * @param {string} subject
 * @param {string} email
 * @param {string} name
 */
const sendEmail = async ({ data, template_id, subject, email, name }) => {
  try {
    await mailjet.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: {
            Email: MAILER_ADDRESS,
            Name: "SKI"
          },
          To: [
            {
              Email: email,
              Name: name
            }
          ],
          TemplateID: template_id, //5783738
          TemplateLanguage: true,
          Subject: subject,
          Variables: data
        }
      ]
    })
  } catch (error) {
    console.error("SEND EMAIL ERROR", { error })
  }
}


/**
 * Send verification email
 * @param {string} token
 * @param {string} email
 * @param {string} name
 */
const sendVerificationEmail = async ({ token, email, name }) => {
  const template_id = 5783738
  const subject = "User Verification"

  try {
    const verify_link = WEB_URL + "/verification?token=" + token
    const data = {
      verify_link,
      name
    }

    await sendEmail({ data, template_id, subject, email, name })
  } catch (error) {
    console.error("SEND EMAIL ERROR", { error })
  }
}

module.exports = {
  sendVerificationEmail
}