import { syncDatabase, taskRepository } from '@/database'
import Task from '@/database/models/Task'
import { Q } from '@nozbe/watermelondb'
import { useDatabase } from '@nozbe/watermelondb/hooks'
import { useEffect, useState } from 'react'

export const useTasks = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  
  // Hook do WatermelonDB para observar mudanças
  const database = useDatabase()
  const tasksObservable = database
    .get<Task>('tasks')
    .query(Q.where('taskSyncStatus', Q.notEq('deleted')))
    .observe()

  useEffect(() => {
    // Converter Observable para array
    const subscription = tasksObservable.subscribe((tasksArray) => {
      setTasks(tasksArray)
    })

    return () => subscription.unsubscribe()
  }, [tasksObservable])

  useEffect(() => {
    initializeTasks()
  }, [])

  const initializeTasks = async () => {
    try {
      setLoading(true)
      // Tentar sincronizar com o JSON Server
      await syncDatabase()
    } catch (err) {
      console.warn('JSON Server não disponível, usando dados locais')
      setError('Servidor não disponível - modo offline')
    } finally {
      setLoading(false)
    }
  }

  const createTask = async (title: string, description?: string, priority: string = 'medium') => {
    try {
      await taskRepository.create(title, description, priority)
      // Sincronizar após criar tarefa
      await syncDatabase()
      return { success: true }
    } catch (err) {
      setError('Erro ao criar tarefa')
      return { success: false, error: err }
    }
  }

  const updateTask = async (id: string, updates: Partial<{ title: string; description: string; priority: string; completed: boolean }>) => {
    try {
      await taskRepository.update(id, updates)
      // Sincronizar após atualizar tarefa
      await syncDatabase()
      return { success: true }
    } catch (err) {
      setError('Erro ao atualizar tarefa')
      return { success: false, error: err }
    }
  }

  const deleteTask = async (id: string) => {
    try {
      await taskRepository.delete(id)
      // Sincronizar após deletar tarefa
      await syncDatabase()
      return { success: true }
    } catch (err) {
      setError('Erro ao deletar tarefa')
      return { success: false, error: err }
    }
  }

  const toggleTaskComplete = async (id: string) => {
    try {
      console.log('🔄 Tentando marcar tarefa como concluída:', id)
      await taskRepository.toggleComplete(id)
      console.log('✅ Tarefa marcada como concluída com sucesso')
      
      // Sincronizar após alterar status da tarefa
      console.log('🔄 Iniciando sincronização após toggle...')
      await syncDatabase()
      console.log('✅ Sincronização concluída após toggle')
      
      return { success: true }
    } catch (err) {
      const error = err as Error
      console.error('❌ Erro detalhado ao marcar tarefa como concluída:', error)
      console.error('❌ Stack trace:', error.stack)
      setError(`Erro ao alterar status da tarefa: ${error.message}`)
      return { success: false, error: err }
    }
  }

  const refreshTasks = async () => {
    try {
      setLoading(true)
      await syncDatabase()
    } catch (err) {
      setError('Erro ao sincronizar tarefas')
    } finally {
      setLoading(false)
    }
  }

  const getTasksByStatus = (completed: boolean) => {
    return tasks.filter(task => task.completed === completed)
  }

  const getTasksByPriority = (priority: string) => {
    return tasks.filter(task => task.priority === priority)
  }

  const clearError = () => setError(null)

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    refreshTasks,
    getTasksByStatus,
    getTasksByPriority,
    clearError,
  }
}
