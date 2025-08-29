// Script para simular PUSH e 3 PULLs
const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:3000'

async function testPush() {
  console.log('\n=== PUSH (POST /tasks/sync) ===')
  const changes = [
    {
      id: '999',
      title: 'Teste PUSH',
      description: 'Criada via teste',
      completed: false,
      priority: 'medium',
      created_at: Date.now(),
      updated_at: Date.now(),
      sync_status: 'pending'
    }
  ]
  // Agora envia o array diretamente, não mais { changes }
  const res = await fetch(`${BASE_URL}/tasks/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes)
  })
  const data = await res.json().catch(() => ({}))
  console.log('Status:', res.status)
  console.log('Resposta:', data)
  return data.lastSync
}

async function testPull(since, label) {
  let url = `${BASE_URL}/tasks`
  if (since !== undefined) url += `?since=${since}`
  console.log(`\n=== PULL (GET /tasks) - ${label} ===`)
  const res = await fetch(url)
  let data = []
  if (res.status !== 204) {
    data = await res.json()
  }
  console.log('Status:', res.status)
  console.log('Tarefas recebidas:', Array.isArray(data) ? data.length : '-')
  if (Array.isArray(data) && data.length > 0) {
    console.log('Primeira tarefa:', data[0])
  }
}

async function main() {
  // PUSH inicial
  const lastSync = await testPush()

  // PULL com lastSync antigo
  await testPull(1000, 'lastSync antigo (muito baixo)')

  // PULL com lastSync igual ao backend
  await testPull(lastSync, 'lastSync igual ao backend')

  // PULL sem enviar lastSync
  await testPull(undefined, 'sem lastSync')
}

main().catch(console.error)
