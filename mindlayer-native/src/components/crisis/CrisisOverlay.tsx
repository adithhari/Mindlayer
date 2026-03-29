import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Linking, ScrollView,
} from 'react-native';
import { colors, radius } from '../../utils/theme';

interface Props {
  onClose: () => void;
}

export default function CrisisOverlay({ onClose }: Props) {
  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.card}>
          <Text style={styles.title}>You're not alone</Text>
          <Text style={styles.body}>
            It sounds like you might be going through something really difficult right now.
            Please reach out — help is available right now.
          </Text>

          <TouchableOpacity style={styles.hotlineBtn} onPress={() => Linking.openURL('tel:988')}>
            <Text style={styles.hotlineNum}>988</Text>
            <Text style={styles.hotlineLabel}>Suicide & Crisis Lifeline — call or text</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.hotlineBtn2} onPress={() => Linking.openURL('sms:741741?body=HELLO')}>
            <Text style={styles.hotlineNum2}>741741</Text>
            <Text style={styles.hotlineLabel}>Crisis Text Line — text HELLO</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            MindFlyer is not a substitute for professional mental health care.
            If you are in immediate danger, call 911.
          </Text>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>I'm okay for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.bg1,
    borderRadius: radius.lg,
    padding: 28,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, textAlign: 'center' },
  body: { fontSize: 15, color: colors.text2, textAlign: 'center', lineHeight: 22 },
  hotlineBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: radius.md,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  hotlineNum: { fontSize: 32, fontWeight: '800', color: colors.red },
  hotlineLabel: { fontSize: 13, color: colors.red, marginTop: 2 },
  hotlineBtn2: {
    backgroundColor: '#eff6ff',
    borderRadius: radius.md,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  hotlineNum2: { fontSize: 28, fontWeight: '700', color: '#2563eb' },
  disclaimer: { fontSize: 12, color: colors.text3, textAlign: 'center', lineHeight: 18 },
  closeBtn: {
    backgroundColor: colors.bg3,
    borderRadius: radius.md,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: { fontSize: 15, color: colors.text2, fontWeight: '500' },
});
