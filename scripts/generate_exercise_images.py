"""Generate exercise images using NanoBanana Pro API and upload to Cloudflare R2.

Reads exercises from exercises_data.json, generates a photorealistic gym image
for each one, uploads to R2, and tracks progress for resumability.
"""
import json
import os
import sys
import time
import base64
import tempfile
import subprocess
import requests

API_KEY = os.environ.get("NANOBANANA_API_KEY", "")
API_URL = "https://api.laozhang.ai/v1beta/models/gemini-3-pro-image-preview:generateContent"
BUCKET_NAME = "exercise-images"
R2_PUBLIC_BASE = "https://pub-9b395e0f2f6542b3ab0bd253607e8231.r2.dev"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WEB_DIR = os.path.join(SCRIPT_DIR, "..", "web")
EXERCISES_FILE = os.path.join(SCRIPT_DIR, "exercises_data.json")
PROGRESS_FILE = os.path.join(SCRIPT_DIR, "progress.json")
MAX_RETRIES = 3

NEGATIVE_PROMPT = (
    "Do NOT include any of the following: blurry, low-res, cartoon, 3d render, "
    "illustration, CGI, plastic skin, extra limbs, distorted anatomy, warped faces, "
    "asymmetrical eyes, duplicate people, deformed fingers, extra fingers, bent barbell, "
    "floating weights, misspelled titles, random extra letters, watermarks, brand logos, "
    "flat lighting, messy clutter, unrealistic body proportions, extreme fisheye."
)

EQUIPMENT_EN = {
    "barra": "barbell",
    "mancuerna": "dumbbell",
    "maquina": "machine",
    "polea": "cable pulley",
    "banco": "bench",
    "multipower": "Smith machine",
    "sin_equipo": "bodyweight",
    "banda_elastica": "resistance band",
    "barra_dominadas": "pull-up bar",
    "disco": "weight plate",
    "landmine": "landmine attachment",
    "bicicleta": "stationary bike",
    "cinta": "treadmill",
    "eliptica": "elliptical machine",
    "cajon": "plyo box",
    "cuerdas": "battle ropes",
    "comba": "jump rope",
    "kettlebell": "kettlebell",
}

MUSCLE_EN = {
    "pecho": "chest",
    "espalda": "back",
    "hombros": "shoulders",
    "brazos": "arms",
    "piernas": "legs",
    "gluteos": "glutes",
    "core": "core",
    "cardio": "cardiovascular system",
}

# Map of exercise name patterns -> English action description for the prompt.
# The AI model needs an English description of what the person is doing.
# We build this dynamically from the exercise name, category and equipment.

def translate_equipment(equip_list: list[str]) -> str:
    return ", ".join(EQUIPMENT_EN.get(e, e) for e in equip_list if e != "sin_equipo")

def translate_muscles(muscles: list[str]) -> str:
    return ", ".join(MUSCLE_EN.get(m, m) for m in muscles)

