import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  Share,
  Animated,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Contacts from 'expo-contacts';

function buildVCard(customer) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${customer.name || ''}`,
    customer.phone ? `TEL;TYPE=CELL:${customer.phone}` : null,
    customer.email ? `EMAIL:${customer.email}` : null,
    customer.company ? `ORG:${customer.company}` : null,
    customer.position ? `TITLE:${customer.position}` : null,
    customer.website ? `URL:${customer.website}` : null,
    'END:VCARD',
  ];
  return lines.filter(Boolean).join('\n');
}

function buildCardText(customer) {
  return [
    `👤 *${customer.name || ''}*`,
    customer.position ? `💼 ${customer.position}` : '',
    customer.company ? `🏢 ${customer.company}` : '',
    '',
    customer.phone ? `📞 ${customer.phone}` : '',
    customer.email ? `✉️ ${customer.email}` : '',
    (customer.city || customer.place)
      ? `📍 ${[customer.city || customer.place, customer.country].filter(Boolean).join(', ')}`
      : '',
    customer.website ? `🌐 ${customer.website}` : '',
    customer.gstin ? `📋 GST: ${customer.gstin}` : '',
  ].filter(Boolean).join('\n');
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function CustomerCardScreen({ route }) {
  const { customer } = route.params;
  const [flipped, setFlipped] = useState(false);

  const vCardData = buildVCard(customer);
  const initials = getInitials(customer.name);

  const saveToContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please grant contacts permission to save this customer.'
      );
      return;
    }

    const contact = {
      [Contacts.Fields.FirstName]: customer.name,
      [Contacts.Fields.PhoneNumbers]: customer.phone
        ? [{ label: 'mobile', number: customer.phone }]
        : [],
      [Contacts.Fields.Emails]: customer.email
        ? [{ label: 'work', email: customer.email }]
        : [],
      [Contacts.Fields.Company]: customer.company || '',
      [Contacts.Fields.JobTitle]: customer.position || '',
      [Contacts.Fields.UrlAddresses]: customer.website
        ? [{ label: 'homepage', url: customer.website }]
        : [],
    };

    try {
      await Contacts.addContactAsync(contact);
      Alert.alert('Saved!', `${customer.name} has been added to your contacts.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to save contact: ' + err.message);
    }
  };

  const shareVCard = async () => {
    try {
      await Share.share({
        title: `${customer.name} – Contact Card`,
        message: buildCardText(customer),
      });
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const shareViaWhatsApp = () => {
    const text = buildCardText(customer);
    const encodedText = encodeURIComponent(text);
    const phone = customer.phone ? customer.phone.replace(/\D/g, '') : '';
    const fullPhone = phone.length === 10 ? `91${phone}` : phone;

    const url = fullPhone
      ? `whatsapp://send?phone=${fullPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to wa.me
        const waUrl = fullPhone
          ? `https://wa.me/${fullPhone}?text=${encodedText}`
          : `https://wa.me/?text=${encodedText}`;
        Linking.openURL(waUrl);
      }
    }).catch(() => {
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to use this feature.');
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ---- Visiting Card ---- */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setFlipped(f => !f)}
        style={styles.cardWrapper}
      >
        {!flipped ? (
          /* Front */
          <View style={styles.cardFront}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              {customer.company ? (
                <Text style={styles.companyBadge} numberOfLines={1}>
                  {customer.company}
                </Text>
              ) : null}
            </View>

            {/* Body */}
            <View style={styles.cardBody}>
              <Text style={styles.customerName}>{customer.name}</Text>
              {customer.position ? (
                <Text style={styles.customerPosition}>{customer.position}</Text>
              ) : null}
              {customer.company ? (
                <Text style={styles.customerCompany}>{customer.company}</Text>
              ) : null}

              <View style={styles.divider} />

              <View style={styles.contacts}>
                {customer.phone ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`tel:${customer.phone}`)}
                  >
                    <Text style={styles.contactIcon}>📞</Text>
                    <Text style={styles.contactText}>{customer.phone}</Text>
                  </TouchableOpacity>
                ) : null}

                {customer.email ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(`mailto:${customer.email}`)}
                  >
                    <Text style={styles.contactIcon}>✉️</Text>
                    <Text style={styles.contactText} numberOfLines={1}>
                      {customer.email}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {(customer.city || customer.place) ? (
                  <View style={styles.contactRow}>
                    <Text style={styles.contactIcon}>📍</Text>
                    <Text style={styles.contactText}>
                      {[customer.city || customer.place, customer.country]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                ) : null}

                {customer.website ? (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => Linking.openURL(customer.website)}
                  >
                    <Text style={styles.contactIcon}>🌐</Text>
                    <Text style={styles.contactText} numberOfLines={1}>
                      {customer.website.replace(/^https?:\/\//, '')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={styles.flipHint}>Tap to flip for QR code ↩</Text>
          </View>
        ) : (
          /* Back */
          <View style={styles.cardBack}>
            <View style={styles.qrWrapper}>
              <QRCode
                value={vCardData}
                size={130}
                color="#1e293b"
                backgroundColor="#ffffff"
              />
            </View>
            <Text style={styles.backName}>{customer.name}</Text>
            <Text style={styles.scanHint}>📱 Scan to save contact</Text>
            <Text style={styles.flipHintBack}>Tap to flip back ↩</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ---- Action Buttons ---- */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={saveToContacts}>
          <Text style={styles.actionBtnText}>💾  Save to Contacts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={shareVCard}>
          <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>
            🔗  Share Card
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnGreen]}
          onPress={shareViaWhatsApp}
        >
          <Text style={[styles.actionBtnText, { color: '#16a34a' }]}>
            💬  Share via WhatsApp
          </Text>
        </TouchableOpacity>

        {customer.phone ? (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnWhatsApp]}
            onPress={() => {
              const phone = customer.phone.replace(/\D/g, '');
              const fullPhone = phone.length === 10 ? `91${phone}` : phone;
              Linking.openURL(`whatsapp://send?phone=${fullPhone}`).catch(() =>
                Linking.openURL(`https://wa.me/${fullPhone}`)
              );
            }}
          >
            <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>
              📲  Open WhatsApp Chat
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ---- Customer Details Section ---- */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Details</Text>
        {renderDetail('Name', customer.name)}
        {customer.position && renderDetail('Position', customer.position)}
        {customer.company && renderDetail('Company', customer.company)}
        {customer.phone && renderDetail('Phone', customer.phone)}
        {customer.email && renderDetail('Email', customer.email)}
        {customer.website && renderDetail('Website', customer.website)}
        {(customer.address || customer.place) &&
          renderDetail('Address', [customer.address, customer.place, customer.pincode]
            .filter(Boolean).join(', '))}
        {customer.gstin && renderDetail('GSTIN', customer.gstin)}
      </View>
    </ScrollView>
  );
}

