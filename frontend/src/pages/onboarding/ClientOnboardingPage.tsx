import { useState } from 'react'
import {
  Container,
  Stepper,
  Paper,
  Title,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  Textarea,
  Select,
  MultiSelect,
  Checkbox,
  Radio,
  NumberInput,
  SimpleGrid,
  ThemeIcon,
  Box,
  Divider,
  Alert,
  Progress,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { DatePickerInput } from '@mantine/dates'
import {
  IconUser,
  IconTarget,
  IconHeartbeat,
  IconFileText,
  IconCheck,
  IconAlertCircle,
} from '@tabler/icons-react'

interface OnboardingFormData {
  // Personal Info
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: Date | null
  gender: string
  
  // Goals
  primaryGoal: string
  secondaryGoals: string[]
  targetWeight: number | null
  activityLevel: string
  
  // Health
  hasInjuries: boolean
  injuries: string
  hasMedicalConditions: boolean
  medicalConditions: string
  medications: string
  allergies: string
  
  // PAR-Q
  parqResponses: {
    heartCondition: boolean
    chestPain: boolean
    dizziness: boolean
    boneJoint: boolean
    bloodPressure: boolean
    otherReason: boolean
  }
  
  // Consent
  acceptTerms: boolean
  acceptPrivacy: boolean
  acceptMarketing: boolean
}

export function ClientOnboardingPage() {
  const [active, setActive] = useState(0)
  const [completed, setCompleted] = useState(false)

  const form = useForm<OnboardingFormData>({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      birthDate: null,
      gender: '',
      primaryGoal: '',
      secondaryGoals: [],
      targetWeight: null,
      activityLevel: '',
      hasInjuries: false,
      injuries: '',
      hasMedicalConditions: false,
      medicalConditions: '',
      medications: '',
      allergies: '',
      parqResponses: {
        heartCondition: false,
        chestPain: false,
        dizziness: false,
        boneJoint: false,
        bloodPressure: false,
        otherReason: false,
      },
      acceptTerms: false,
      acceptPrivacy: false,
      acceptMarketing: false,
    },
    validate: (values) => {
      if (active === 0) {
        return {
          firstName: values.firstName.length < 2 ? 'Nombre requerido' : null,
          lastName: values.lastName.length < 2 ? 'Apellido requerido' : null,
          email: /^\S+@\S+$/.test(values.email) ? null : 'Email inválido',
        }
      }
      if (active === 1) {
        return {
          primaryGoal: !values.primaryGoal ? 'Selecciona un objetivo' : null,
          activityLevel: !values.activityLevel ? 'Selecciona tu nivel de actividad' : null,
        }
      }
      if (active === 4) {
        return {
          acceptTerms: !values.acceptTerms ? 'Debes aceptar los términos' : null,
          acceptPrivacy: !values.acceptPrivacy ? 'Debes aceptar la política de privacidad' : null,
        }
      }
      return {}
    },
  })

  const nextStep = () => {
    if (form.validate().hasErrors) return
    if (active === 4) {
      setCompleted(true)
    } else {
      setActive((current) => current + 1)
    }
  }

  const prevStep = () => setActive((current) => current - 1)

  const hasParqRisk = Object.values(form.values.parqResponses).some(v => v)

  if (completed) {
    return (
      <Container size="sm" py="xl">
        <Paper withBorder radius="lg" p="xl" ta="center">
          <ThemeIcon size={80} radius="xl" color="green" variant="light" mx="auto" mb="lg">
            <IconCheck size={40} />
          </ThemeIcon>
          <Title order={2} mb="sm">¡Registro Completado!</Title>
          <Text c="dimmed" mb="xl">
            Gracias por completar tu registro. Tu entrenador revisará tu información
            y se pondrá en contacto contigo pronto.
          </Text>
          <Button size="lg">Ir al Dashboard</Button>
        </Paper>
      </Container>
    )
  }

  return (
    <Container size="md" py="xl">
      <Box mb="xl" ta="center">
        <Title order={2} mb="xs">Bienvenido a FitPro Hub</Title>
        <Text c="dimmed">Completa tu perfil para empezar tu transformación</Text>
      </Box>

      <Progress value={(active / 4) * 100} mb="xl" size="sm" radius="xl" />

      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false}>
        {/* Step 1: Personal Info */}
        <Stepper.Step
          label="Datos Personales"
          description="Tu información básica"
          icon={<IconUser size={18} />}
        >
          <Paper withBorder radius="md" p="xl" mt="xl">
            <Title order={4} mb="lg">Información Personal</Title>
            <Stack gap="md">
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Nombre"
                  placeholder="Tu nombre"
                  required
                  {...form.getInputProps('firstName')}
                />
                <TextInput
                  label="Apellidos"
                  placeholder="Tus apellidos"
                  required
                  {...form.getInputProps('lastName')}
                />
              </SimpleGrid>
              <TextInput
                label="Email"
                placeholder="tu@email.com"
                required
                {...form.getInputProps('email')}
              />
              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Teléfono"
                  placeholder="+34 600 000 000"
                  {...form.getInputProps('phone')}
                />
                <DatePickerInput
                  label="Fecha de Nacimiento"
                  placeholder="Selecciona fecha"
                  {...form.getInputProps('birthDate')}
                />
              </SimpleGrid>
              <Select
                label="Género"
                placeholder="Selecciona"
                data={[
                  { value: 'male', label: 'Masculino' },
                  { value: 'female', label: 'Femenino' },
                  { value: 'other', label: 'Otro' },
                  { value: 'prefer_not', label: 'Prefiero no decir' },
                ]}
                {...form.getInputProps('gender')}
              />
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 2: Goals */}
        <Stepper.Step
          label="Objetivos"
          description="¿Qué quieres lograr?"
          icon={<IconTarget size={18} />}
        >
          <Paper withBorder radius="md" p="xl" mt="xl">
            <Title order={4} mb="lg">Tus Objetivos</Title>
            <Stack gap="md">
              <Select
                label="Objetivo Principal"
                placeholder="Selecciona tu objetivo"
                required
                data={[
                  { value: 'lose_weight', label: 'Perder peso' },
                  { value: 'gain_muscle', label: 'Ganar masa muscular' },
                  { value: 'improve_fitness', label: 'Mejorar condición física' },
                  { value: 'maintain', label: 'Mantener peso actual' },
                  { value: 'improve_health', label: 'Mejorar salud general' },
                  { value: 'sports_performance', label: 'Rendimiento deportivo' },
                  { value: 'rehabilitation', label: 'Rehabilitación' },
                ]}
                {...form.getInputProps('primaryGoal')}
              />
              <MultiSelect
                label="Objetivos Secundarios"
                placeholder="Selecciona todos los que apliquen"
                data={[
                  { value: 'flexibility', label: 'Mejorar flexibilidad' },
                  { value: 'strength', label: 'Aumentar fuerza' },
                  { value: 'endurance', label: 'Mejorar resistencia' },
                  { value: 'posture', label: 'Corregir postura' },
                  { value: 'stress', label: 'Reducir estrés' },
                  { value: 'energy', label: 'Aumentar energía' },
                  { value: 'sleep', label: 'Mejorar sueño' },
                ]}
                {...form.getInputProps('secondaryGoals')}
              />
              {(form.values.primaryGoal === 'lose_weight' || form.values.primaryGoal === 'gain_muscle') && (
                <NumberInput
                  label="Peso Objetivo (kg)"
                  placeholder="Ej: 70"
                  {...form.getInputProps('targetWeight')}
                />
              )}
              <Select
                label="Nivel de Actividad Actual"
                placeholder="Selecciona"
                required
                data={[
                  { value: 'sedentary', label: 'Sedentario (poco o nada de ejercicio)' },
                  { value: 'light', label: 'Ligero (1-2 días/semana)' },
                  { value: 'moderate', label: 'Moderado (3-4 días/semana)' },
                  { value: 'active', label: 'Activo (5-6 días/semana)' },
                  { value: 'very_active', label: 'Muy activo (ejercicio intenso diario)' },
                ]}
                {...form.getInputProps('activityLevel')}
              />
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 3: Health */}
        <Stepper.Step
          label="Salud"
          description="Información médica"
          icon={<IconHeartbeat size={18} />}
        >
          <Paper withBorder radius="md" p="xl" mt="xl">
            <Title order={4} mb="lg">Historial de Salud</Title>
            <Stack gap="md">
              <Checkbox
                label="¿Tienes alguna lesión actual o pasada?"
                {...form.getInputProps('hasInjuries', { type: 'checkbox' })}
              />
              {form.values.hasInjuries && (
                <Textarea
                  label="Describe tus lesiones"
                  placeholder="Ej: Lesión de rodilla hace 2 años..."
                  {...form.getInputProps('injuries')}
                />
              )}
              <Checkbox
                label="¿Tienes alguna condición médica?"
                {...form.getInputProps('hasMedicalConditions', { type: 'checkbox' })}
              />
              {form.values.hasMedicalConditions && (
                <Textarea
                  label="Describe tus condiciones médicas"
                  placeholder="Ej: Diabetes tipo 2, hipertensión..."
                  {...form.getInputProps('medicalConditions')}
                />
              )}
              <Textarea
                label="Medicamentos actuales"
                placeholder="Lista los medicamentos que tomas actualmente (si aplica)"
                {...form.getInputProps('medications')}
              />
              <Textarea
                label="Alergias alimentarias"
                placeholder="Lista tus alergias alimentarias (si aplica)"
                {...form.getInputProps('allergies')}
              />
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 4: PAR-Q */}
        <Stepper.Step
          label="PAR-Q"
          description="Cuestionario de aptitud"
          icon={<IconFileText size={18} />}
        >
          <Paper withBorder radius="md" p="xl" mt="xl">
            <Title order={4} mb="xs">Cuestionario PAR-Q</Title>
            <Text size="sm" c="dimmed" mb="lg">
              Por favor responde estas preguntas con honestidad. Si respondes "Sí" a alguna,
              te recomendamos consultar con un médico antes de comenzar un programa de ejercicio.
            </Text>
            <Stack gap="md">
              <Radio.Group
                label="1. ¿Alguna vez un médico te ha dicho que tienes una condición cardíaca y que solo debes hacer actividad física recomendada por un médico?"
                {...form.getInputProps('parqResponses.heartCondition')}
              >
                <Group mt="xs">
                  <Radio value="true" label="Sí" />
                  <Radio value="false" label="No" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="2. ¿Sientes dolor en el pecho cuando realizas actividad física?"
                {...form.getInputProps('parqResponses.chestPain')}
              >
                <Group mt="xs">
                  <Radio value="true" label="Sí" />
                  <Radio value="false" label="No" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="3. ¿Has experimentado mareos o pérdida de conocimiento en el último mes?"
                {...form.getInputProps('parqResponses.dizziness')}
              >
                <Group mt="xs">
                  <Radio value="true" label="Sí" />
                  <Radio value="false" label="No" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="4. ¿Tienes algún problema óseo o articular que pueda empeorar con el ejercicio?"
                {...form.getInputProps('parqResponses.boneJoint')}
              >
                <Group mt="xs">
                  <Radio value="true" label="Sí" />
                  <Radio value="false" label="No" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="5. ¿Tomas actualmente medicamentos para la presión arterial o el corazón?"
                {...form.getInputProps('parqResponses.bloodPressure')}
              >
                <Group mt="xs">
                  <Radio value="true" label="Sí" />
                  <Radio value="false" label="No" />
                </Group>
              </Radio.Group>

              <Radio.Group
                label="6. ¿Conoces alguna otra razón por la que no deberías hacer ejercicio?"
                {...form.getInputProps('parqResponses.otherReason')}
              >
                <Group mt="xs">
                  <Radio value="true" label="Sí" />
                  <Radio value="false" label="No" />
                </Group>
              </Radio.Group>

              {hasParqRisk && (
                <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
                  Has respondido "Sí" a una o más preguntas. Te recomendamos consultar con un médico
                  antes de comenzar cualquier programa de ejercicio.
                </Alert>
              )}
            </Stack>
          </Paper>
        </Stepper.Step>

        {/* Step 5: Consent */}
        <Stepper.Step
          label="Consentimiento"
          description="Términos y privacidad"
          icon={<IconCheck size={18} />}
        >
          <Paper withBorder radius="md" p="xl" mt="xl">
            <Title order={4} mb="lg">Consentimientos</Title>
            <Stack gap="md">
              <Checkbox
                label={
                  <Text size="sm">
                    Acepto los{' '}
                    <Text component="a" href="#" c="blue" inherit>
                      Términos y Condiciones
                    </Text>{' '}
                    del servicio *
                  </Text>
                }
                {...form.getInputProps('acceptTerms', { type: 'checkbox' })}
                error={form.errors.acceptTerms}
              />
              <Checkbox
                label={
                  <Text size="sm">
                    Acepto la{' '}
                    <Text component="a" href="#" c="blue" inherit>
                      Política de Privacidad
                    </Text>{' '}
                    y el tratamiento de mis datos *
                  </Text>
                }
                {...form.getInputProps('acceptPrivacy', { type: 'checkbox' })}
                error={form.errors.acceptPrivacy}
              />
              <Divider />
              <Checkbox
                label="Deseo recibir comunicaciones comerciales y novedades (opcional)"
                {...form.getInputProps('acceptMarketing', { type: 'checkbox' })}
              />
            </Stack>
          </Paper>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={prevStep} disabled={active === 0}>
          Anterior
        </Button>
        <Button onClick={nextStep}>
          {active === 4 ? 'Completar Registro' : 'Siguiente'}
        </Button>
      </Group>
    </Container>
  )
}