def build_exercise_description(name: str, category: str, muscles: list[str], equipment: list[str]) -> str:
    """Build an English description of the exercise action for the image prompt.
    
    This creates a natural description like 'performing a barbell bench press on a flat bench'
    from the Spanish exercise name and metadata.
    """
    equip_en = translate_equipment(equipment)
    muscles_en = translate_muscles(muscles)
    
    n = name.lower()
    
    # --- CALENTAMIENTO ---
    if category == "calentamiento":
        if "jumping jacks" in n: return "performing jumping jacks, arms raised overhead mid-jump"
        if "bird dog" in n: return "performing a bird dog on all fours, extending opposite arm and leg"
        if "inchworm" in n: return "performing an inchworm walkout from standing to plank position"
        if "gato-camello" in n or "gato" in n: return "performing cat-cow stretches on all fours, arching the back"
        if "trote" in n: return "jogging in place with light steps"
        if "sentadilla sin peso" in n: return "performing a bodyweight air squat"
        if "círculos de brazos" in n or "circulos de brazos" in n: return "performing arm circles with extended arms"
        if "rotación de caderas" in n or "rotacion de caderas" in n: return "performing standing hip circles"
        if "rotación de hombros" in n or "rotacion de hombros" in n: return f"performing shoulder rotations with a {equip_en}" if equip_en else "performing shoulder rotations"
        if "rotación torácica" in n or "rotacion toracica" in n: return "performing thoracic rotation in quadruped position on all fours"
        if "movilidad articular" in n: return "performing general joint mobility exercises, rotating wrists, ankles and neck"
        if "balanceo de piernas frontal" in n: return "performing front-to-back standing leg swings holding a rack for balance"
        if "balanceo de piernas lateral" in n: return "performing side-to-side standing leg swings holding a rack for balance"
        if "activación de glúteos" in n or "activacion de gluteos" in n: return f"performing banded glute activation walks with a {equip_en} around the thighs"
        if "band pull apart" in n: return "performing band pull-aparts with a resistance band at chest height"
        return "performing a warm-up exercise"

    # --- ESTIRAMIENTO ---
    if category == "estiramiento":
        if "90/90" in n: return "performing the 90/90 hip stretch seated on the floor"
        if "mariposa" in n or "aductores sentado" in n: return "performing a seated butterfly adductor stretch"
        if "bíceps en pared" in n or "biceps en pared" in n: return "stretching the biceps against a wall with arm extended behind"
        if "cuádriceps de pie" in n or "cuadriceps de pie" in n: return "stretching the quadriceps standing on one leg, pulling the foot to the glute"
        if "dorsal en barra" in n: return "performing a hanging lat stretch from a pull-up bar"
        if "espalda baja tumbado" in n: return "performing a lying lower back twist stretch on the floor"
        if "gemelos en pared" in n: return "stretching the calves against a wall in a lunge stance"
        if "glúteo tumbado" in n or "gluteo tumbado" in n: return "performing a lying glute stretch, pulling one knee across the body"
        if "hombro cruzado" in n: return "performing a cross-body shoulder stretch, pulling one arm across the chest"
        if "isquiotibiales de pie" in n: return "stretching the hamstrings standing, bending forward with straight legs"
        if "pectoral en marco" in n: return "stretching the chest muscles in a doorway with arms on the frame"
        if "trapecio lateral" in n: return "performing a lateral neck and trapezius stretch, tilting the head to one side"
        if "tríceps por detrás" in n or "triceps por detras" in n: return "stretching the triceps by reaching one arm behind the head"
        if "flexor de cadera" in n: return "performing a hip flexor stretch in a deep lunge position"
        if "child pose" in n or "niño" in n: return "performing child's pose, kneeling with arms extended forward on the floor"
        return "performing a stretching exercise"

    # --- CARDIO ---
    if category == "cardio":
        if "assault bike" in n: return "riding an assault air bike at high intensity"
        if "battle ropes" in n: return "performing alternating battle rope waves with intensity"
        if "bicicleta estática" in n or "bicicleta estatica" in n: return "pedaling on a stationary bike"
        if "box jumps" in n: return "performing explosive box jumps onto a plyo box"
        if "burpees" in n and "no push" in n: return "performing no push-up burpees, jumping and squatting explosively"
        if "burpees" in n: return "performing burpees, dropping to the ground and jumping explosively"
        if "carrera continua" in n: return "running at a steady pace outdoors or on a track"
        if "cinta de correr" in n: return "running on a treadmill"
        if "elíptica" in n or "eliptica" in n: return "exercising on an elliptical machine"
        if "escaladora" in n or "stairmaster" in n: return "climbing on a StairMaster machine"
        if "high knees" in n or "rodillas altas" in n: return "performing high knees, driving knees up to the chest while running in place"
        if "hiit en cinta" in n: return "sprinting on a treadmill during HIIT intervals"
        if "mountain climbers" in n: return "performing mountain climbers in plank position, driving knees to chest"
        if "remo ergómetro" in n or "remo ergometro" in n: return "rowing on an ergometer rowing machine"
        if "saltar a la comba" in n: return "jumping rope with a speed rope"
        if "skipping" in n: return "performing high-knee skipping, driving alternate knees to the chest"
        if "sprints" in n: return "sprinting at full speed on a track or field"
        return "performing a cardio exercise"

    # --- CORE ---
    if category == "core":
        if "elevación de piernas en barra" in n or "elevacion de piernas en barra" in n: return "performing hanging leg raises from a pull-up bar"
        if "elevación de piernas tumbado" in n or "elevacion de piernas tumbado" in n: return "performing lying leg raises on the floor"
        if "inclinaciones laterales" in n: return "performing alternating lateral oblique crunches on the floor"
        if "tijera" in n: return "performing scissor kicks lying face up on the floor"
        if "butterfly sit up" in n: return "performing butterfly sit-ups with soles of feet together"
        if "crunch abdominal en polea" in n: return "performing cable crunches kneeling in front of a high cable pulley"
        if "crunch acordeón con mancuerna" in n or "crunch acordeon con mancuerna" in n: return "performing accordion crunches holding a dumbbell"
        if "crunch acordeón en banco" in n or "crunch acordeon en banco" in n: return "performing accordion crunches seated on a bench"
        if "crunch bicicleta" in n: return "performing bicycle crunches, alternating elbow to opposite knee"
        if "crunch vertical" in n: return "performing vertical crunches with legs raised straight up"
        if "crunch abdominal" in n: return "performing standard abdominal crunches on the floor"
        if "encogimiento abdominal" in n: return "performing lying abdominal tuck crunches"
        if "escaladores cruzado" in n: return "performing cross-body mountain climbers in plank position"
        if "plancha sobre antebrazos" in n: return "holding a forearm plank on the floor"
        if "plancha sobre manos" in n or "superman altern" in n: return "performing plank with alternating superman arm extensions"
        if "press pallof" in n: return f"performing Pallof press rotations with a {equip_en}"
        if "shoultaps" in n or "shoulder taps" in n: return "performing shoulder taps in a high plank position"
        if "sit up" in n: return "performing sit-ups on the floor"
        if "superman" in n: return "performing superman back extensions lying face down"
        return "performing a core exercise on the floor"

    # --- FUERZA ---
    # Try to map by name patterns
    if "press banca" in n and "inclinado" in n and "mancuernas" in n and "juntas" not in n and "hex" not in n:
        return f"performing an incline dumbbell bench press on an incline bench"
    if "press banca" in n and "inclinado" in n and "barra" in n:
        return "performing an incline barbell bench press"
    if "press banca" in n and "inclinado" in n and ("multipower" in n or "máquina" in n or "maquina" in n):
        return f"performing an incline bench press on a {'Smith machine' if 'multipower' in n else 'machine'}"
    if "press banca" in n and "mancuernas juntas" in n:
        return "performing a close-grip dumbbell bench press, dumbbells touching each other"
    if "press banca" in n and "mancuernas" in n:
        return "performing a flat dumbbell bench press"
    if "press banca" in n and "multipower" in n:
        return "performing a flat bench press on a Smith machine"
    if "press banca" in n and "barra" in n:
        return "performing a flat barbell bench press, lying on a bench pressing a loaded barbell"
    if "press hex inclinado" in n:
        return "performing an incline hex press with dumbbells pressed together"
    if "press inclinado con mancuernas" in n:
        return "performing an incline dumbbell bench press"
    if "press declinado" in n:
        return "performing a decline dumbbell bench press on a decline bench"
    if "press cerrado" in n and "barra z" in n:
        return "performing a close-grip EZ bar bench press"
    if "press cerrado" in n and "tríceps" in n:
        return "performing a close-grip barbell bench press for triceps"
    if "press de pecho en máquina" in n or "press de pecho en maquina" in n:
        return "performing a machine chest press"
    if "press banca inclinado en máquina" in n or "press banca inclinado en maquina" in n:
        return "performing an incline machine chest press"
    if "press arnold" in n:
        return "performing seated Arnold press with dumbbells, rotating the wrists during the movement"
    if "press militar" in n and "máquina" in n:
        return "performing a shoulder press on a machine"
    if "press militar" in n and "multipower" in n:
        return "performing a shoulder press on a Smith machine"
    if "press militar" in n and "barra" in n:
        return "performing a seated barbell overhead press"
    if "press militar" in n and "mancuernas" in n:
        return "performing a seated dumbbell overhead press"
    if "press francés" in n or "press frances" in n:
        equip = "EZ bar" if "barra z" in n else "dumbbells"
        return f"performing a lying skull crusher (French press) with {equip}"
    if "apertura" in n and "inclinado" in n:
        return "performing incline dumbbell chest flyes on an incline bench"
    if "apertura" in n and "banco plano" in n:
        return "performing flat dumbbell chest flyes on a flat bench"
    if "aperturas desde abajo" in n:
        return "performing low-to-high dumbbell chest flyes"
    if "aperturas en banco declinado" in n:
        return "performing decline dumbbell chest flyes on a decline bench"
    if "cruces de pecho" in n:
        return "performing high cable chest crossovers on a cable machine"
    if "curl de biceps" in n or "curl de bíceps" in n:
        if "scott" in n and "inverso" in n: return "performing reverse grip EZ bar preacher curls on a Scott bench"
        if "scott" in n or "banco scott" in n: return "performing EZ bar preacher curls on a Scott bench"
        if "concentrado" in n: return "performing seated concentration curls with one dumbbell"
        if "martillo alterno" in n: return "performing alternating standing hammer curls with dumbbells"
        if "martillo" in n: return "performing standing hammer curls with dumbbells"
        if "alterno" in n: return "performing alternating standing dumbbell bicep curls"
        if "isométrico" in n or "isometrico" in n:
            return "performing an iso-hold bicep curl with dumbbells, one arm curling while the other holds"
        if "agarre prono" in n: return "performing standing reverse grip barbell curls"
        if "barra z agarre estrecho" in n: return "performing standing close-grip EZ bar bicep curls"
        if "polea baja" in n: return "performing standing bicep curls on a low cable pulley"
        if "barra" in n: return "performing standing barbell bicep curls"
        if "mancuernas" in n or "mancuerna" in n: return "performing standing dumbbell bicep curls"
        if "press de hombro" in n: return "performing a dumbbell bicep curl into an overhead shoulder press"
        return "performing bicep curls"
    if "curl femoral" in n:
        if "sentado" in n: return "performing seated leg curls on a machine"
        if "tumbado" in n and "mancuerna" in n: return "performing lying leg curls holding a dumbbell between the feet"
        if "tumbado" in n: return "performing lying prone leg curls on a machine"
        return "performing leg curls"
    if "extensión de tríceps" in n or "extension de triceps" in n or "extensión de triceps" in n:
        if "cuerda" in n: return "performing cable rope triceps pushdowns on a high cable pulley"
        if "agarre prono" in n: return "performing overhand grip cable triceps pushdowns"
        if "agarre supino" in n: return "performing underhand grip cable triceps pushdowns"
        if "unilateral" in n: return "performing single-arm cable triceps pushdowns"
        if "tras nuca" in n and "bilateral" in n: return "performing standing overhead dumbbell triceps extensions with both arms"
        if "tras nuca" in n: return "performing seated overhead dumbbell triceps extensions"
        return "performing triceps extensions"
    if "extensión de cuádriceps" in n or "extension de cuadriceps" in n:
        if "mancuerna" in n: return "performing leg extensions holding a dumbbell between the feet"
        return "performing leg extensions on a machine"
    if "extensión de gemelo sentado" in n or "extension de gemelo sentado" in n:
        return "performing seated calf raises on a machine"
    if "patada de tríceps" in n or "patada de triceps" in n:
        if "unilateral" in n: return "performing single-arm dumbbell triceps kickbacks, bent over"
        return "performing dumbbell triceps kickbacks, bent over"
    if "patada de glúteo" in n or "patada de gluteo" in n:
        return "performing single-leg glute kickbacks on a machine"
    if "fondos en banco" in n:
        if "pies elevados" in n: return "performing bench dips with feet elevated and a weight plate on the lap"
        return "performing bench triceps dips with hands on a bench behind"
    if "flexiones" in n or "flexión" in n or "flexion" in n:
        if "diamante" in n: return "performing diamond push-ups with hands close together"
        if "declinadas" in n: return "performing decline push-ups with feet elevated on a bench"
        if "banda" in n: return "performing banded push-ups with a resistance band across the back"
        if "mancuernas" in n: return "performing push-ups with hands gripping dumbbells on the floor"
        return "performing standard push-ups on the floor"
    if "dominadas" in n:
        return "performing close-grip pull-ups on a pull-up bar"
    if "jalón" in n or "jalon" in n:
        if "agarre cerrado" in n: return "performing close-grip lat pulldowns on a cable machine"
        if "agarre neutro" in n: return "performing neutral-grip lat pulldowns on a cable machine"
        if "unilateral" in n: return "performing single-arm lat pulldowns on a cable machine"
        return "performing lat pulldowns on a cable machine, pulling the bar to the chest"
    if "remo" in n:
        if "mentón" in n or "menton" in n: return "performing upright rows with dumbbells"
        if "seal" in n: return "performing seal rows lying chest-down on a bench with dumbbells"
        if "gironda" in n: return "performing Gironda-style seated cable rows on a low pulley"
        if "landmine" in n and "unilateral" in n: return "performing single-arm landmine rows"
        if "landmine" in n or "remo t" in n: return "performing T-bar landmine rows"
        if "inclinado" in n and "unilateral" in n and "banco" in n: return "performing single-arm dumbbell rows on an incline bench"
        if "inclinado" in n and "unilateral" in n: return "performing single-arm bent-over dumbbell rows"
        if "inclinado" in n and "multipower" in n: return "performing bent-over barbell rows on a Smith machine"
        if "inclinado" in n and "barra" in n: return "performing bent-over barbell rows with overhand grip"
        if "inclinado" in n and "mancuernas" in n: return "performing bent-over dumbbell rows"
        if "cerrado" in n and "banda" in n and "unilateral" in n: return "performing single-arm standing resistance band rows"
        if "cerrado" in n and "banda" in n: return "performing seated close-grip resistance band rows"
        return "performing rowing exercises"
    if "elevación frontal" in n or "elevacion frontal" in n:
        if "y lateral" in n: return "performing front and lateral dumbbell raises combination"
        if "polea" in n: return "performing front raises on a low cable pulley"
        if "barra z" in n: return "performing front raises with an EZ bar"
        return "performing dumbbell front raises"
    if "elevación lateral" in n or "elevacion lateral" in n or "elevaciones laterales" in n:
        if "máquina" in n or "maquina" in n: return "performing lateral raises on a machine"
        if "polea" in n: return "performing single-arm cable lateral raises"
        if "sentado" in n: return "performing seated dumbbell lateral raises"
        return "performing standing dumbbell lateral raises"
    if "elevaciones de gemelo" in n:
        if "unilateral" in n: return "performing single-leg standing calf raises on a step"
        if "barra" in n: return "performing standing calf raises with a barbell on the back"
        if "máquina" in n or "maquina" in n: return "performing standing calf raises on a calf raise machine"
        return "performing standing calf raises"
    if "encogimientos" in n or "encogimiento" in n:
        if "trapecio" in n or "barra" in n: return "performing barbell shrugs"
        return "performing dumbbell shrugs"
    if "pájaros" in n or "pajaros" in n:
        if "cruce de poleas" in n: return "performing rear delt cable flyes on a cable crossover"
        if "máquina" in n or "maquina" in n: return "performing reverse flyes on a pec deck machine"
        if "banco inclinado" in n: return "performing incline bench rear delt dumbbell flyes"
        return "performing seated bent-over rear delt dumbbell flyes"
    if "face pull" in n:
        return "performing face pulls with a rope on a cable machine"
    if "pull over" in n:
        if "polea" in n: return "performing standing cable pullovers on a high cable pulley"
        return "performing dumbbell pullovers lying on a bench"
    if "push up walk" in n:
        return "performing walking push-ups, moving laterally in plank position"
    if "peso muerto" in n:
        if "unipodal" in n: return "performing single-leg Romanian deadlift with a dumbbell"
        if "rumano" in n and "barra" in n: return "performing Romanian deadlift with a barbell, hinging at the hips"
        if "rumano" in n and "mancuernas" in n: return "performing Romanian deadlift with dumbbells"
        if "barra" in n: return "performing a conventional barbell deadlift from the floor"
        if "mancuernas" in n: return "performing deadlifts with dumbbells"
        return "performing a deadlift"
    if "hip thrust" in n:
        if "mancuerna" in n: return "performing hip thrusts with a dumbbell on the hips, back against a bench"
        return "performing barbell hip thrusts with back against a bench, driving hips upward"
    if "hiperextensión" in n or "hiperextension" in n:
        return "performing back hyperextensions on a 45-degree hyperextension bench"
    if "sentadilla" in n:
        if "búlgara" in n or "bulgara" in n:
            if "mancuernas" in n: return "performing Bulgarian split squats holding dumbbells, rear foot on a bench"
            return "performing Bulgarian split squats with rear foot elevated on a bench"
        if "sumo" in n and "rebotes" in n: return "performing sumo squat pulses holding a dumbbell"
        if "sumo" in n: return "performing sumo squats holding a dumbbell between the legs"
        if "goblet" in n: return "performing goblet squats with a dumbbell held at the chest, heels elevated"
        if "frontal" in n: return "performing front squats holding dumbbells at the shoulders"
        if "cerrada" in n: return "performing close-stance squats on a Smith machine"
        if "salto" in n: return "performing explosive jump squats"
        if "máquina jaca" in n or "maquina jaca" in n: return "performing hack squats on a hack squat machine"
        if "multipower" in n: return "performing squats on a Smith machine"
        if "mancuernas" in n: return "performing squats holding dumbbells at the sides"
        return "performing squats"
    if "zancada" in n:
        if "cruzada" in n: return "performing alternating curtsy lunges"
        return "performing alternating walking lunges with dumbbells"
    if "wall sit" in n:
        return "performing a wall sit with a dumbbell on the thighs, back flat against the wall"
    if "prensa de piernas" in n:
        return "performing incline leg press on a leg press machine"
    if "abducciones de glúteo" in n or "abducciones de gluteo" in n:
        return "performing hip abductions on a machine, pushing legs outward"
    if "aducciones de piernas" in n:
        return "performing hip adductions on a machine, squeezing legs inward"
    if "puente de glúteos" in n or "puente de gluteos" in n:
        return "performing single-leg glute bridges on the floor"
    if "6 ways" in n:
        return "performing dumbbell 6-ways shoulder raise sequence (front, lateral, overhead)"
    
    equip_desc = f" with {equip_en}" if equip_en else ""
    return f"performing a {category} exercise targeting {muscles_en}{equip_desc}"


