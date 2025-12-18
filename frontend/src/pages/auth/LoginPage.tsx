import { useState } from 'react'
import {
  Paper,
  TextInput,
  PasswordInput,
  Checkbox,
  Button,
  Title,
  Text,
  Anchor,
  Stack,
  Divider,
  Alert,
  Group,
  Box,
  ThemeIcon,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { Link, useNavigate } from 'react-router-dom'
import { IconAlertCircle, IconBarbell, IconUser, IconSparkles } from '@tabler/icons-react'
import { useAuthStore } from '../../stores/auth'
import { supabase } from '../../services/supabase'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setUser, setTokens, loginDemoTrainer, loginDemoClient } = useAuthStore()
  
  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      remember: true,
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length >= 6 ? null : 'Mínimo 6 caracteres'),
    },
  })
  
  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      
      if (authError) throw authError
      
      if (data.user && data.session) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name,
          is_active: true,
        })
        setTokens(data.session.access_token, data.session.refresh_token)
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDemoTrainer = () => {
    loginDemoTrainer()
    navigate('/dashboard')
  }
  
  const handleDemoClient = () => {
    loginDemoClient()
    navigate('/dashboard')
  }
  
  return (
    <Paper radius="md" p="xl" withBorder={false} bg="transparent">
      <Stack gap="md">
        <Title order={2} ta="center" fw={700}>
          Inicia sesión
        </Title>
        <Text c="dimmed" size="sm" ta="center">
          Accede a tu cuenta de FitPro Hub
        </Text>
        
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
            {error}
          </Alert>
        )}
        
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="tu@email.com"
              required
              {...form.getInputProps('email')}
            />
            
            <PasswordInput
              label="Contraseña"
              placeholder="Tu contraseña"
              required
              {...form.getInputProps('password')}
            />
            
            <Group justify="space-between">
              <Checkbox
                label="Recordarme"
                {...form.getInputProps('remember', { type: 'checkbox' })}
              />
              <Anchor component={Link} to="/forgot-password" size="sm">
                ¿Olvidaste tu contraseña?
              </Anchor>
            </Group>
            
            <Button type="submit" fullWidth loading={loading}>
              Iniciar Sesión
            </Button>
            
            <Divider 
              label={
                <Group gap={6}>
                  <IconSparkles size={14} />
                  <Text size="xs">Prueba la demo</Text>
                </Group>
              } 
              labelPosition="center" 
            />
            
            {/* Demo buttons */}
            <Stack gap="xs">
              <Button
                variant="light"
                color="teal"
                fullWidth
                leftSection={
                  <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
                    <IconBarbell size={14} />
                  </ThemeIcon>
                }
                onClick={handleDemoTrainer}
                styles={{
                  root: {
                    height: 'auto',
                    padding: '10px 16px',
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
              >
                <Box>
                  <Text size="sm" fw={600}>Demo Entrenador</Text>
                  <Text size="xs" c="dimmed">
                    Gestiona clientes, entrenamientos y pagos
                  </Text>
                </Box>
              </Button>
              
              <Button
                variant="light"
                color="violet"
                fullWidth
                leftSection={
                  <ThemeIcon variant="light" color="violet" size="sm" radius="xl">
                    <IconUser size={14} />
                  </ThemeIcon>
                }
                onClick={handleDemoClient}
                styles={{
                  root: {
                    height: 'auto',
                    padding: '10px 16px',
                  },
                  inner: {
                    justifyContent: 'flex-start',
                  },
                }}
              >
                <Box>
                  <Text size="sm" fw={600}>Demo Cliente</Text>
                  <Text size="xs" c="dimmed">
                    Ve tus entrenamientos, progreso y más
                  </Text>
                </Box>
              </Button>
            </Stack>
            
            <Text c="dimmed" size="sm" ta="center">
              ¿No tienes cuenta?{' '}
              <Anchor component={Link} to="/register" fw={500}>
                Regístrate
              </Anchor>
            </Text>
          </Stack>
        </form>
      </Stack>
    </Paper>
  )
}
