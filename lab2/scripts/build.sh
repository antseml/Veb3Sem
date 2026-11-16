#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
LIB="$PROJECT_DIR/lib/fastcgi-lib.jar"
BUILD="$PROJECT_DIR/build"

if [ ! -f "$LIB" ]; then
    echo "Не найден $LIB"
    echo "Скопируйте выданный преподавателем fastcgi-lib.jar в папку lab2/lib."
    exit 1
fi

rm -rf "$BUILD/classes"
mkdir -p "$BUILD/classes"

javac -encoding UTF-8 -cp "$LIB" -d "$BUILD/classes" "$PROJECT_DIR"/src/app/*.java
jar cfe "$BUILD/lab2.jar" app.Main -C "$BUILD/classes" .

echo "Собрано: $BUILD/lab2.jar"
