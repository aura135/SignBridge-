import os
import zipfile
import shutil

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUTPUT_DIR = os.path.join(ROOT_DIR, 'public', 'downloads')
os.makedirs(OUTPUT_DIR, exist_ok=True)

EXCLUDE_PATTERNS = {
    'node_modules', '.git', '__pycache__', '.pytest_cache', 
    'dist', '.next', '.cache', 'downloads', '.DS_Store'
}

def should_exclude(rel_path):
    parts = rel_path.replace('\\', '/').split('/')
    for p in parts:
        if p in EXCLUDE_PATTERNS or p.endswith('.pyc') or p.endswith('.swp'):
            return True
    return False

def zip_directory(source_dir, output_zip_path, prefix=""):
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(source_dir):
            # Prune excluded dirs in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_PATTERNS]
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, source_dir)
                if should_exclude(rel_path):
                    continue
                archive_name = os.path.join(prefix, rel_path) if prefix else rel_path
                zf.write(full_path, archive_name)
    print(f"Created {output_zip_path} ({os.path.getsize(output_zip_path):,} bytes)")

# 1. Package Frontend (React + Vite + Tailwind + PWA + Components + Hooks + Data)
frontend_files_zip = os.path.join(OUTPUT_DIR, 'gesturex-frontend.zip')
with zipfile.ZipFile(frontend_files_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    # Add files from root needed for frontend
    for root, dirs, files in os.walk(os.path.join(ROOT_DIR, 'src')):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_PATTERNS]
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, ROOT_DIR)
            zf.write(full, rel)
            
    for root, dirs, files in os.walk(os.path.join(ROOT_DIR, 'public')):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_PATTERNS and d != 'downloads']
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, ROOT_DIR)
            zf.write(full, rel)

    # Root config files
    for fname in ['index.html', 'package.json', 'tsconfig.json', 'vite.config.ts', '.env.example', 'README.md', 'metadata.json']:
        p = os.path.join(ROOT_DIR, fname)
        if os.path.exists(p):
            zf.write(p, fname)

print(f"Created {frontend_files_zip} ({os.path.getsize(frontend_files_zip):,} bytes)")

# 2. Package Backend (FastAPI Python services, database, models, data vocabulary, requirements.txt)
backend_files_zip = os.path.join(OUTPUT_DIR, 'gesturex-backend.zip')
with zipfile.ZipFile(backend_files_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    backend_dir = os.path.join(ROOT_DIR, 'backend')
    for root, dirs, files in os.walk(backend_dir):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_PATTERNS]
        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, backend_dir)
            if should_exclude(rel):
                continue
            zf.write(full, rel)
    
    # Also add server.ts for node backend alternative and docker-compose
    for fname in ['docker-compose.yml', 'server.ts', '.env.example']:
        p = os.path.join(ROOT_DIR, fname)
        if os.path.exists(p):
            zf.write(p, fname)

print(f"Created {backend_files_zip} ({os.path.getsize(backend_files_zip):,} bytes)")

# 3. Package Full-Stack Complete Project
fullstack_zip = os.path.join(OUTPUT_DIR, 'gesturex-fullstack.zip')
with zipfile.ZipFile(fullstack_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for item in os.listdir(ROOT_DIR):
        if item in EXCLUDE_PATTERNS or item == '.git':
            continue
        full_item = os.path.join(ROOT_DIR, item)
        if os.path.isdir(full_item):
            for root, dirs, files in os.walk(full_item):
                dirs[:] = [d for d in dirs if d not in EXCLUDE_PATTERNS and not (root.endswith('public') and d == 'downloads')]
                for f in files:
                    full = os.path.join(root, f)
                    rel = os.path.relpath(full, ROOT_DIR)
                    if should_exclude(rel):
                        continue
                    zf.write(full, rel)
        else:
            zf.write(full_item, item)

print(f"Created {fullstack_zip} ({os.path.getsize(fullstack_zip):,} bytes)")