def build_prompt(exercise: dict) -> str:
    name = exercise["name"]
    category = exercise["category"]
    muscles = exercise["muscle_groups"]
    equipment = exercise["equipment"]
    
    action = build_exercise_description(name, category, muscles, equipment)
    muscles_en = translate_muscles(muscles)
    
    is_floor = any(kw in action.lower() for kw in [
        "lying", "floor", "plank", "kneeling", "seated on the floor",
        "face down", "all fours", "quadruped", "child"
    ])
    
    is_stretching = category == "estiramiento"
    is_cardio = category == "cardio"
    is_warmup = category == "calentamiento"
    
    if is_stretching:
        muscle_line = (
            f"Calm, focused expression showing relaxation. The stretched muscles "
            f"({muscles_en}) show natural definition and flexibility."
        )
        clothing = "a dark, well-fitted athletic t-shirt and black shorts"
    elif is_cardio:
        muscle_line = (
            f"Intense, determined facial expression. His {muscles_en} area shows "
            f"effort, subtle beads of sweat on his forehead and arms."
        )
        clothing = "a dark, well-fitted athletic t-shirt and black shorts"
    elif is_warmup:
        muscle_line = (
            f"Focused facial expression showing preparation. Light activation visible "
            f"in {muscles_en} area."
        )
        clothing = "a dark, well-fitted athletic t-shirt and black shorts"
    else:
        muscle_line = (
            f"Intense, focused facial expression. His {muscles_en} are fully pumped "
            f"and engaged, displaying extreme muscle definition, realistic vascularity, "
            f"and subtle beads of sweat."
        )
        clothing = "a dark, well-fitted athletic t-shirt and black shorts"
    
    if is_floor:
        form_line = f"Perfect biomechanical form: {action}."
    else:
        form_line = f"Perfect biomechanical form: {action}."
    
    text_size_hint = ""
    if len(name) > 35:
        text_size_hint = " Use a smaller font size so the entire text fits on one line without any line break."
    
    prompt = (
        f'A high-end photorealistic smartphone photo shot on iPhone 15 Pro of a highly fit '
        f'Caucasian man {action} in a premium modern indoor gym. '
        f'He is wearing {clothing}. '
        f'{form_line} '
        f'{muscle_line} '
        f'Cinematic gym lighting: overhead fluorescent spotlights create a striking rim-light '
        f'on his arms and shoulders, enhancing the 3D depth. The background features gym racks, '
        f'dumbbells, and mirrors with realistic reflections, rendered with a natural smartphone '
        f'depth of field. The image has realistic HDR processing, mild film grain, and subtle '
        f'noise for authenticity. '
        f'In the top-left corner, clean, sharp, white bold condensed sans-serif text reads '
        f'exactly: "{name}", backed by a subtle semi-transparent dark rectangular strip for '
        f'readability.{text_size_hint} '
        f'{NEGATIVE_PROMPT}'
    )
    return prompt


