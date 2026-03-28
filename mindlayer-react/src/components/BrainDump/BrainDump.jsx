import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { brainDumpSummarize, humeAnalyzeText, getTopEmotions, getEmotionAwareResponse } from '../../utils/api';
import { checkCrisis } from '../../utils/constants';
import DumpModeSelector from './DumpModeSelector';
import DumpInput from './DumpInput';
import DumpResult from './DumpResult';

export default function BrainDump() {
  const { addJournalEntry, logMood } = useApp();
  const [dumpMode, setDumpMode] = useState('dump');
  const [dumpText, setDumpText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleSaveToJournal = async () => {
    if (result && result.originalText && result.topEmotions.length > 0) {
      // Create journal data from the brain dump analysis
      const dominantEmotion = result.topEmotions[0];
      const claudeData = {
        emotions: result.topEmotions,
        dominantEmotion: dominantEmotion.name,
        intensity: Math.round(dominantEmotion.score * 10), // Convert to 0-10 scale
        summary: result.claudeSummary?.summary || ''
      };
      
      // Save to journal (now async - will auto-generate heading)
      await addJournalEntry(result.originalText, claudeData, result.humeData);
    }
  };

  const handleAnalyze = async () => {
    if (!dumpText.trim()) return;

    // Crisis check
    if (checkCrisis(dumpText)) {
      // Show crisis response
      return;
    }

    setLoading(true);
    setShowResult(true);

    try {
      // Get Claude's summary and understanding
      const claudeSummary = await brainDumpSummarize(dumpText);
      
      // Get Hume emotion analysis
      const humeRes = await humeAnalyzeText(dumpText);
      
      // Get top emotions directly from Hume (no category mapping)
      const topEmotions = getTopEmotions(humeRes, 5);
      
      // Get emotion-aware coaching response
      const coachResponse = await getEmotionAwareResponse(dumpText, topEmotions);

      setResult({
        claudeSummary,
        humeData: humeRes,
        topEmotions,
        coachResponse,
        mode: dumpMode,
        originalText: dumpText  // Store original dump text for journal saving
      });
      
      // Optional: Log mood based on dominant emotion for streak tracking
      if (dumpMode === 'journal' && topEmotions.length > 0) {
        logMood(topEmotions[0].name, Math.round(topEmotions[0].score * 10)); 
      }
    } catch (err) {
      console.error('Error:', err);
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen braindump-screen">
      <div className="braindump-header">
        <h1>Brain Dump</h1>
        <p>Let it all out. No judgment. We'll help you understand what you're feeling.</p>
      </div>

      <DumpModeSelector mode={dumpMode} onChange={setDumpMode} />

      <DumpInput
        value={dumpText}
        onChange={setDumpText}
        mode={dumpMode}
        onAnalyze={handleAnalyze}
        loading={loading}
      />

      {showResult && (
        <DumpResult
          result={result}
          loading={loading}
          mode={dumpMode}
          onSaveJournal={handleSaveToJournal}
        />
      )}
    </div>
  );
}
