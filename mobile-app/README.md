# Inventory Mobile App

React Native + Expo mobile companion for the Web-based Inventory system.

## Features

- **Digital Visiting Cards** – View customer cards with a flip animation (front: contact details, back: scannable QR vCard)
- **QR Code Scanning** – Scan customer QR codes to save contacts directly to your phone
- **Customer Management** – Browse, search, and view all customers with offline caching
- **Contact Saving** – Save any customer as a device contact with one tap
- **WhatsApp Integration** – Send a message to a customer directly from their card
- **Card Sharing** – Share a customer's vCard via any messaging app

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) – `npm install -g expo-cli`
- iOS Simulator / Android Emulator **or** the [Expo Go](https://expo.dev/client) app on a physical device

### Install

```bash
cd mobile-app
npm install
```

### Configure API

Edit `app.json` and set the `extra.apiBaseUrl` field to point to your Flask backend:

```json
"extra": {
  "apiBaseUrl": "https://your-api.onrender.com"
}
```

For local development, use your machine's LAN IP (not `localhost`) so the device/emulator can reach the server:

```json
"extra": {
  "apiBaseUrl": "http://192.168.x.x:4000"
}
```

### Run

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Project Structure

```
mobile-app/
├── App.js                        # Root component – navigation setup
├── app.json                      # Expo configuration (icons, permissions, etc.)
├── babel.config.js
├── package.json
└── src/
    ├── hooks/
    │   └── useAuth.js            # Auth context (JWT stored in AsyncStorage)
    ├── screens/
    │   ├── LoginScreen.js        # Login form
    │   ├── DashboardScreen.js    # Home dashboard
    │   ├── CustomersScreen.js    # Customer list with search & offline cache
    │   ├── CustomerCardScreen.js # Flip visiting card + save/share actions
    │   └── QRScannerScreen.js    # Camera QR scanner with vCard parsing
    └── services/
        └── api.js                # HTTP helpers (GET / POST / PUT / DELETE)
```

## Permissions Used

| Permission | Purpose |
|---|---|
| Camera | QR code scanning |
| Contacts | Save customer details to device contacts |

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

See the [Expo EAS Build docs](https://docs.expo.dev/build/introduction/) for full instructions.
