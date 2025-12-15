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
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { Link, useNavigate } from 'react-router-dom'
import { IconAlertCircle, IconPlayerPlay } from '@tabler/icons-react'
import { useAuthStore } from '../../stores/auth'
import { supabase } from '../../services/supabase'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { setUser, setTokens, loginDemo } = useAuthStore()
  
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
  
  const handleDemoLogin = () => {
    loginDemo()
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
            
            <Divider label="o" labelPosition="center" />
            
            <Button
              variant="light"
              color="green"
              fullWidth
              leftSection={<IconPlayerPlay size={18} />}
              onClick={handleDemoLogin}
            >
              Probar Modo Demo
            </Button>
            
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
