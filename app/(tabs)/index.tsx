import { TaskForm, getTaskFormKey } from '@/components/TaskForm'
import { TaskItem } from '@/components/TaskItem'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { Colors } from '@/constants/Colors'
import Task from '@/database/models/Task'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTasks } from '@/hooks/useTasks'
import { Ionicons } from '@expo/vector-icons'
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet'
import React, { useMemo, useRef, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function HomeScreen() {
  const {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    refreshTasks,
    clearError,
  } = useTasks()

  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all')

  const bottomSheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['60%', '90%'], [])

  const openSheet = () => {
    setEditingTask(null)
    setShowForm(true)
    setTimeout(() => bottomSheetRef.current?.collapse(), 10)
  }
  const closeSheet = () => {
    setShowForm(false)
    setEditingTask(null)
    bottomSheetRef.current?.close()
  }

  const handleCreateTask = async (title: string, description: string, priority: string) => {
    const result = await createTask(title, description, priority)
    if (result.success) {
      closeSheet()
    }
  }

  const handleUpdateTask = async (title: string, description: string, priority: string) => {
    if (editingTask) {
      const result = await updateTask(editingTask.id, { title, description, priority })
      if (result.success) {
        setEditingTask(null)
        closeSheet()
      }
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
    setTimeout(() => bottomSheetRef.current?.collapse(), 10)
  }

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id)
  }

  const handleToggleComplete = async (id: string) => {
    await toggleTaskComplete(id)
  }

  const filteredTasks = tasks.filter((task: Task) => {
    switch (filter) {
      case 'pending':
        return !task.completed
      case 'completed':
        return task.completed
      default:
        return true
    }
  })

  const getFilterButtonStyle = (filterType: 'all' | 'pending' | 'completed') => ({
    ...styles.filterButton,
    backgroundColor: filter === filterType ? '#007AFF' : '#f0f0f0',
  })

  const getFilterButtonTextStyle = (filterType: 'all' | 'pending' | 'completed') => ({
    ...styles.filterButtonText,
    color: filter === filterType ? 'white' : '#666',
  })

  const colorScheme = useColorScheme();
  const backgroundColor = Colors[colorScheme ?? 'light'].background;

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Carregando tarefas...</ThemedText>
      </ThemedView>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Minhas Tarefas</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openSheet}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={getFilterButtonStyle('all')}
            onPress={() => setFilter('all')}
          >
            <ThemedText style={getFilterButtonTextStyle('all')}>Todas</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={getFilterButtonStyle('pending')}
            onPress={() => setFilter('pending')}
          >
            <ThemedText style={getFilterButtonTextStyle('pending')}>Pendentes</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={getFilterButtonStyle('completed')}
            onPress={() => setFilter('completed')}
          >
            <ThemedText style={getFilterButtonTextStyle('completed')}>Concluídas</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Mensagem de erro */}
        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity onPress={clearError} style={styles.errorButton}>
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de tarefas */}
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskItem
              task={item}
              onToggleComplete={handleToggleComplete}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          )}
          style={styles.taskList}
          contentContainerStyle={styles.taskListContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshTasks} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
              <ThemedText style={styles.emptyText}>
                {filter === 'all' 
                  ? 'Nenhuma tarefa encontrada' 
                  : filter === 'pending' 
                    ? 'Nenhuma tarefa pendente' 
                    : 'Nenhuma tarefa concluída'
                }
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                {filter === 'all' 
                  ? 'Crie sua primeira tarefa!' 
                  : 'Todas as tarefas estão organizadas'
                }
              </ThemedText>
            </View>
          }
        />

        {/* BottomSheet do formulário */}
        <BottomSheet
          ref={bottomSheetRef}
          index={showForm ? 0 : -1}
          snapPoints={snapPoints}
          enablePanDownToClose
          onClose={closeSheet}
          backgroundStyle={{ backgroundColor }}
        >
          <BottomSheetView>
            <TaskForm
              key={getTaskFormKey(editingTask)}
              task={editingTask}
              onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
              onCancel={closeSheet}
            />
          </BottomSheetView>
        </BottomSheet>
      </ThemedView>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ff6b6b',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: 'white',
    flex: 1,
  },
  errorButton: {
    padding: 4,
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  }
})
