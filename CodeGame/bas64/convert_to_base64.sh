#!/bin/bash

# Directory to process (current directory by default)
DIR=${1:-.}

# Check if the specified directory exists
if [ ! -d "$DIR" ]; then
    echo "Error: Directory $DIR does not exist."
    exit 1
fi

# Create an output directory for Base64 files
OUTPUT_DIR="$DIR/base64_output"
mkdir -p "$OUTPUT_DIR"

# Iterate over each file in the directory
for FILE in "$DIR"/*; do
    # Skip directories
    if [ -d "$FILE" ]; then
        continue
    fi

    # Get the file name without path
    BASENAME=$(basename "$FILE")

    # Define the output file name
    OUTPUT_FILE="$OUTPUT_DIR/$BASENAME.b64"

    # Convert the file to Base64 and save it
    base64 -i "$FILE" -o "$OUTPUT_FILE"

    echo "Encoded $FILE to $OUTPUT_FILE"
done

echo "All files have been converted and saved to $OUTPUT_DIR."
