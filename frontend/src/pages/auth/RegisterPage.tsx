import { Link } from 'react-router-dom'
import {
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Anchor,
  Divider,
  Checkbox,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { IconMail, IconLock, IconUser, IconBuilding } from '@tabler/icons-react'
import { useAuth } from '../../hooks/useAuth'

export function RegisterPage() {
  const { register, loading } = useAuth()
  
  const form = useForm({
    initialValues: {
      full_name: '',
      email: '',
      password: '',
      workspace_name: '',
      terms: false,
    },
    validate: {
      full_name: (value) => (value.length < 2 ? 'Nombre requerido' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email inválido'),
      password: (value) => (value.length < 8 ? 'Mínimo 8 caracteres' : null),
      workspace_name: (value) => (value.length < 2 ? 'Nombre del negocio requerido' : null),
      terms: (value) => (!value ? 'Debes aceptar los términos' : null),
    },
  })
  
  const handleSubmit = async (values: typeof form.values) => {
    try {
      await register(values.email, values.password, values.full_name, values.workspace_name)
    } catch {
      // Error handled by useAuth hook
    }
  }
  
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Text ta="center" fw={600} size="lg">
          Crea tu cuenta
        </Text>
        <Text ta="center" c="dimmed" size="sm" mb="md">
          Empieza a gestionar tu negocio fitness
        </Text>
        
        <TextInput
          label="Nombre completo"
          placeholder="Juan García"
          leftSection={<IconUser size={16} />}
          required
          {...form.getInputProps('full_name')}
        />
        
        <TextInput
          label="Email"
          placeholder="tu@email.com"
          leftSection={<IconMail size={16} />}
          required
          {...form.getInputProps('email')}
        />
        
        <PasswordInput
          label="Contraseña"
          placeholder="Mínimo 8 caracteres"
          leftSection={<IconLock size={16} />}
          required
          {...form.getInputProps('password')}
        />
        
        <TextInput
          label="Nombre de tu negocio"
          placeholder="Mi Gimnasio"
          leftSection={<IconBuilding size={16} />}
          required
          {...form.getInputProps('workspace_name')}
        />
        
        <Checkbox
          label={
            <Text size="xs">
              Acepto los{' '}
              <Anchor component={Link} to="/terms" size="xs">
                términos y condiciones
              </Anchor>{' '}
              y la{' '}
              <Anchor component={Link} to="/privacy" size="xs">
                política de privacidad
              </Anchor>
            </Text>
          }
          {...form.getInputProps('terms', { type: 'checkbox' })}
        />
        
        <Button type="submit" fullWidth loading={loading} mt="md">
          Crear Cuenta
        </Button>
        
        <Divider label="o" labelPosition="center" my="md" />
        
        <Text ta="center" size="sm">
          ¿Ya tienes cuenta?{' '}
          <Anchor component={Link} to="/login" fw={500}>
            Inicia sesión
          </Anchor>
        </Text>
      </Stack>
    </form>
  )
}
