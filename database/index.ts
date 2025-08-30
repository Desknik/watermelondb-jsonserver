import { Database, Q } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import SyncMetadata from './models/SyncMetadata'
import Task from './models/Task'
import schema from './schema'
import Constants from "expo-constants";

// Importa a variável de ambiente API_URL
const API_URL = Constants.expoConfig?.extra?.API_URL;

console.log(API_URL)

// Configuração do adaptador SQLite
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'watermelondb',
})

// Instância do banco de dados
export const database = new Database({
  adapter,
  modelClasses: [Task, SyncMetadata],
})

// Classe para gerenciar sincronização
class SyncManager {
  // Cache local: quando foi a última vez que o app sincronizou (pull ou push)
  private async getLastSync(): Promise<number> {
    try {
      const metadata = await database
        .get<SyncMetadata>('sync_metadata')
        .query(Q.where('key', 'lastSync'))
        .fetch()
      return metadata.length > 0 ? metadata[0].numericValue : 0
    } catch {
      return 0
    }
  }

  private async setLastSync(timestamp: number): Promise<void> {
    await database.write(async () => {
      const existing = await database
        .get<SyncMetadata>('sync_metadata')
        .query(Q.where('key', 'lastSync'))
        .fetch()
      if (existing.length > 0) {
        await existing[0].update(meta => {
          meta.value = timestamp.toString()
          meta.updatedAt = Date.now()
        })
      } else {
        await database.get<SyncMetadata>('sync_metadata').create(meta => {
          meta.key = 'lastSync'
          meta.value = timestamp.toString()
          meta.updatedAt = Date.now()
        })
      }
    })
  }

  // PULL: Buscar dados do servidor
  async pullFromServer(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const lastSync = await this.getLastSync()
      console.log('🔄 PULL: lastSync (cache frontend) =', lastSync)
      const url = lastSync > 0 
        ? `${API_URL}/tasks?since=${lastSync}`
        : `${API_URL}/tasks`
      console.log('📡 PULL: Fazendo GET para:', url)
      const response = await fetch(url)
      if (response.status === 204) {
        console.log('✅ PULL: Dados já atualizados (204 No Content)')
        return { success: true, message: 'Dados já atualizados', count: 0 }
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const remoteTasks = await response.json()
      console.log('📥 PULL: Recebidas', remoteTasks.length, 'tarefas')
      if (remoteTasks.length === 0) {
        return { success: true, message: 'Nenhuma atualização necessária', count: 0 }
      }
      await database.write(async () => {
        for (const remoteTask of remoteTasks) {
          const existingTasks = await database
            .get<Task>('tasks')
            .query(Q.where('id', remoteTask.id))
            .fetch()
          if (existingTasks.length === 0) {
            await database.get<Task>('tasks').create(task => {
              task._raw.id = remoteTask.id
              task.title = remoteTask.title
              task.description = remoteTask.description || ''
              task.completed = remoteTask.completed || false
              task.priority = remoteTask.priority || 'medium'
              task.createdAt = remoteTask.created_at || Date.now()
              task.updatedAt = remoteTask.updated_at || Date.now()
              task.taskSyncStatus = 'synced'
            })
          } else {
            const existingTask = existingTasks[0]
            await existingTask.update(task => {
              task.title = remoteTask.title
              task.description = remoteTask.description || ''
              task.completed = remoteTask.completed || false
              task.priority = remoteTask.priority || 'medium'
              task.updatedAt = remoteTask.updated_at || Date.now()
              task.taskSyncStatus = 'synced'
            })
          }
        }
      })
      // Atualizar lastSync local para o maior updated_at recebido
      const maxUpdatedAt = Math.max(...remoteTasks.map((t: any) => t.updated_at || 0))
      if (maxUpdatedAt > 0) {
        await this.setLastSync(maxUpdatedAt)
        console.log('✅ PULL: Cache lastSync atualizado para', maxUpdatedAt)
      }
      return { 
        success: true, 
        message: `${remoteTasks.length} tarefas sincronizadas`, 
        count: remoteTasks.length 
      }
    } catch (error) {
      // Corrige: faz cast para Error para acessar message
      const errMsg = error instanceof Error ? error.message : String(error)
      console.warn('❌ PULL: Erro na sincronização:', errMsg)
      return { success: false, message: errMsg, count: 0 }
    }
  }

