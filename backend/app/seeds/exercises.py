"""Seed data for populating exercises database with common exercises."""

SEED_EXERCISES = [
    # ========== PECHO ==========
    {"name": "Press de banca", "muscle_groups": ["pecho"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Ejercicio compuesto para pectorales con barra en banco plano."},
    {"name": "Press de banca inclinado", "muscle_groups": ["pecho"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Press en banco inclinado para pectoral superior."},
    {"name": "Press de banca declinado", "muscle_groups": ["pecho"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Press en banco declinado para pectoral inferior."},
    {"name": "Aperturas con mancuernas", "muscle_groups": ["pecho"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Aislamiento de pectorales con mancuernas."},
    {"name": "Aperturas en máquina", "muscle_groups": ["pecho"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Aperturas guiadas en máquina contractora."},
    {"name": "Press en máquina de pecho", "muscle_groups": ["pecho"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Press de pecho en máquina guiada."},
    {"name": "Fondos en paralelas", "muscle_groups": ["pecho", "brazos"], "equipment": ["peso_libre"], "category": "fuerza", "difficulty": "intermediate", "description": "Fondos con peso corporal para pecho y tríceps."},
    {"name": "Pullover con mancuerna", "muscle_groups": ["pecho", "espalda"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "intermediate", "description": "Ejercicio para pectoral y dorsal ancho."},
    {"name": "Cruces en poleas", "muscle_groups": ["pecho"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "intermediate", "description": "Cruces con poleas para definición de pectorales."},
    {"name": "Press con mancuernas", "muscle_groups": ["pecho"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "intermediate", "description": "Press de pecho con mancuernas para mayor rango de movimiento."},

    # ========== ESPALDA ==========
    {"name": "Dominadas", "muscle_groups": ["espalda"], "equipment": ["peso_libre"], "category": "fuerza", "difficulty": "advanced", "description": "Ejercicio compuesto de tracción vertical con peso corporal."},
    {"name": "Remo con barra", "muscle_groups": ["espalda"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Remo con barra para espalda media y dorsales."},
    {"name": "Remo con mancuerna", "muscle_groups": ["espalda"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "intermediate", "description": "Remo unilateral con mancuerna."},
    {"name": "Peso muerto", "muscle_groups": ["espalda", "piernas"], "equipment": ["barra"], "category": "fuerza", "difficulty": "advanced", "description": "Ejercicio compuesto para cadena posterior completa."},
    {"name": "Jalón al pecho", "muscle_groups": ["espalda"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "beginner", "description": "Tracción vertical en polea alta."},
    {"name": "Jalón tras nuca", "muscle_groups": ["espalda"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "intermediate", "description": "Jalón tras nuca para dorsales."},
    {"name": "Remo en máquina", "muscle_groups": ["espalda"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Remo guiado en máquina."},
    {"name": "Remo en polea baja", "muscle_groups": ["espalda"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "intermediate", "description": "Remo sentado en polea baja."},
    {"name": "Hiperextensiones", "muscle_groups": ["espalda"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Extensión lumbar en banco romano."},
    {"name": "Encogimientos de hombros", "muscle_groups": ["espalda"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Encogimientos para trapecios con mancuernas."},

    # ========== PIERNAS ==========
    {"name": "Sentadilla con barra", "muscle_groups": ["piernas"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Ejercicio compuesto rey para piernas."},
    {"name": "Sentadilla en multipower", "muscle_groups": ["piernas"], "equipment": ["guiada"], "category": "fuerza", "difficulty": "beginner", "description": "Sentadilla guiada en máquina Smith/Multipower."},
    {"name": "Prensa de piernas", "muscle_groups": ["piernas"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Prensa inclinada para cuádriceps y glúteos."},
    {"name": "Extensión de cuádriceps", "muscle_groups": ["piernas"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Aislamiento de cuádriceps en máquina."},
    {"name": "Curl femoral", "muscle_groups": ["piernas"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Aislamiento de isquiotibiales en máquina."},
    {"name": "Peso muerto rumano", "muscle_groups": ["piernas"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Peso muerto con piernas semi-rígidas para isquiotibiales."},
    {"name": "Zancadas con mancuernas", "muscle_groups": ["piernas"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "intermediate", "description": "Zancadas alternas con mancuernas."},
    {"name": "Hip thrust", "muscle_groups": ["piernas"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Empuje de cadera para glúteos."},
    {"name": "Elevación de talones", "muscle_groups": ["piernas"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Elevación de gemelos en máquina."},
    {"name": "Sentadilla búlgara", "muscle_groups": ["piernas"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "advanced", "description": "Sentadilla unilateral con pie trasero elevado."},
    {"name": "Abductores en máquina", "muscle_groups": ["piernas"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Abducción de cadera en máquina."},
    {"name": "Aductores en máquina", "muscle_groups": ["piernas"], "equipment": ["maquina"], "category": "fuerza", "difficulty": "beginner", "description": "Aducción de cadera en máquina."},

    # ========== HOMBROS ==========
    {"name": "Press militar con barra", "muscle_groups": ["hombros"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Press de hombros con barra de pie o sentado."},
    {"name": "Press militar con mancuernas", "muscle_groups": ["hombros"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "intermediate", "description": "Press de hombros con mancuernas."},
    {"name": "Elevaciones laterales", "muscle_groups": ["hombros"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Elevaciones laterales para deltoides medial."},
    {"name": "Elevaciones frontales", "muscle_groups": ["hombros"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Elevaciones frontales para deltoides anterior."},
    {"name": "Pájaros con mancuernas", "muscle_groups": ["hombros"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Elevaciones posteriores para deltoides posterior."},
    {"name": "Face pull en polea", "muscle_groups": ["hombros"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "intermediate", "description": "Face pull para deltoides posterior y rotadores."},
    {"name": "Press Arnold", "muscle_groups": ["hombros"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "intermediate", "description": "Press con rotación para deltoides completo."},
    {"name": "Elevaciones laterales en polea", "muscle_groups": ["hombros"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "intermediate", "description": "Elevaciones laterales con polea baja."},

    # ========== BRAZOS - BÍCEPS ==========
    {"name": "Curl de bíceps con barra", "muscle_groups": ["brazos"], "equipment": ["barra"], "category": "fuerza", "difficulty": "beginner", "description": "Curl básico de bíceps con barra recta."},
    {"name": "Curl de bíceps con mancuernas", "muscle_groups": ["brazos"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Curl de bíceps alternado con mancuernas."},
    {"name": "Curl martillo", "muscle_groups": ["brazos"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Curl con agarre neutro para braquial."},
    {"name": "Curl en banco Scott", "muscle_groups": ["brazos"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Curl con apoyo en banco predicador."},
    {"name": "Curl concentrado", "muscle_groups": ["brazos"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Curl unilateral concentrado sentado."},
    {"name": "Curl en polea", "muscle_groups": ["brazos"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "beginner", "description": "Curl de bíceps en polea baja."},

    # ========== BRAZOS - TRÍCEPS ==========
    {"name": "Extensión de tríceps en polea", "muscle_groups": ["brazos"], "equipment": ["poleas"], "category": "fuerza", "difficulty": "beginner", "description": "Extensión de tríceps en polea alta."},
    {"name": "Press francés", "muscle_groups": ["brazos"], "equipment": ["barra"], "category": "fuerza", "difficulty": "intermediate", "description": "Extensión de tríceps tumbado con barra."},
    {"name": "Extensión de tríceps con mancuerna", "muscle_groups": ["brazos"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Extensión de tríceps por detrás de la cabeza."},
    {"name": "Fondos en banco", "muscle_groups": ["brazos"], "equipment": ["peso_libre"], "category": "fuerza", "difficulty": "beginner", "description": "Fondos de tríceps apoyado en banco."},
    {"name": "Patada de tríceps", "muscle_groups": ["brazos"], "equipment": ["mancuerna"], "category": "fuerza", "difficulty": "beginner", "description": "Extensión posterior de tríceps con mancuerna."},

    # ========== CORE / ABDOMEN ==========
    {"name": "Plancha frontal", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "beginner", "description": "Isométrico de core en posición de plancha."},
    {"name": "Plancha lateral", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "beginner", "description": "Plancha lateral para oblicuos."},
    {"name": "Crunch abdominal", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "beginner", "description": "Encogimiento abdominal clásico."},
    {"name": "Elevación de piernas", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "intermediate", "description": "Elevación de piernas colgado o tumbado."},
    {"name": "Russian twist", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "beginner", "description": "Rotación de tronco con o sin peso."},
    {"name": "Mountain climbers", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "beginner", "description": "Escaladores para core y cardio."},
    {"name": "Ab roller", "muscle_groups": ["core"], "equipment": ["maquina"], "category": "core", "difficulty": "intermediate", "description": "Rueda abdominal para core completo."},
    {"name": "Crunch en máquina", "muscle_groups": ["core"], "equipment": ["maquina"], "category": "core", "difficulty": "beginner", "description": "Crunch guiado en máquina."},
    {"name": "Bicycle crunch", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "beginner", "description": "Crunch con movimiento de pedaleo."},
    {"name": "Dead bug", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "core", "difficulty": "beginner", "description": "Estabilización de core tumbado boca arriba."},

    # ========== CARDIO / AERÓBICO ==========
    {"name": "Cinta de correr", "muscle_groups": ["cardio"], "equipment": ["cinta"], "category": "cardio", "difficulty": "beginner", "description": "Caminata o carrera en cinta motorizada."},
    {"name": "Elíptica", "muscle_groups": ["cardio"], "equipment": ["eliptica"], "category": "cardio", "difficulty": "beginner", "description": "Máquina elíptica de bajo impacto."},
    {"name": "Bicicleta estática", "muscle_groups": ["cardio", "piernas"], "equipment": ["maquina"], "category": "cardio", "difficulty": "beginner", "description": "Bicicleta estática para cardio y piernas."},
    {"name": "Remo ergómetro", "muscle_groups": ["cardio", "espalda"], "equipment": ["maquina"], "category": "cardio", "difficulty": "intermediate", "description": "Máquina de remo para cardio y fuerza."},
    {"name": "Escaladora (StairMaster)", "muscle_groups": ["cardio", "piernas"], "equipment": ["maquina"], "category": "cardio", "difficulty": "intermediate", "description": "Máquina escaladora de escalones."},
    {"name": "Assault Bike", "muscle_groups": ["cardio"], "equipment": ["maquina"], "category": "cardio", "difficulty": "intermediate", "description": "Bicicleta de aire para HIIT."},
    {"name": "Saltar a la comba", "muscle_groups": ["cardio"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "beginner", "description": "Salto con cuerda para cardio y coordinación."},
    {"name": "Burpees", "muscle_groups": ["cardio", "core"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "intermediate", "description": "Ejercicio de cuerpo completo con salto."},
    {"name": "Sprints", "muscle_groups": ["cardio", "piernas"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "intermediate", "description": "Carreras de velocidad cortas."},
    {"name": "Natación", "muscle_groups": ["cardio", "espalda"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "intermediate", "description": "Ejercicio aeróbico de bajo impacto en piscina."},
    {"name": "Ciclismo", "muscle_groups": ["cardio", "piernas"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "beginner", "description": "Ciclismo al aire libre o indoor."},
    {"name": "Carrera continua", "muscle_groups": ["cardio"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "beginner", "description": "Carrera a ritmo constante moderado."},
    {"name": "HIIT", "muscle_groups": ["cardio"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "advanced", "description": "Entrenamiento interválico de alta intensidad."},
    {"name": "Jumping jacks", "muscle_groups": ["cardio"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "beginner", "description": "Saltos de tijera para calentamiento y cardio."},
    {"name": "Box jumps", "muscle_groups": ["cardio", "piernas"], "equipment": ["sin_equipo"], "category": "cardio", "difficulty": "intermediate", "description": "Saltos al cajón para potencia y cardio."},

    # ========== CALENTAMIENTO ==========
    {"name": "Movilidad articular general", "muscle_groups": ["core"], "equipment": ["sin_equipo"], "category": "calentamiento", "difficulty": "beginner", "description": "Rutina de movilidad para todas las articulaciones."},
    {"name": "Rotación de hombros", "muscle_groups": ["hombros"], "equipment": ["sin_equipo"], "category": "calentamiento", "difficulty": "beginner", "description": "Círculos de hombros para calentar la articulación."},
    {"name": "Sentadilla sin peso", "muscle_groups": ["piernas"], "equipment": ["sin_equipo"], "category": "calentamiento", "difficulty": "beginner", "description": "Sentadilla de calentamiento sin carga."},
    {"name": "Trote suave", "muscle_groups": ["cardio"], "equipment": ["sin_equipo"], "category": "calentamiento", "difficulty": "beginner", "description": "Trote ligero para elevar temperatura corporal."},

    # ========== ESTIRAMIENTO ==========
    {"name": "Estiramiento de cuádriceps", "muscle_groups": ["piernas"], "equipment": ["sin_equipo"], "category": "estiramiento", "difficulty": "beginner", "description": "Estiramiento de cuádriceps de pie o tumbado."},
    {"name": "Estiramiento de isquiotibiales", "muscle_groups": ["piernas"], "equipment": ["sin_equipo"], "category": "estiramiento", "difficulty": "beginner", "description": "Estiramiento de isquiotibiales sentado o de pie."},
    {"name": "Estiramiento de pectorales", "muscle_groups": ["pecho"], "equipment": ["sin_equipo"], "category": "estiramiento", "difficulty": "beginner", "description": "Estiramiento de pectorales en marco de puerta."},
    {"name": "Estiramiento de espalda (gato-camello)", "muscle_groups": ["espalda"], "equipment": ["sin_equipo"], "category": "estiramiento", "difficulty": "beginner", "description": "Movilización de columna en cuadrupedia."},
    {"name": "Estiramiento de tríceps", "muscle_groups": ["brazos"], "equipment": ["sin_equipo"], "category": "estiramiento", "difficulty": "beginner", "description": "Estiramiento de tríceps por detrás de la cabeza."},
]
