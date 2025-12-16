/**
 * Test utility for Ambient Analysis
 * Use this in browser console to test sentiment and originality analysis
 */

// Example usage in browser console:

// 1. Test sentiment analysis
const testSentiment = () => {
  const { useAmbientAnalysisStore } = require('@/lib/store/ambientAnalysisStore');
  const { sentimentColor, originalityColor } = useAmbientAnalysisStore.getState();
  
  console.log('Current Sentiment Color:', sentimentColor);
  console.log('Current Originality Color:', originalityColor);
};

// 2. Test color interpolation
const testColorInterpolation = () => {
  // Negative text (should be reddish)
  const negativeText = "I hate this terrible awful horrible disaster catastrophe";
  
  // Positive text (should be greenish)
  const positiveText = "I love this amazing wonderful fantastic excellent great";
  
  // Neutral text (should be grayish)
  const neutralText = "The cat sat on the mat.";
  
  console.log('Test these texts in the editor to see color changes:');
  console.log('1. Negative:', negativeText);
  console.log('2. Positive:', positiveText);
  console.log('3. Neutral:', neutralText);
};

// 3. Test AI content ratio
const testAiRatio = () => {
  console.log('To test AI ratio:');
  console.log('1. Type some human text');
  console.log('2. Use Refactor/Expand to add AI text');
  console.log('3. Watch the originality color shift from Gold to Purple');
  console.log('');
  console.log('Gold (rgb(234 179 8)) = 100% Human');
  console.log('Purple (rgb(147 51 234)) = 100% AI');
};

export { testSentiment, testColorInterpolation, testAiRatio };
