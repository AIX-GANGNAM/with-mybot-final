import React, { createContext, useContext, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View style={[styles.toast, styles[toast.type]]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  toastText: {
    color: 'white',
  },
  info: {
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  success: {
    backgroundColor: 'rgba(0,128,0,0.7)',
  },
  error: {
    backgroundColor: 'rgba(255,0,0,0.7)',
  },
});
