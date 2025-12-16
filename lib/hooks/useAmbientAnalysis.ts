/**
 * Ambient Analysis Hook
 * Provides real-time sentiment and originality analysis of editor content
 */

import { useEffect } from 'react';
import { type Editor } from '@tiptap/react';
import Sentiment from 'sentiment';
import { useAmbientAnalysisStore } from '@/lib/store/ambientAnalysisStore';

const sentiment = new Sentiment();

interface AmbientAnalysisResult {
  sentimentColor: string;
  originalityColor: string;
}

/**
 * Interpolate between two RGB colors
 */
function interpolateRGB(color1: string, color2: string, ratio: number): string {
  // Extract RGB values from "rgb(r g b)" format
  const extractRGB = (color: string): number[] => {
    const match = color.match(/rgb\((\d+)\s+(\d+)\s+(\d+)\)/);
    return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
  };

  const [r1, g1, b1] = extractRGB(color1);
  const [r2, g2, b2] = extractRGB(color2);

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return `rgb(${r} ${g} ${b})`;
}

/**
 * Analyze Chinese text sentiment using keyword matching
 * Returns a score similar to sentiment.js (negative < 0 < positive)
 */
function analyzeChineseSentiment(text: string): number {
  // Positive words (正面词汇)
  const positiveWords = [
    '好', '棒', '优秀', '出色', '精彩', '完美', '美好', '喜欢', '爱', '开心',
    '快乐', '幸福', '满意', '成功', '胜利', '赞', '优', '佳', '妙', '绝',
    '赢', '赚', '顺利', '舒服', '舒适', '温暖', '甜', '香', '美', '漂亮',
    '帅', '酷', '强', '厉害', '牛', '赞美', '欣赏', '感动', '激动', '兴奋',
    '惊喜', '希望', '期待', '信心', '勇敢', '坚强', '努力', '进步', '提高', '改善'
  ];

  // Negative words (负面词汇)
  const negativeWords = [
    '坏', '差', '糟', '烂', '垃圾', '失败', '错误', '问题', '麻烦', '困难',
    '讨厌', '恨', '难过', '伤心', '痛苦', '悲伤', '失望', '绝望', '沮丧', '郁闷',
    '烦', '怒', '愤怒', '生气', '恼火', '不满', '抱怨', '批评', '指责', '骂',
    '丑', '臭', '脏', '恶心', '可怕', '恐怖', '害怕', '担心', '焦虑', '紧张',
    '疲惫', '累', '病', '疼', '痛', '弱', '懒', '退步', '下降', '恶化'
  ];

  // Negation words (否定词)
  const negationWords = ['不', '没', '无', '非', '别', '莫', '未', '否', '勿'];

  let score = 0;
  let negationMultiplier = 1;

  // Split text into characters for analysis
  const chars = text.split('');
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    
    // Check for negation
    if (negationWords.includes(char)) {
      negationMultiplier = -1;
      continue;
    }

    // Check for positive words (including multi-character words)
    for (const word of positiveWords) {
      if (text.substring(i, i + word.length) === word) {
        score += 1 * negationMultiplier;
        negationMultiplier = 1; // Reset negation
        break;
      }
    }

    // Check for negative words
    for (const word of negativeWords) {
      if (text.substring(i, i + word.length) === word) {
        score -= 1 * negationMultiplier;
        negationMultiplier = 1; // Reset negation
        break;
      }
    }
  }

  return score;
}

/**
 * Calculate sentiment color based on emotional tone
 * Supports both English and Chinese text
 */
function calculateSentimentColor(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'rgb(161 161 170)'; // Neutral gray (zinc-400)
  }

  // Detect if text contains Chinese characters
  const hasChinese = /[\u4e00-\u9fa5]/.test(text);
  
  let score = 0;
  
  if (hasChinese) {
    // Chinese sentiment analysis using keyword matching
    score = analyzeChineseSentiment(text);
  } else {
    // English sentiment analysis using sentiment library
    const result = sentiment.analyze(text);
    score = result.score;
  }

  console.log('[Sentiment] Score:', score, 'for text:', text.substring(0, 30), '(Chinese:', hasChinese, ')');

  // Define color anchors
  const negativeColor = 'rgb(239 68 68)';   // Red-500 (Negative/Sad/Angry)
  const neutralColor = 'rgb(161 161 170)';  // Zinc-400 (Neutral)
  const positiveColor = 'rgb(16 185 129)';  // Emerald-500 (Positive/Happy)

  // Map score to color with interpolation
  if (score < -3) {
    return negativeColor;
  } else if (score > 3) {
    return positiveColor;
  } else if (score < 0) {
    // Interpolate between negative and neutral
    const ratio = Math.abs(score) / 3; // 0 to 1
    return interpolateRGB(neutralColor, negativeColor, ratio);
  } else {
    // Interpolate between neutral and positive
    const ratio = score / 3; // 0 to 1
    return interpolateRGB(neutralColor, positiveColor, ratio);
  }
}

/**
 * Calculate originality color based on AI vs Human content ratio
 */
function calculateOriginalityColor(editor: Editor | null): string {
  if (!editor) {
    return 'rgb(234 179 8)'; // Gold (default 100% human)
  }

  let totalChars = 0;
  let aiChars = 0;

  // Traverse the document to count characters
  editor.state.doc.descendants((node) => {
    if (node.isText && node.text) {
      const text = node.text;
      totalChars += text.length;

      // Check if this text node has the aiGenerated mark
      const hasAiMark = node.marks.some((mark) => mark.type.name === 'aiGenerated');
      if (hasAiMark) {
        aiChars += text.length;
        console.log('[AI Mark Found] Text:', text.substring(0, 20) + '...', 'Length:', text.length);
      }
    }
    return true; // Continue traversing
  });

  // Calculate AI ratio
  const aiRatio = totalChars > 0 ? aiChars / totalChars : 0;

  console.log('[Originality] Total chars:', totalChars, 'AI chars:', aiChars, 'Ratio:', aiRatio.toFixed(2));

  // Define color anchors
  const humanColor = 'rgb(234 179 8)';    // Gold/Warm (0% AI)
  const aiColor = 'rgb(147 51 234)';       // Purple/Cold (100% AI)

  // Interpolate between human and AI colors
  return interpolateRGB(humanColor, aiColor, aiRatio);
}

/**
 * Hook to perform ambient analysis on editor content
 * Updates global store with real-time sentiment and originality colors
 */
export function useAmbientAnalysis(editor: Editor | null): AmbientAnalysisResult {
  const { sentimentColor, originalityColor, setColors } = useAmbientAnalysisStore();

  useEffect(() => {
    if (!editor) return;

    // Analysis function
    const analyze = () => {
      const text = editor.getText();
      
      // Calculate colors
      const newSentimentColor = calculateSentimentColor(text);
      const newOriginalityColor = calculateOriginalityColor(editor);
      
      console.log('[useAmbientAnalysis] Text:', text.substring(0, 50) + '...');
      console.log('[useAmbientAnalysis] Sentiment Color:', newSentimentColor);
      console.log('[useAmbientAnalysis] Originality Color:', newOriginalityColor);
      
      // Update store
      setColors(newSentimentColor, newOriginalityColor);
    };

    // Run initial analysis
    analyze();

    // Listen to editor updates
    const handleUpdate = () => {
      analyze();
    };

    editor.on('update', handleUpdate);

    // Cleanup
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, setColors]);

  return { sentimentColor, originalityColor };
}