class QuotaExhaustedError(Exception):
    """Raised when API returns insufficient_quota so we stop immediately."""
    pass


class RateLimitError(Exception):
    """Raised on 429 / rate limit so we can back off but keep going."""
    pass


def check_balance() -> float | None:
    """Check remaining API balance before generating. Returns balance or None if unavailable."""
    try:
        resp = requests.get(
            "https://api.laozhang.ai/v1/dashboard/billing/credit_grants",
            headers={"Authorization": f"Bearer {API_KEY}"},
            timeout=10,
        )
        if resp.status_code == 200:
            data = resp.json()
            available = data.get("total_available", data.get("balance", None))
            if available is not None:
                return float(available)
    except Exception:
        pass
    return None


def generate_image(prompt: str) -> bytes | None:
    """Generate an image. Raises QuotaExhaustedError or RateLimitError on those conditions."""
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {
                "aspectRatio": "4:5",
                "imageSize": "1K",
            },
        },
    }

    try:
        response = requests.post(API_URL, headers=headers, json=payload, timeout=180)
    except requests.exceptions.Timeout:
        print(f"    API Timeout (180s)")
        return None
    except requests.exceptions.ConnectionError as e:
        print(f"    Connection error: {e}")
        return None

    if response.status_code == 429:
        raise RateLimitError("Rate limited (429)")

    result = response.json()

    if "error" in result:
        err = result["error"]
        err_msg = err.get("message", str(err)) if isinstance(err, dict) else str(err)
        err_code = err.get("code", "") if isinstance(err, dict) else ""

        if "insufficient_quota" in err_msg.lower() or "insufficient_quota" in err_code.lower() \
                or "quota" in err_msg.lower() or response.status_code == 402:
            raise QuotaExhaustedError(f"API quota exhausted: {err_msg}")

        if "rate" in err_msg.lower() or response.status_code == 429:
            raise RateLimitError(f"Rate limited: {err_msg}")

        print(f"    API Error: {err_msg}")
        return None

    try:
        image_data = result["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
        return base64.b64decode(image_data)
    except (KeyError, IndexError) as e:
        print(f"    Parse error: {e}")
        print(f"    Response keys: {list(result.keys())}")
        return None


def save_to_disk(image_data: bytes, filename: str) -> bool:
    out_dir = os.path.join(SCRIPT_DIR, "generated_images")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, filename)
    with open(path, "wb") as f:
        f.write(image_data)
    return True


