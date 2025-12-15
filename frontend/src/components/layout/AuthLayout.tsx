import { Outlet } from 'react-router-dom'
import { Box, Container, Paper, Group, Text } from '@mantine/core'

export function AuthLayout() {
  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
    >
      <Container size="xs" w="100%">
        {/* Logo */}
        <Group justify="center" mb="xl">
          <Box
            w={60}
            h={60}
            style={{
              background: 'linear-gradient(135deg, #2D6A4F 0%, #40916C 100%)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(45, 106, 79, 0.3)',
            }}
          >
            <Text c="white" fw={700} size="xl">F</Text>
          </Box>
        </Group>
        
        <Text ta="center" c="white" fw={700} size="xl" mb={4}>
          FitPro Hub
        </Text>
        <Text ta="center" c="gray.4" size="sm" mb="xl">
          La plataforma todo-en-uno para profesionales del fitness
        </Text>
        
        <Paper
          radius="lg"
          p="xl"
          withBorder
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}
        >
          <Outlet />
        </Paper>
        
        <Text ta="center" c="gray.5" size="xs" mt="xl">
          © 2024 FitPro Hub. Todos los derechos reservados.
        </Text>
      </Container>
    </Box>
  )
}
