"""Create a local environment file with fresh application secrets."""

from pathlib import Path
import secrets
import sys


REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = REPO_ROOT / ".env.example"
ENV_PATH = REPO_ROOT / ".env"
REQUIRED_TEMPLATE_VALUES = ("POSTGRES_DB", "POSTGRES_USER", "ADMIN_EMAIL")
GENERATED_VALUE_NAMES = ("POSTGRES_PASSWORD", "JWT_SECRET", "ADMIN_PASSWORD")


def main() -> int:
    """Generate the root environment file without overwriting existing values."""
    if ENV_PATH.exists():
        print("An .env file already exists. It was left unchanged; edit it manually if needed.", file=sys.stderr)
        return 1

    template_lines = TEMPLATE_PATH.read_text(encoding="utf-8").splitlines()
    template_values: dict[str, str] = {}
    for line in template_lines:
        if "=" in line and not line.lstrip().startswith("#"):
            name, value = line.split("=", 1)
            template_values[name.strip()] = value

    for name in REQUIRED_TEMPLATE_VALUES:
        if not template_values.get(name, "").strip():
            print(f"The .env.example file must define {name}.", file=sys.stderr)
            return 1

    missing_generated_values = set(GENERATED_VALUE_NAMES) - template_values.keys()
    if missing_generated_values:
        names = ", ".join(sorted(missing_generated_values))
        print(f"The .env.example file must define: {names}.", file=sys.stderr)
        return 1

    generated_values = {
        "POSTGRES_PASSWORD": secrets.token_hex(32),
        "JWT_SECRET": secrets.token_urlsafe(48),
        "ADMIN_PASSWORD": f"Aa9!{secrets.token_hex(24)}",
    }
    output_lines: list[str] = []
    for line in template_lines:
        if "=" in line and not line.lstrip().startswith("#"):
            name = line.split("=", 1)[0].strip()
            if name in generated_values:
                line = f"{name}={generated_values[name]}"
        output_lines.append(line)

    ENV_PATH.write_text("\n".join(output_lines) + "\n", encoding="utf-8")
    print("Created .env with fresh random database and JWT secrets.")
    print(f"Admin email: {template_values['ADMIN_EMAIL']}")
    print(f"Admin password: {generated_values['ADMIN_PASSWORD']}")
    print("Keep these credentials private. The admin account is seeded when the database is first initialized.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())