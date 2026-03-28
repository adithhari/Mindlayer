export const quickSentimentScore = (text) => {
  const negativeTriggers = [
    'sad', 'depressed', 'anxious', 'worried', 'stressed', 'angry', 'frustrated',
    'hopeless', 'overwhelmed', 'tired', 'exhausted', 'lonely', 'hurt', 'afraid',
    'scary', 'terrible', 'awful', 'hate', 'can\'t', 'won\'t', 'impossible'
  ];
  
  const positiveTriggers = [
    'better', 'good', 'great', 'happy', 'grateful', 'hopeful', 'confident',
    'proud', 'peaceful', 'calm', 'progress', 'hope', 'love', 'appreciate',
    'strength', 'believe', 'can', 'will', 'possible', 'try', 'learning'
  ];

  const lower = text.toLowerCase();
  let negative = 0;
  let positive = 0;

  negativeTriggers.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lower.match(regex);
    if (matches) negative += matches.length;
  });

  positiveTriggers.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    const matches = lower.match(regex);
    if (matches) positive += matches.length;
  });

  const total = positive + negative || 1;
  return Math.round((positive / total) * 100);
};

export const calculateHappiness = (predictions) => {
  const emotionScores = {};
  const happyEmotions = ['joy', 'excite', 'amuse', 'content', 'satisf', 'pride', 'triumph', 'relief', 'interest', 'calm', 'admira', 'love', 'hopeful', 'curious', 'inspired'];
  const sadEmotions = ['anger', 'fear', 'sad', 'disgust', 'distress', 'anxi', 'shame', 'guilt', 'contempt', 'horror', 'pain', 'bored', 'envy', 'overwhelm', 'frustrat'];

  try {
    if (!predictions || predictions.length === 0) {
      return 50;
    }

    predictions.forEach(src => {
      src.results?.predictions?.forEach(pred => {
        pred.models?.language?.grouped_predictions?.forEach(group => {
          group.predictions?.forEach(p => {
            p.emotions?.forEach(e => {
              const emotionName = e.name.toLowerCase();
              emotionScores[emotionName] = (emotionScores[emotionName] || 0) + e.score;
            });
          });
        });
      });
    });
  } catch (err) {
    console.log('Error parsing Hume predictions:', err);
    return 50;
  }

  let happyScore = 0;
  let sadScore = 0;

  Object.entries(emotionScores).forEach(([emotion, score]) => {
    if (happyEmotions.some(h => emotion.includes(h))) {
      happyScore += score;
    } else if (sadEmotions.some(s => emotion.includes(s))) {
      sadScore += score;
    }
  });

  const totalScore = happyScore + sadScore || 1;
  const happiness = Math.round((happyScore / totalScore) * 100);
  
  return Math.max(0, Math.min(100, happiness));
};

export const calculateWeightedHappiness = (scores) => {
  if (scores.length === 0) return 0;
  if (scores.length === 1) return scores[0];
  
  const latest = scores[scores.length - 1];
  const previousScores = scores.slice(0, -1);
  const avgPrevious = previousScores.reduce((a, b) => a + b, 0) / previousScores.length;
  
  return Math.round((latest * 0.5) + (avgPrevious * 0.5));
};

export const getMoodMap = () => ({
  'anxious': 'anxious',
  'stressed': 'anxious',
  'worried': 'anxious',
  'overwhelmed': 'anxious',
  'sad': 'sad',
  'depressed': 'sad',
  'hopeful': 'okay',
  'excited': 'okay',
  'angry': 'angry',
  'frustrated': 'angry',
  'tired': 'tired',
  'exhausted': 'tired',
  'numb': 'numb',
  'empty': 'numb',
  'reflective': 'okay'
});
