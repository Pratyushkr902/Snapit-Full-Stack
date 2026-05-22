#!/bin/bash

# Exit instantly if any isolated compilation sequence step returns a failure code
set -e

# Defined ANSI terminal escape color metrics for clearer text logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[1/5] Building production client production web bundles...${NC}"
cd ~/Documents/snapit/client
npm run build

echo -e "${BLUE}[2/5] Injecting compiled web components directly into Android application asset streams...${NC}"
rm -rf ~/Documents/snapit/snapit-android/app/src/main/assets/public/*
mkdir -p ~/Documents/snapit/snapit-android/app/src/main/assets/public/
cp -Rf ~/Documents/snapit/client/dist/* ~/Documents/snapit/snapit-android/app/src/main/assets/public/

echo -e "${BLUE}[3/5] Compiling final installable production release APK package variables...${NC}"
cd ~/Documents/snapit/snapit-android
export JAVA_HOME="/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home"
./gradlew clean assembleRelease

echo -e "${BLUE}[4/5] Deploying and pushing signed app wrapper package live onto connected Android phone...${NC}"
if adb devices | grep -q -w "device"; then
    adb install -r app/build/outputs/apk/release/app-release.apk
    echo -e "${GREEN}✓ Application successfully loaded on connected test device!${NC}"
else
    echo -e "${YELLOW}⚠ No Android device found via adb wire bindings. Skipping local device execution step...${NC}"
fi

echo -e "${BLUE}[5/5] Backing up matching structural changes to Github remote repository ledger line tracks...${NC}"
cd ~/Documents/snapit
git add .
# Prevent script freeze if git reports nothing new to log
git diff-index --quiet HEAD || git commit -m "build: compile distribution assets and update application assets production layer"
git push origin main

echo -e "${GREEN}🎉 Complete workspace architecture successfully built, deployed, and archived!${NC}"
