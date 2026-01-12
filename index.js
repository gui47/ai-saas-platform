require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const bcrypt = require("bcrypt")
const sqlite3 = require("sqlite3").verbose()
const nodemailer = require("nodemailer")
const OpenAI = require("openai")

const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.set("view engine", "ejs")

// DATABASE
const db = new sqlite3.Database("database.db")
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE,
  password TEXT
)`)

// CREATE ADMIN
;(async () => {
  const hash = await bcrypt.hash("123456", 10)
  db.run("INSERT OR IGNORE INTO users (email,password) VALUES (?,?)", ["admin@empresa.com", hash])
})()

// OPENAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY })

// EMAIL
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// ROUTES
app.get("/", (req, res) => res.render("login", { error: null }))

app.post("/login", (req, res) => {
  const { email, password } = req.body

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (!user) return res.render("login", { error: "Usuário não encontrado" })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.render("login", { error: "Senha incorreta" })

    res.render("painel", { email })
  })
})

app.post("/send-email", async (req, res) => {
  const { to, subject, prompt } = req.body

  try {
    const ai = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: prompt }]
    })

    const text = ai.choices[0].message.content

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text
    })

    res.send("EMAIL ENVIADO COM SUCESSO 🚀")
  } catch (e) {
    console.error(e)
    res.send("ERRO AO ENVIAR EMAIL")
  }
})

app.listen(4000, () => console.log("Painel SaaS rodando em http://localhost:4000"))