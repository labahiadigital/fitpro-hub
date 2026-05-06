"""Detecta funciones autenticadas en endpoints que NO filtran por workspace_id.

No es 100% preciso (puede haber falsos positivos para endpoints globales como
/users/me o catálogos del sistema), pero da una buena señal sobre filtraciones
cross-workspace.
"""
import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "backend" / "app" / "api" / "v1" / "endpoints"

AUTH_DEPS = (
    "require_workspace",
    "require_staff",
    "require_admin",
    "require_owner",
    "require_super_admin",
    "require_any_role",
)

# Funciones donde NO esperamos filtro por workspace porque su scope es
# distinto (perfil del propio user, catálogos globales, healthchecks, etc.).
ALLOWED_NO_WORKSPACE = {
    "list_my_forms",
    "count_my_pending_required",
    "respond_my_form",
    "list_supported_devices",
    "list_common_allergens",
    "list_common_diseases",
    "list_common_intolerances",
    "list_supplement_referrals",
    "foods_status",
    "list_workspaces",
    "create_workspace",
    "switch_workspace",
    "verify_certificate",
    "list_my_enrollments",
    "_get_client_for_current_user",
    "get_redsys_config_status",
    "get_response_codes",
    "get_config_status",
    "debug_ping",
    "get_common_allergens",
    "_serialize_form",  # helpers
    "_apply_payload",
    "_safe_product_ids",
}


def has_auth_dep(node: ast.AsyncFunctionDef | ast.FunctionDef) -> bool:
    for arg in (*node.args.args, *node.args.kwonlyargs):
        if arg.annotation is None:
            continue
        # Body inspection isn't reliable; rely on default value (Depends(..))
    # Inspect default values (kw)
    defaults = list(node.args.defaults) + list(node.args.kw_defaults or [])
    for d in defaults:
        if isinstance(d, ast.Call):
            func = d.func
            # Depends(require_xxx) or Depends(get_current_user)
            if isinstance(func, ast.Name) and func.id == "Depends" and d.args:
                target = d.args[0]
                if isinstance(target, ast.Name) and target.id in AUTH_DEPS + ("get_current_user",):
                    return True
    return False


def function_text(node: ast.AsyncFunctionDef | ast.FunctionDef, src: str) -> str:
    return ast.get_source_segment(src, node) or ""


def main():
    issues = []
    for f in sorted(ROOT.glob("*.py")):
        src = f.read_text(encoding="utf-8")
        try:
            tree = ast.parse(src)
        except SyntaxError:
            continue
        for node in ast.walk(tree):
            if not isinstance(node, (ast.AsyncFunctionDef, ast.FunctionDef)):
                continue
            # Skip private helpers
            if node.name.startswith("_"):
                continue
            if node.name in ALLOWED_NO_WORKSPACE:
                continue
            if not has_auth_dep(node):
                continue
            # Heuristic: look for usage of workspace_id in body
            body_src = function_text(node, src)
            if "workspace_id" not in body_src and "current_user.workspace_id" not in body_src:
                # Endpoints with no DB read (e.g. simple status) might be ok;
                # signal anyway for manual review.
                # Tag with file
                issues.append((f.name, node.name, node.lineno))

    if not issues:
        print("OK: no se ha detectado ninguna funcion autenticada sin filtro por workspace")
        return
    print(f"\n{'FILE':32} {'LINE':5} {'FUNCTION'}")
    print("-" * 80)
    for fname, fn, line in issues:
        print(f"{fname:32} {line:>5} {fn}")
    print(f"\nTotal funciones a revisar: {len(issues)}")


if __name__ == "__main__":
    main()