def upload_to_r2(image_data: bytes, filename: str) -> bool:
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
        tmp.write(image_data)
        tmp_path = tmp.name

    try:
        key = f"exercises/{filename}"
        cmd = f'wrangler r2 object put "{BUCKET_NAME}/{key}" --file="{tmp_path}" --content-type="image/png" --remote'
        result = subprocess.run(
            cmd, shell=True, capture_output=True,
            cwd=WEB_DIR, timeout=30,
        )
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace") if isinstance(result.stderr, bytes) else str(result.stderr)
            print(f"    Upload error: {stderr[:200]}")
            return False
        return True
    except Exception as e:
        print(f"    Upload exception: {e}")
        return False
    finally:
        os.unlink(tmp_path)


def upload_dir_to_r2():
    """Upload all images from generated_images/ to R2."""
    img_dir = os.path.join(SCRIPT_DIR, "generated_images")
    if not os.path.isdir(img_dir):
        print("No generated_images directory found.")
        return
    files = [f for f in os.listdir(img_dir) if f.endswith(".png")]
    print(f"Uploading {len(files)} images to R2...")
    for i, fname in enumerate(files):
        path = os.path.join(img_dir, fname)
        key = f"exercises/{fname}"
        cmd = f'wrangler r2 object put "{BUCKET_NAME}/{key}" --file="{path}" --content-type="image/png" --remote'
        result = subprocess.run(cmd, shell=True, capture_output=True, cwd=WEB_DIR, timeout=30)
        status = "OK" if result.returncode == 0 else "FAIL"
        print(f"  [{i+1}/{len(files)}] {fname}: {status}")
    print("Upload complete.")


