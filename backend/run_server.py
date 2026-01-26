#!/usr/bin/env python
"""
Script de inicio del servidor backend.
Verifica que el puerto no esté ocupado antes de iniciar.
Maneja señales de interrupción para liberar el puerto correctamente.
"""
import socket
import sys
import os
import signal
import atexit

# Añadir el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8001

# Variable global para el servidor
_server = None
_port = None


def cleanup():
    """Limpia recursos al cerrar."""
    global _server, _port
    if _port:
        print(f"\n[INFO] Liberando puerto {_port}...")
    # Uvicorn maneja su propia limpieza, pero nos aseguramos de que se registre
    

def signal_handler(signum, frame):
    """Maneja señales de interrupción."""
    print(f"\n[INFO] Señal {signum} recibida, cerrando servidor...")
    cleanup()
    sys.exit(0)


def is_port_in_use(host: str, port: int) -> bool:
    """Verifica si un puerto está en uso intentando conectar."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        try:
            # Try to connect to see if something is listening
            result = s.connect_ex((host, port))
            if result == 0:
                return True  # Something is listening
            return False  # Nothing listening
        except socket.error:
            return False  # Can't connect, port is free


def kill_process_on_port(port: int) -> bool:
    """Intenta matar el proceso que usa el puerto (solo Windows)."""
    import subprocess
    
    try:
        # Obtener el PID del proceso
        result = subprocess.run(
            f'netstat -ano | findstr ":{port}.*LISTENING"',
            shell=True, capture_output=True, text=True
        )
        
        if result.stdout:
            lines = result.stdout.strip().split('\n')
            pids = set()
            for line in lines:
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    if pid.isdigit() and pid != '0':
                        pids.add(pid)
            
            for pid in pids:
                print(f"[INFO] Matando proceso PID {pid} en puerto {port}...")
                subprocess.run(f'taskkill /PID {pid} /F', shell=True, capture_output=True)
            
            return True
    except Exception as e:
        print(f"[WARN] No se pudo matar el proceso: {e}")
    
    return False


def main():
    global _port
    import argparse
    
    parser = argparse.ArgumentParser(description='Iniciar servidor backend')
    parser.add_argument('--host', default=DEFAULT_HOST, help='Host a usar')
    parser.add_argument('--port', type=int, default=DEFAULT_PORT, help='Puerto a usar')
    parser.add_argument('--reload', action='store_true', help='Habilitar hot reload')
    parser.add_argument('--force', action='store_true', help='Forzar inicio matando procesos existentes')
    
    args = parser.parse_args()
    _port = args.port
    
    # Registrar manejadores de señales
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    if hasattr(signal, 'SIGBREAK'):  # Windows
        signal.signal(signal.SIGBREAK, signal_handler)
    
    # Registrar limpieza al salir
    atexit.register(cleanup)
    
    print(f"[INFO] Verificando puerto {args.port}...")
    
    if is_port_in_use(args.host, args.port):
        print(f"[ERROR] El puerto {args.port} ya está en uso!")
        
        if args.force:
            print("[INFO] --force especificado, intentando liberar el puerto...")
            kill_process_on_port(args.port)
            
            # Esperar un momento y verificar de nuevo
            import time
            time.sleep(2)
            
            if is_port_in_use(args.host, args.port):
                print(f"[ERROR] No se pudo liberar el puerto {args.port}")
                print("[ERROR] Cierra manualmente la aplicación que usa el puerto y vuelve a intentar")
                sys.exit(1)
            else:
                print(f"[OK] Puerto {args.port} liberado exitosamente")
        else:
            print("[INFO] Usa --force para intentar liberar el puerto automáticamente")
            print("[INFO] O cierra manualmente la aplicación que usa el puerto")
            sys.exit(1)
    
    print(f"[OK] Puerto {args.port} disponible")
    print(f"[INFO] Iniciando servidor en {args.host}:{args.port}...")
    print(f"[INFO] Presiona Ctrl+C para detener el servidor")
    
    import uvicorn
    
    # Configuración de uvicorn con manejo adecuado de shutdown
    config = uvicorn.Config(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )
    server = uvicorn.Server(config)
    
    try:
        server.run()
    except KeyboardInterrupt:
        print("\n[INFO] Servidor detenido por el usuario")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