function renderDetail(label, value) {
  if (!value) return null;
  return (
    <View key={label} style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const CARD_BG = '#2563eb';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    alignItems: 'center',
    paddingBottom: 40,
  },

  /* Card */
  cardWrapper: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },

  /* Front */
  cardFront: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
  },
  cardHeader: {
    height: 72,
    backgroundColor: CARD_BG,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  avatar: {
    position: 'absolute',
    bottom: -24,
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4f46e5',
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18,
  },
  companyBadge: {
    position: 'absolute',
    top: 12,
    right: 16,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    maxWidth: 160,
  },
  cardBody: {
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  customerPosition: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  customerCompany: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  contacts: {
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactIcon: {
    fontSize: 13,
    width: 18,
  },
  contactText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  flipHint: {
    textAlign: 'center',
    fontSize: 10,
    color: '#cbd5e1',
    paddingBottom: 10,
  },

  /* Back */
  cardBack: {
    height: 230,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 10,
  },
  backName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  scanHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  flipHintBack: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
  },

  /* Actions */
  actions: {
    width: '100%',
    maxWidth: 380,
    gap: 10,
    marginBottom: 24,
  },
  actionBtn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnPrimary: {
    backgroundColor: '#2563eb',
  },
  actionBtnSecondary: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  actionBtnGreen: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  actionBtnWhatsApp: {
    backgroundColor: '#25D366',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  /* Details */
  detailsCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  detailLabel: {
    width: 90,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
  },
});
