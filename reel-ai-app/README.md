# Reel AI App

## Setup Requirements
- Node.js
- Expo CLI
- EAS CLI (`npm install -g eas-cli`)
- Apple Developer Account
- Firebase project

## Development Setup
1. Install dependencies:
```bash
npm install
```

2. Firebase Configuration:
- Place `google-services.json` in project root
- Place `GoogleService-Info.plist` in project root

3. First-time Setup:
```bash
eas build --profile development --platform ios
```
- This creates a development build (10-15 minutes)
- Install the resulting app on your iPhone
- You only need to rebuild when changing native dependencies

4. Daily Development:
```bash
npx expo start
```
- This connects to your development build
- Changes reflect immediately without rebuilding
- Most development work happens here

## Important Notes
- Development builds persist on your device
- Rebuilds (using `eas build`) only needed when:
  - Adding new native packages (e.g., camera, biometrics)
  - Changing Firebase configuration
  - Updating iOS/Android permissions
  - Modifying native app settings
- Regular development (no rebuild needed):
  - Writing React components
  - Styling changes
  - Adding new screens
  - API integrations
  - Business logic changes
- 30 monthly build minutes is sufficient as rebuilds are rare

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
