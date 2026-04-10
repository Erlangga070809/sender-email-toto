const nodemailer = require("nodemailer")
const fs = require("fs")

let queue = []
let processing = false
let ipCooldown = {}

const read = (p) => JSON.parse(fs.readFileSync(p))
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

const processQueue = async () => {
  if (processing) return
  processing = true

  while (queue.length) {
    const job = queue.shift()

    let senders = []

    try {
      senders = read(process.cwd() + "/sender.json")
    } catch {
      job.res.status(500).json({ error: "Sender file error" })
      continue
    }

    let success = false
    let usedSender = null

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
          to: job.to,
          subject: job.subject,
          text: job.text
        })

        success = true
        usedSender = sender.email
        break

      } catch {
        continue
      }
    }

    job.res.status(200).json({
      status: success,
      sender: usedSender || "none"
    })

    await sleep(1000)
  }

  processing = false
}

module.exports = async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"]

    if (apiKey !== "fixmerah_secure_2026") {
      return res.status(403).json({ error: "Forbidden" })
    }

    // ✅ Health check
    if (req.query.health) {
      return res.status(200).json({
        status: true,
        message: "API OK"
      })
    }

    const ip = req.headers["x-forwarded-for"] || "unknown"

    if (ipCooldown[ip] && Date.now() - ipCooldown[ip] < 1000) {
      return res.status(429).json({ error: "Too fast" })
    }

    ipCooldown[ip] = Date.now()

    const { to, subject, text } = req.query

    if (!to || !subject || !text) {
      return res.status(400).json({ error: "Bad request" })
    }

    queue.push({ to, subject, text, res })
    processQueue()

  } catch {
    res.status(500).json({ error: "Internal error" })
  }
}}

module.exports = async (req, res) => {
  try {
    const apiKey = req.headers["x-api-key"]

    if (apiKey !== "fixmerah_secure_2026") {
      return res.status(403).json({ error: "Forbidden" })
    }

    const ip = req.headers["x-forwarded-for"] || "unknown"

    if (ipCooldown[ip] && Date.now() - ipCooldown[ip] < 1000) {
      return res.status(429).json({ error: "Too fast" })
    }

    ipCooldown[ip] = Date.now()

    const { to, subject, text } = req.query

    if (!to || !subject || !text) {
      return res.status(400).json({ error: "Bad request" })
    }

    queue.push({ to, subject, text, res })

    processQueue()

  } catch {
    res.status(500).json({ error: "Internal error" })
  }
                                  }
