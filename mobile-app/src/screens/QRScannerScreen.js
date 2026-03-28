import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Contacts from 'expo-contacts';

export default function QRScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted');
    });
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);

    // Detect vCard
    if (data.startsWith('BEGIN:VCARD')) {
      Alert.alert(
        'Contact Found',
        'A vCard contact was detected. Would you like to save it?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
          {
            text: 'Save Contact',
            onPress: () => saveVCard(data),
          },
        ]
      );
    } else if (data.startsWith('http://') || data.startsWith('https://')) {
      Alert.alert(
        'URL Detected',
        data,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setScanned(false) },
          {
            text: 'Open',
            onPress: () => {
              Linking.openURL(data);
              setScanned(false);
            },
          },
        ]
      );
    } else {
      Alert.alert('QR Code Scanned', data, [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
    }
  };

  const saveVCard = async (vcardText) => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Contacts access is required to save.');
      setScanned(false);
      return;
    }

    // Parse basic vCard fields
    const fn = (vcardText.match(/FN:(.+)/i) || [])[1] || 'Unknown';
    const tel = (vcardText.match(/TEL[^:]*:(.+)/i) || [])[1];
    const email = (vcardText.match(/EMAIL[^:]*:(.+)/i) || [])[1];
    const org = (vcardText.match(/ORG:(.+)/i) || [])[1];
    const title = (vcardText.match(/TITLE:(.+)/i) || [])[1];

    const contact = {
      [Contacts.Fields.FirstName]: fn.trim(),
      [Contacts.Fields.PhoneNumbers]: tel
        ? [{ label: 'mobile', number: tel.trim() }]
        : [],
      [Contacts.Fields.Emails]: email
        ? [{ label: 'work', email: email.trim() }]
        : [],
      [Contacts.Fields.Company]: org ? org.trim() : '',
      [Contacts.Fields.JobTitle]: title ? title.trim() : '',
    };

    try {
      await Contacts.addContactAsync(contact);
      Alert.alert('Saved!', `${fn} has been saved to your contacts.`);
    } catch (err) {
      Alert.alert('Error', 'Could not save contact: ' + err.message);
    }
    setScanned(false);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>📷 Camera access denied</Text>
        <Text style={styles.infoText}>
          Please enable camera permission in your device settings.
        </Text>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.settingsBtnText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame} />
          <Text style={styles.scanText}>
            {scanned ? 'Processing…' : 'Point camera at a QR code'}
          </Text>
          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainBtn}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </Camera>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: '#2563eb',
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  scanAgainBtn: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanAgainText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  settingsBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
