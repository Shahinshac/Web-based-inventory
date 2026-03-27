import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>⚡</Text>
        <Text style={styles.title}>26:07 Electronics</Text>
        <Text style={styles.subtitle}>Inventory Mobile</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.tileRow}>
          <View style={[styles.tile, styles.tilePrimary]}>
            <Text style={styles.tileIcon}>👥</Text>
            <Text style={styles.tileLabel}>Customers</Text>
          </View>
          <View style={[styles.tile, styles.tileSuccess]}>
            <Text style={styles.tileIcon}>📷</Text>
            <Text style={styles.tileLabel}>Scan QR</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Customer Cards</Text>
        <Text style={styles.infoText}>
          View digital visiting cards for all customers. Tap on a customer to
          see their card with a QR code that can be scanned to save contact
          details directly to your phone.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#2563eb',
    borderRadius: 18,
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  tileRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tile: {
    flex: 1,
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tilePrimary: {
    backgroundColor: '#eff6ff',
  },
  tileSuccess: {
    backgroundColor: '#f0fdf4',
  },
  tileIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 20,
  },
});