def delete_from_r2(filename: str) -> bool:
    key = f"exercises/{filename}"
    cmd = f'wrangler r2 object delete "{BUCKET_NAME}/{key}" --remote'
    try:
        subprocess.run(cmd, shell=True, capture_output=True, cwd=WEB_DIR, timeout=15)
    except Exception:
        pass
    return True


def load_progress() -> dict:
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": [], "failed": []}


def save_progress(progress: dict):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def main():
    if not API_KEY:
        print("ERROR: Set NANOBANANA_API_KEY environment variable")
        sys.exit(1)

    with open(EXERCISES_FILE, "r", encoding="utf-8") as f:
        exercises = json.load(f)

    progress = load_progress()
    completed_ids = set(progress["completed"])

    remaining = [e for e in exercises if e["id"] not in completed_ids]
    total = len(exercises)
    done = len(completed_ids)

    print("=" * 60)
    print("Exercise Image Generator - NanoBanana Pro + Cloudflare R2")
    print(f"Total: {total} | Already done: {done} | Remaining: {len(remaining)}")
    print("=" * 60)

    balance = check_balance()
    if balance is not None:
        print(f"API Balance: ${balance:.2f}")
        if balance < 0.03:
            print("STOPPING: Insufficient balance (< $0.03). Recharge before running.")
            return

    consecutive_failures = 0

    for i, ex in enumerate(remaining):
        idx = done + i + 1
        print(f"\n[{idx}/{total}] {ex['name']} ({ex['id'][:8]}...)")

        prompt = build_prompt(ex)
        filename = f"{ex['id']}.png"
        success = False
        quota_dead = False

        for attempt in range(1, MAX_RETRIES + 1):
            print(f"  Attempt {attempt}/{MAX_RETRIES}: generating...")
            try:
                image_data = generate_image(prompt)
            except QuotaExhaustedError as e:
                print(f"\n{'!' * 60}")
                print(f"QUOTA EXHAUSTED: {e}")
                print(f"Saved progress: {len(progress['completed'])}/{total} completed.")
                print(f"Recharge your balance and re-run the script to continue.")
                print(f"{'!' * 60}")
                save_progress(progress)
                return
            except RateLimitError as e:
                print(f"    Rate limited: {e}")
                wait = 15 * attempt
                print(f"    Waiting {wait}s before retry...")
                time.sleep(wait)
                continue

            if not image_data:
                print(f"    Generation failed (no image data)")
                consecutive_failures += 1
                if consecutive_failures >= 5:
                    print(f"\n{'!' * 60}")
                    print(f"5 CONSECUTIVE FAILURES - stopping to prevent credit waste.")
                    print(f"Saved progress: {len(progress['completed'])}/{total} completed.")
                    print(f"{'!' * 60}")
                    save_progress(progress)
                    return
                if attempt < MAX_RETRIES:
                    time.sleep(5 * attempt)
                continue

            consecutive_failures = 0
            print(f"    Generated {len(image_data)} bytes")

            if save_to_disk(image_data, filename):
                print(f"    Saved to disk")

            print(f"    Uploading to R2...")
            if upload_to_r2(image_data, filename):
                print(f"    Uploaded to R2 OK")
                success = True
                break
            else:
                print(f"    R2 upload failed, image saved locally as fallback")
                success = True
                break

        if success:
            progress["completed"].append(ex["id"])
        else:
            progress["failed"].append({"id": ex["id"], "name": ex["name"]})
            print(f"    FAILED after {MAX_RETRIES} attempts")

        save_progress(progress)
        time.sleep(3)

    print(f"\n{'=' * 60}")
    print(f"DONE: {len(progress['completed'])}/{total} completed")
    if progress["failed"]:
        print(f"FAILED: {len(progress['failed'])} exercises:")
        for f_item in progress["failed"]:
            print(f"  - {f_item['name']}")
    print("=" * 60)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "upload":
        upload_dir_to_r2()
    else:
        main()
