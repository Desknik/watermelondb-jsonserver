const express = require('express')
const jsonServer = require('json-server')
const path = require('path')
require('dotenv').config()

const app = express()
app.use(express.json())

const dbFile = path.join(__dirname, '../server/database.json')
const router = jsonServer.router(dbFile)

// lastSync global (resetado a cada start)
let lastSync = 0

// Middleware para GET /tasks (PULL)
app.get('/tasks', (req, res, next) => {
  const since = req.query.since ? Number(req.query.since) : undefined
  const db = router.db // lowdb instance
  const tasks = db.get('tasks').value() || []

  console.log('--- GET /tasks ---')
  console.log('since:', since)
  console.log('lastSync (servidor):', lastSync)

  if (since !== undefined) {
    if (since >= lastSync) {
      console.log('Retornando 204 (No Content)')
      return res.status(204).end()
    } else {
      const filtered = tasks.filter(t => t.updated_at > since)
      console.log('Retornando', filtered.length, 'tarefas com updated_at > since')
      return res.json(filtered)
    }
  } else {
    // since não enviado: retorna todos os dados
    console.log('Retornando todas as tarefas:', tasks.length)
    return res.json(tasks)
  }
})

// Middleware para POST /tasks/sync (PUSH)
app.post('/tasks/sync', (req, res, next) => {
  console.log('--- RECEBIDO NO /tasks/sync ---')
  console.log(JSON.stringify(req.body, null, 2))
  const changes = Array.isArray(req.body) ? req.body : []
  const db = router.db
  let updated = []
  let outdated = []

  changes.forEach(task => {
    if (typeof task.updated_at !== 'number') return
    const dbTask = db.get('tasks').find({ id: task.id }).value()
    if (!dbTask) {
      // Não existe, insere
      db.get('tasks').push(task).write()
      updated.push(task.id)
    } else if (task.updated_at > dbTask.updated_at) {
      // Mais recente, atualiza
      db.get('tasks').find({ id: task.id }).assign(task).write()
      updated.push(task.id)
    } else if (task.updated_at < dbTask.updated_at) {
      // Menos recente, retorna o do banco para o front atualizar
      outdated.push(dbTask)
    }
    // Se igual, ignora
  })

  // lastSync é o maior updated_at de todas as tasks do banco
  const allTasks = db.get('tasks').value() || []
  const newLastSync = allTasks.reduce((max, t) => t.updated_at > max ? t.updated_at : max, 0)
  lastSync = newLastSync
  console.log('lastSync atualizado para:', lastSync)
  res.json({ status: 'ok', updated, outdated, lastSync })
})

// Fallback para outras rotas do json-server
app.use(jsonServer.defaults())
app.use(router)

const API_URL = process.env.API_URL || 'http://localhost:3000'
const { hostname: HOST, port: PORT } = new URL(API_URL)

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em ${API_URL}`)
})
