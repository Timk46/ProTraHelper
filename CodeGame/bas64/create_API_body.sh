#!/bin/bash

# Directory to process (current directory by default)
DIR=${1:-.}

# Check if the specified directory exists
if [ ! -d "$DIR" ]; then
    echo "Error: Directory $DIR does not exist."
    exit 1
fi

# Create a temporary file to store the JSON content
OUTPUT_FILE="output.json"
echo "{" > $OUTPUT_FILE
echo '    "input": "Test!",' >> $OUTPUT_FILE
echo '    "mainFile": {' >> $OUTPUT_FILE

# Process the main file (main.cpp)
MAIN_FILE="$DIR/main.cpp"
if [ -f "$MAIN_FILE" ]; then
    MAIN_BASE64=$(base64 -i "$MAIN_FILE" | tr -d '\n')
    echo '        "main.cpp": "'$MAIN_BASE64'"' >> $OUTPUT_FILE
else
    echo "Error: main.cpp not found in $DIR."
    exit 1
fi

echo '    },' >> $OUTPUT_FILE
echo '    "additionalFiles": {' >> $OUTPUT_FILE

# Process additional files
FIRST=true
for FILE in "$DIR"/*; do
    # Skip directories and main.cpp
    if [ -d "$FILE" ] || [ "$FILE" == "$MAIN_FILE" ]; then
        continue
    fi

    # Get the file name without path
    BASENAME=$(basename "$FILE")

    # Convert the file to Base64
    BASE64_CONTENT=$(base64 -i "$FILE" | tr -d '\n')

    # Add a comma before each entry except the first one
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        echo ',' >> $OUTPUT_FILE
    fi

    # Add the Base64 content to the JSON
    echo '        "'$BASENAME'": "'$BASE64_CONTENT'"' >> $OUTPUT_FILE
done

echo '    }' >> $OUTPUT_FILE
echo '}' >> $OUTPUT_FILE

echo "The Base64 encoded JSON file has been created as $OUTPUT_FILE."