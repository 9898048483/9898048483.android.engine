#!/bin/bash
set -e

echo "==================================================================="
echo " AI SECURE SPACE - AUTOMATED GITHUB INITIALIZATION & PUSH"
echo "==================================================================="

if [ -d ".git" ]; then
    echo "[!] Git repository already initialized."
else
    echo "[*] Initializing empty Git repository..."
    git init
fi

echo "[*] Configuring default branch to 'main'..."
git checkout -B main

echo "[*] Staging all project files..."
git add .

echo "[*] Committing codebase..."
git commit -m "feat(core): Initial commit - AI Onion Secure Space architecture" || echo "[!] No changes to commit."

read -p "[?] Enter your target GitHub Repository URL (e.g., https://github.com/USER/REPO.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "[!] Error: Repository URL cannot be empty."
    exit 1
fi

echo "[*] Setting remote origin to: $REPO_URL"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo "[*] Pushing codebase to GitHub (main branch)..."
git push -u origin main

echo "[+] SUCCESS: Repository successfully pushed to GitHub!"
