import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { workoutsApi } from '../services/api'

interface Exercise {
  id: string
  name: string
  description?: string
  instructions?: string
  muscle_groups: string[]
  equipment: string[]
  difficulty: string
  category?: string
  video_url?: string
  image_url?: string
}

interface WorkoutProgram {
  id: string
  workspace_id: string
  name: string
  description?: string
  duration_weeks: number
  difficulty: string
  template: {
    weeks: Array<{
      days: Array<{
        exercises: Array<{
          exercise_id: string
          sets: number
          reps: string
          rest_seconds: number
          notes?: string
        }>
      }>
    }>
  }
  tags: string[]
  is_template: boolean
  created_at: string
}

interface ExerciseFilters {
  search?: string
  muscle_group?: string
  category?: string
}

export function useExercises(filters: ExerciseFilters = {}) {
  return useQuery({
    queryKey: ['exercises', filters],
    queryFn: () => workoutsApi.exercises(filters),
    select: (response) => response.data as Exercise[],
  })
}

export function useCreateExercise() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Exercise>) => workoutsApi.createExercise(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      notifications.show({
        title: 'Ejercicio creado',
        message: 'El ejercicio ha sido creado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al crear ejercicio',
        color: 'red',
      })
    },
  })
}

export function useWorkoutPrograms(isTemplate?: boolean) {
  return useQuery({
    queryKey: ['workout-programs', isTemplate],
    queryFn: () => workoutsApi.programs({ is_template: isTemplate ? 'Y' : undefined }),
    select: (response) => response.data as WorkoutProgram[],
  })
}

export function useWorkoutProgram(programId: string) {
  return useQuery({
    queryKey: ['workout-program', programId],
    queryFn: () => workoutsApi.getProgram(programId),
    select: (response) => response.data,
    enabled: !!programId,
  })
}

export function useCreateWorkoutProgram() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<WorkoutProgram>) => workoutsApi.createProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-programs'] })
      notifications.show({
        title: 'Programa creado',
        message: 'El programa de entrenamiento ha sido creado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al crear programa',
        color: 'red',
      })
    },
  })
}

export function useUpdateWorkoutProgram() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WorkoutProgram> }) =>
      workoutsApi.updateProgram(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout-programs'] })
      queryClient.invalidateQueries({ queryKey: ['workout-program', variables.id] })
      notifications.show({
        title: 'Programa actualizado',
        message: 'El programa ha sido actualizado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al actualizar programa',
        color: 'red',
      })
    },
  })
}

export function useDeleteWorkoutProgram() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => workoutsApi.deleteProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-programs'] })
      notifications.show({
        title: 'Programa eliminado',
        message: 'El programa ha sido eliminado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al eliminar programa',
        color: 'red',
      })
    },
  })
}

export function useWorkoutLogs(clientId: string) {
  return useQuery({
    queryKey: ['workout-logs', clientId],
    queryFn: () => workoutsApi.logs(clientId),
    select: (response) => response.data,
    enabled: !!clientId,
  })
}

export function useCreateWorkoutLog() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { program_id: string; client_id: string; log: object }) =>
      workoutsApi.createLog(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workout-logs', variables.client_id] })
      notifications.show({
        title: 'Entrenamiento registrado',
        message: 'El entrenamiento ha sido registrado correctamente',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Error',
        message: error.message || 'Error al registrar entrenamiento',
        color: 'red',
      })
    },
  })
}

