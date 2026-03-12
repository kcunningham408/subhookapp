import { Component } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0a0e1a', justifyContent: 'center', padding: 30 }}>
          <Text style={{ color: '#ef4444', fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>
            App Error
          </Text>
          <ScrollView>
            <Text style={{ color: '#e2e8f0', fontSize: 14 }}>
              {this.state.error?.toString?.() || 'Unknown error'}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 11, marginTop: 12 }}>
              {this.state.error?.stack || ''}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
