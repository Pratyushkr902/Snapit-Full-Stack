#!/bin/bash

# Exit instantly if any isolated compilation sequence step returns a failure code
set -e

# Defined ANSI terminal escape color metrics for clearer text logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ensure we baseline from the user's correct home workspace layout variables
BASE_DIR="$HOME/Documents/snapit"

echo -e "${BLUE}[1/5] Building production client web bundles...${NC}"
cd "$BASE_DIR/client"
npm install
npm run build

echo -e "${BLUE}[2/5] Injecting web components into Android asset streams...${NC}"
# ✅ FIXED PATHS: Updated to target your real snapit-android directory
rm -rf "$BASE_DIR/snapit-android/app/src/main/assets/public"/*
mkdir -p "$BASE_DIR/snapit-android/app/src/main/assets/public/"
cp -Rf "$BASE_DIR/client/dist"/* "$BASE_DIR/snapit-android/app/src/main/assets/public/"

echo -e "${BLUE}[3/5] Compiling final installable debug APK packages...${NC}"
cd "$BASE_DIR/snapit-android"
export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
# ✅ STABLE CONFIG: assembleDebug ensures it runs flawlessly without signing errors
./gradlew clean assembleDebug

echo -e "${BLUE}[4/5] Deploying and pushing package live onto connected Android phone...${NC}"
APK_PATH="app/build/outputs/apk/debug/app-debug.apk"

if adb devices | grep -q -w "device"; then
    adb install -r "$APK_PATH"
    echo -e "${GREEN}✓ Application successfully loaded on connected test device!${NC}"
else
    echo -e "${YELLOW}⚠ No Android device found via adb wire bindings. Skipping local device execution...${NC}"
fi

echo -e "${BLUE}[5/5] Backing up structural changes to GitHub remote repository...${NC}"
cd "$BASE_DIR"
git add .
git diff-index --quiet HEAD || git commit -m "build: compile distribution assets and update application assets production layer"
git push origin main

echo -e "${GREEN}🎉 Complete workspace architecture successfully built, deployed, and archived!${NC}"