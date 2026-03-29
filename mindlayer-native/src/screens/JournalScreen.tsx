import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow } from '../utils/theme';

type Tab = 'entries' | 'conversations';

export default function JournalScreen() {
  const { journalEntries, voiceTranscripts, deleteJournalEntry } = useApp();
  const [tab, setTab] = useState<Tab>('entries');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'entries' && styles.tabActive]}
            onPress={() => setTab('entries')}
          >
            <Text style={[styles.tabText, tab === 'entries' && styles.tabTextActive]}>
              Entries {journalEntries.length > 0 ? `(${journalEntries.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'conversations' && styles.tabActive]}
            onPress={() => setTab('conversations')}
          >
            <Text style={[styles.tabText, tab === 'conversations' && styles.tabTextActive]}>
              Conversations {voiceTranscripts.length > 0 ? `(${voiceTranscripts.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'entries' ? (
          journalEntries.length === 0 ? (
            <EmptyState message="No journal entries yet. Share your thoughts on the Home tab." />
          ) : (
            journalEntries.map(entry => (
              <TouchableOpacity key={entry.id} style={styles.card} onPress={() => setSelectedEntry(entry)} activeOpacity={0.8}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardDate}>{entry.date} · {entry.time}</Text>
                  <View style={[styles.emotionBadge, { backgroundColor: colors.accentLt }]}>
                    <Text style={[styles.emotionBadgeText, { color: colors.accent }]}>
                      {entry.dominantEmotion}
                    </Text>
                  </View>
                </View>
                {entry.title && <Text style={styles.cardTitle}>{entry.title}</Text>}
                <Text style={styles.cardPreview} numberOfLines={3}>{entry.text}</Text>
              </TouchableOpacity>
            ))
          )
        ) : (
          voiceTranscripts.length === 0 ? (
            <EmptyState message="No voice conversations yet. Start a conversation on the Home tab." />
          ) : (
            voiceTranscripts.map(t => (
              <TouchableOpacity key={t.id} style={styles.card} onPress={() => setSelectedTranscript(t)} activeOpacity={0.8}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardDate}>{t.date} · {t.time}</Text>
                  <View style={[styles.emotionBadge, { backgroundColor: '#f0fdf4' }]}>
                    <Text style={[styles.emotionBadgeText, { color: colors.green }]}>Voice</Text>
                  </View>
                </View>
                <Text style={styles.cardPreview} numberOfLines={2}>
                  {t.messages.slice(0, 2).map((m: any) => `${m.role === 'user' ? 'You' : 'MindFlyer'}: ${m.text}`).join('\n')}
                </Text>
                <Text style={styles.msgCount}>{t.messages.length} messages</Text>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* Journal Entry Modal */}
      {selectedEntry && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setSelectedEntry(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalDate}>{selectedEntry.date} · {selectedEntry.time}</Text>
                  {selectedEntry.title && <Text style={styles.modalTitle}>{selectedEntry.title}</Text>}
                </View>
                <TouchableOpacity onPress={() => setSelectedEntry(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalText}>{selectedEntry.text}</Text>
                {selectedEntry.summary && (
                  <View style={styles.insightBlock}>
                    <Text style={styles.insightLabel}>AI Insight</Text>
                    <Text style={styles.insightText}>{selectedEntry.summary}</Text>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => { deleteJournalEntry(selectedEntry.id); setSelectedEntry(null); }}
              >
                <Text style={styles.deleteBtnText}>Delete entry</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Transcript Modal */}
      {selectedTranscript && (
        <Modal animationType="slide" transparent visible onRequestClose={() => setSelectedTranscript(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalDate}>{selectedTranscript.date} · {selectedTranscript.time}</Text>
                <TouchableOpacity onPress={() => setSelectedTranscript(null)} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedTranscript.messages.map((m: any, i: number) => (
                  <View key={i} style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant]}>
                    <Text style={[styles.bubbleSender, m.role === 'user' ? styles.bubbleSenderUser : styles.bubbleSenderAssistant]}>
                      {m.role === 'user' ? 'You' : 'MindFlyer'}
                    </Text>
                    <Text style={styles.bubbleText}>{m.text}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View style={emptyStyles.container}>
      <Text style={emptyStyles.icon}>📖</Text>
      <Text style={emptyStyles.text}>{message}</Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  icon: { fontSize: 40, marginBottom: 12 },
  text: { fontSize: 14, color: colors.text3, textAlign: 'center', lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg1 },
  header: { padding: 20, paddingBottom: 0 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 16 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bg2,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm - 2 },
  tabActive: { backgroundColor: colors.bg1, ...shadow.sm },
  tabText: { fontSize: 13, color: colors.text3, fontWeight: '500' },
  tabTextActive: { color: colors.text, fontWeight: '600' },
  scroll: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  card: {
    backgroundColor: colors.bg1,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 12, color: colors.text3 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardPreview: { fontSize: 13, color: colors.text2, lineHeight: 18 },
  emotionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  emotionBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize', overflow: 'hidden' },
  msgCount: { fontSize: 11, color: colors.text3, marginTop: 6 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.bg1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalDate: { fontSize: 12, color: colors.text3 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 4 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: colors.text3 },
  modalBody: { flex: 1 },
  modalText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  insightBlock: {
    backgroundColor: colors.accentLt,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 16,
  },
  insightLabel: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  insightText: { fontSize: 14, color: colors.text2, lineHeight: 20 },
  deleteBtn: { padding: 14, alignItems: 'center', marginTop: 12 },
  deleteBtnText: { fontSize: 14, color: colors.red },
  // Transcript bubbles
  bubble: { marginBottom: 12, maxWidth: '85%' },
  bubbleUser: { alignSelf: 'flex-end' },
  bubbleAssistant: { alignSelf: 'flex-start' },
  bubbleSender: { fontSize: 11, fontWeight: '600', marginBottom: 3 },
  bubbleSenderUser: { color: colors.accent, textAlign: 'right' },
  bubbleSenderAssistant: { color: colors.text3 },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