  // PUSH: Enviar mudanças locais para o servidor
  async pushToServer(): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const lastSync = await this.getLastSync()
      console.log('🔄 PUSH: lastSync (cache frontend) =', lastSync)
      const pendingTasks = await database
        .get<Task>('tasks')
        .query(
          Q.or(
            Q.where('taskSyncStatus', 'pending'),
            Q.where('taskSyncStatus', 'deleted')
          )
        )
        .fetch()
      if (pendingTasks.length === 0) {
        console.log('✅ PUSH: Nenhuma mudança pendente')
        return { success: true, message: 'Nenhuma mudança pendente', count: 0 }
      }
      console.log('📤 PUSH: Enviando', pendingTasks.length, 'mudanças')
      const changes = pendingTasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        completed: task.completed,
        priority: task.priority,
        created_at: Number(new Date(task.createdAt)),
        updated_at: Number(new Date(task.updatedAt))
      }))
      const response = await fetch(`${API_URL}/tasks/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(changes) // Envia array direto
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const result = await response.json()
      console.log('✅ PUSH: Resposta do servidor:', result)
      await database.write(async () => {
        for (const task of pendingTasks) {
          if (task.taskSyncStatus === 'deleted') {
            await task.destroyPermanently()
          } else {
            await task.update(t => {
              t.taskSyncStatus = 'synced'
            })
          }
        }
      })
      // Atualizar lastSync local com o valor do backend
      if (result.lastSync) {
        await this.setLastSync(result.lastSync)
        console.log('✅ PUSH: Cache lastSync atualizado para', result.lastSync)
      } else {
        const currentTimestamp = Date.now()
        await this.setLastSync(currentTimestamp)
        console.log('✅ PUSH: Cache lastSync criado com timestamp atual:', currentTimestamp)
      }
      return { 
        success: true, 
        message: `${pendingTasks.length} mudanças sincronizadas`, 
        count: pendingTasks.length 
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('❌ PUSH: Erro na sincronização:', errMsg)
      return { success: false, message: errMsg, count: 0 }
    }
  }

  // Sincronização completa (PULL + PUSH)
  async sync(): Promise<{ success: boolean; message: string; pullCount: number; pushCount: number }> {
    console.log('🚀 Iniciando sincronização completa...')
    const pullResult = await this.pullFromServer()
    if (!pullResult.success) {
      return { 
        success: false, 
        message: `PULL falhou: ${pullResult.message}`, 
        pullCount: 0, 
        pushCount: 0 
      }
    }
    const pushResult = await this.pushToServer()
    if (!pushResult.success) {
      return {
        success: false, 
        message: `PUSH falhou: ${pushResult.message}`, 
        pullCount: pullResult.count, 
        pushCount: 0 
      }
    }
    console.log('🎉 Sincronização completa concluída!')
    return {
      success: true,
      message: 'Sincronização concluída com sucesso',
      pullCount: pullResult.count,
      pushCount: pushResult.count
    }
  }

  // Obter estatísticas do cache
  async getCacheStats(): Promise<{ lastSync: number }> {
    const lastSync = await this.getLastSync()
    return { lastSync }
  }
}

// Instância do gerenciador de sincronização
export const syncManager = new SyncManager()

// Função de sincronização para compatibilidade
export const syncDatabase = async () => {
  const result = await syncManager.sync()
  return result
}

// Métodos CRUD para tarefas
export const taskRepository = {
  // Criar nova tarefa
  async create(title: string, description?: string, priority: string = 'medium') {
    return await database.write(async () => {
      return await database.get<Task>('tasks').create(task => {
        task.title = title
        task.description = description || ''
        task.completed = false
        task.priority = priority
        task.createdAt = Date.now()
        task.updatedAt = Date.now()
        task.taskSyncStatus = 'pending'
      })
    })
  },

  // Buscar todas as tarefas (não deletadas)
  async getAll() {
    return await database
      .get<Task>('tasks')
      .query(Q.where('taskSyncStatus', Q.notEq('deleted')))
      .fetch()
  },

  // Buscar tarefas por status
  async getByStatus(completed: boolean) {
    return await database
      .get<Task>('tasks')
      .query(
        Q.and(
          Q.where('completed', completed),
          Q.where('taskSyncStatus', Q.notEq('deleted'))
        )
      )
      .fetch()
  },

  // Buscar tarefas por prioridade
  async getByPriority(priority: string) {
    return await database
      .get<Task>('tasks')
      .query(
        Q.and(
          Q.where('priority', priority),
          Q.where('taskSyncStatus', Q.notEq('deleted'))
        )
      )
      .fetch()
  },

  // Atualizar tarefa
  async update(id: string, updates: Partial<{ title: string; description: string; priority: string; completed: boolean }>) {
    const task = await database.get<Task>('tasks').find(id)
    await database.write(async () => {
      await task.update(updatedTask => {
        Object.assign(updatedTask, updates)
        updatedTask.taskSyncStatus = 'pending'
        updatedTask.updatedAt = Date.now()
      })
    })
    return task
  },

  // Deletar tarefa (soft delete)
  async delete(id: string) {
    const task = await database.get<Task>('tasks').find(id)
    await database.write(async () => {
      await task.update(t => {
        t.taskSyncStatus = 'deleted'
        t.updatedAt = Date.now()
      })
    })
    return task
  },

  // Marcar como concluída/não concluída
  async toggleComplete(id: string) {
    try {
      const task = await database.get<Task>('tasks').find(id)
      await database.write(async () => {
        await task.update(updatedTask => {
          updatedTask.completed = !updatedTask.completed
          updatedTask.taskSyncStatus = 'pending'
          updatedTask.updatedAt = Date.now()
        })
      })
      return task
    } catch (error) {
      throw error
    }
  },

  // Restaurar tarefa deletada
  async restore(id: string) {
    const task = await database.get<Task>('tasks').find(id)
    await database.write(async () => {
      await task.update(t => {
        t.taskSyncStatus = 'pending'
        t.updatedAt = Date.now()
      })
    })
    return task
  },

  // Buscar tarefas que precisam de sincronização
  async getPendingSync() {
    return await database
      .get<Task>('tasks')
      .query(
        Q.or(
          Q.where('taskSyncStatus', 'pending'),
          Q.where('taskSyncStatus', 'deleted')
        )
      )
      .fetch()
  },

  // Buscar estatísticas de sincronização
  async getSyncStats() {
    const total = await database.get<Task>('tasks').query().fetch()
    const pending = await database
      .get<Task>('tasks')
      .query(Q.where('taskSyncStatus', 'pending'))
      .fetch()
    const deleted = await database
      .get<Task>('tasks')
      .query(Q.where('taskSyncStatus', 'deleted'))
      .fetch()
    const synced = await database
      .get<Task>('tasks')
      .query(Q.where('taskSyncStatus', 'synced'))
      .fetch()
    
    return {
      total: total.length,
      pending: pending.length,
      deleted: deleted.length,
      synced: synced.length
    }
  }
}
