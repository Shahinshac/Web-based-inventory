import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { apiGet, apiDelete } from '../services/api';

const CACHE_KEY = 'cached_customers';

export default function CustomersScreen({ navigation }) {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await apiGet('/api/customers', token);
      setCustomers(data);
      setFiltered(data);
      // Cache for offline use
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
      // Try cache on failure
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        setCustomers(data);
        setFiltered(data);
      } else {
        Alert.alert('Error', err.message || 'Failed to load customers');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      customers.filter(
        c =>
          c.name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q)
      )
    );
  }, [search, customers]);

  const handleDelete = (customer) => {
    Alert.alert(
      'Delete Customer',
      `Are you sure you want to delete "${customer.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiDelete(`/api/customers/${customer.id}`, token);
              setCustomers(prev => prev.filter(c => c.id !== customer.id));
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  function getInitials(name = '') {
    return name
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('CustomerCard', { customer: item })}
      activeOpacity={0.85}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.name}</Text>
        {item.position ? (
          <Text style={styles.cardPosition}>{item.position}</Text>
        ) : null}
        {item.company ? (
          <Text style={styles.cardCompany}>{item.company}</Text>
        ) : null}
        {item.phone ? (
          <Text style={styles.cardDetail}>📞 {item.phone}</Text>
        ) : null}
        {item.email ? (
          <Text style={styles.cardDetail} numberOfLines={1}>
            ✉️ {item.email}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item)}
      >
        <Text style={styles.deleteBtnText}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading customers…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, company…"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      <Text style={styles.countText}>
        {filtered.length} customer{filtered.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCustomers();
            }}
            tintColor="#2563eb"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No customers found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  searchContainer: {
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    borderRadius: 12,
  },
  countText: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 12,
    color: '#64748b',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardPosition: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  cardCompany: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 3,
  },
  cardDetail: {
    fontSize: 12,
    color: '#475569',
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
});
