import Task from '@/database/models/Task'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ThemedText } from './ThemedText'
import { ThemedView } from './ThemedView'

interface TaskItemProps {
  task: Task
  onToggleComplete: (id: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
}

export const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onToggleComplete, 
  onEdit, 
  onDelete 
}) => {
  const handleDelete = () => {
    Alert.alert(
      'Confirmar exclusão',
      `Deseja realmente excluir a tarefa "${task.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => onDelete(task.id) }
      ]
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff6b6b'
      case 'medium': return '#ffd93d'
      case 'low': return '#6bcf7f'
      default: return '#6bcf7f'
    }
  }

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return 'Média'
    }
  }

  return (
    <ThemedView style={[styles.container, task.completed && styles.completedTask]}>
      <TouchableOpacity 
        style={styles.checkboxContainer}
        onPress={() => onToggleComplete(task.id)}
      >
        <View style={[styles.checkbox, task.completed && styles.checked]}>
          {task.completed && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.content}>
        <ThemedText 
          style={[styles.title, task.completed && styles.completedTitle]}
          type="defaultSemiBold"
        >
          {task.title}
        </ThemedText>
        
        {task.description && (
          <ThemedText style={styles.description}>
            {task.description}
          </ThemedText>
        )}

        <View style={styles.meta}>
          <View style={[styles.priority, { backgroundColor: getPriorityColor(task.priority) }]}>
            <Text style={styles.priorityText}>{getPriorityText(task.priority)}</Text>
          </View>
          
          <Text style={styles.date}>
            {new Date(task.createdAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onEdit(task)}
        >
          <Ionicons name="pencil" size={20} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleDelete}
        >
          <Ionicons name="trash" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  completedTask: {
    opacity: 0.7,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checked: {
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priority: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 12,
    opacity: 0.6,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
})
