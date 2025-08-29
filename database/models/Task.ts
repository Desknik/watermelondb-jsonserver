import { Model } from '@nozbe/watermelondb'
import { date, field, text } from '@nozbe/watermelondb/decorators'

export default class Task extends Model {
  static table = 'tasks'

  @text('title') title!: string
  @text('description') description?: string
  @field('completed') completed!: boolean
  @text('priority') priority!: string
  @date('created_at') createdAt!: number
  @date('updated_at') updatedAt!: number
  @text('taskSyncStatus') taskSyncStatus!: string

  // Métodos auxiliares
  get isHighPriority() {
    return this.priority === 'high'
  }

  get isOverdue() {
    if (this.completed) return false
    // Implementar lógica de prazo se necessário
    return false
  }

  get needsSync() {
    return this.taskSyncStatus === 'pending' || this.taskSyncStatus === 'deleted'
  }

  // Métodos para CRUD
  async toggleComplete() {
    try {
      console.log('🔄 Task.toggleComplete: Iniciando atualização')
      console.log('🔄 Task.toggleComplete: Status atual:', this.completed)
      console.log('🔄 Task.toggleComplete: Novo status será:', !this.completed)
      
      await this.update(task => {
        task.completed = !task.completed
        task.taskSyncStatus = 'pending'
        task.updatedAt = Date.now()
        console.log('🔄 Task.toggleComplete: Campos atualizados no callback')
      })
      
      console.log('✅ Task.toggleComplete: Atualização concluída com sucesso')
    } catch (error) {
      console.error('❌ Task.toggleComplete: Erro durante atualização:', error)
      throw error
    }
  }

  async updatePriority(newPriority: string) {
    await this.update(task => {
      task.priority = newPriority
      task.taskSyncStatus = 'pending'
      task.updatedAt = Date.now()
    })
  }

  async updateDetails(title: string, description?: string) {
    await this.update(task => {
      task.title = title
      task.description = description
      task.taskSyncStatus = 'pending'
      task.updatedAt = Date.now()
    })
  }

  async markForDeletion() {
    await this.update(task => {
      task.taskSyncStatus = 'deleted'
      task.updatedAt = Date.now()
    })
  }

  async restore() {
    await this.update(task => {
      task.taskSyncStatus = 'pending'
      task.updatedAt = Date.now()
    })
  }
}
