const nodemailer = require("nodemailer")
const fs = require("fs")
const path = require("path")

const read = (p) => JSON.parse(fs.readFileSync(p))

module.exports = async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"] || req.query.apiKey

    if (apiKey !== "fixmerah_secure_2026") {
      return res.status(403).json({ error: "Forbidden" })
    }

    if (req.query.health) {
      return res.status(200).json({
        status: true,
        message: "API OK"
      })
    }

    const { to, subject, text } = req.query

    if (!to || !subject || !text) {
      return res.status(400).json({ error: "Bad request" })
    }

    let senders = read(path.join(__dirname, "../sender.json"))

    for (let sender of senders) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: sender.email,
            pass: sender.pass
          }
        })

        await transporter.sendMail({
          from: sender.email,
          to,
          subject,
          text
        })

        return res.status(200).json({
          status: true,
          sender: sender.email
        })

      } catch {}
    }

    return res.status(200).json({
      status: false,
      sender: "none"
    })

  } catch (e) {
    return res.status(500).json({
      error: "Internal error",
      message: e.message
    })
  }
}
