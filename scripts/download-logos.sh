#!/bin/bash

# Script to download provider logos from models.dev
# Usage: ./scripts/download-logos.sh

LOGOS_DIR="static/logos"

echo "Downloading provider logos..."

# Fetch the API to get provider list - providers are at root level
PROVIDERS=$(curl -s https://models.dev/api.json | jq -r 'keys[]')

count=0
for provider in $PROVIDERS; do
    url="https://models.dev/logos/${provider}.svg"
    filepath="${LOGOS_DIR}/${provider}.svg"
    
    if [ -f "$filepath" ]; then
        echo "Skipping $provider (already exists)"
        continue
    fi
    
    echo "Downloading $provider..."
    if curl -s -o "$filepath" "$url"; then
        # Check if file is not empty
        if [ -s "$filepath" ]; then
            echo "✓ $provider"
            count=$((count + 1))
        else
            echo "✗ $provider (empty)"
            rm -f "$filepath"
        fi
    else
        echo "✗ $provider (failed)"
        rm -f "$filepath"
    fi
done

echo "Done! Downloaded $count logos."
