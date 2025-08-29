import Task from '@/database/models/Task'
import { Ionicons } from '@expo/vector-icons'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native'
import { ThemedText } from './ThemedText'
import { ThemedView } from './ThemedView'

interface TaskFormProps {
  task?: Task | null
  onSubmit: (title: string, description: string, priority: string) => void
  onCancel: () => void
}

export const TaskForm: React.FC<TaskFormProps> = ({ task, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description || '')
      setPriority(task.priority)
    }
  }, [task])

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'O título é obrigatório')
      return
    }

    onSubmit(title.trim(), description.trim(), priority)
    
    // Limpar formulário se for uma nova tarefa
    if (!task) {
      setTitle('')
      setDescription('')
      setPriority('medium')
    }
  }

  const getPriorityColor = (priorityValue: string) => {
    if (priority === priorityValue) {
      switch (priorityValue) {
        case 'high': return '#ff6b6b'
        case 'medium': return '#ffd93d'
        case 'low': return '#6bcf7f'
        default: return '#ffd93d'
      }
    }
    return '#e0e0e0'
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        {task ? 'Editar Tarefa' : 'Nova Tarefa'}
      </ThemedText>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Título *</ThemedText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Digite o título da tarefa"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Descrição</ThemedText>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Digite uma descrição (opcional)"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputContainer}>
        <ThemedText style={styles.label}>Prioridade</ThemedText>
        <View style={styles.priorityContainer}>
          {['low', 'medium', 'high'].map((priorityValue) => (
            <TouchableOpacity
              key={priorityValue}
              style={[
                styles.priorityButton,
                { backgroundColor: getPriorityColor(priorityValue) }
              ]}
              onPress={() => setPriority(priorityValue)}
            >
              <ThemedText style={styles.priorityText}>
                {priorityValue === 'low' ? 'Baixa' : 
                 priorityValue === 'medium' ? 'Média' : 'Alta'}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Ionicons name="checkmark" size={20} color="white" />
          <ThemedText style={styles.submitButtonText}>
            {task ? 'Atualizar' : 'Criar'}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
    margin: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 80,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  priorityText: {
    color: 'white',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: '600',
  },
})
