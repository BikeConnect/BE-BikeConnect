const AWS = require('aws-sdk');
const fetch = require('node-fetch');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const rekognition = new AWS.Rekognition();

const analyzeIDCard = async (imageUrl) => {
  try {
    const response = await fetch(imageUrl);
    const imageBuffer = await response.buffer();

    // 1. Kiểm tra chất lượng ảnh
    const qualityParams = {
      Image: {
        Bytes: imageBuffer
      },
      QualityFilter: 'HIGH'
    };
    const qualityCheck = await rekognition.detectFaces(qualityParams).promise();

    // 2. Phát hiện text trên ảnh
    const textParams = {
      Image: {
        Bytes: imageBuffer
      }
    };
    const textDetection = await rekognition.detectText(textParams).promise();

    // 3. Kiểm tra dấu hiệu chỉnh sửa
    const moderationParams = {
      Image: {
        Bytes: imageBuffer
      }
    };
    const moderationCheck = await rekognition.detectModerationLabels(moderationParams).promise();

    // Phân tích kết quả
    const analysis = {
      isValid: true,
      confidence: 0,
      issues: [],
      details: {
        imageQuality: qualityCheck.FaceDetails.length > 0 ? 'Good' : 'Poor',
        hasText: textDetection.TextDetections.length > 0,
        detectedTexts: textDetection.TextDetections.map(text => text.DetectedText),
        manipulationSigns: moderationCheck.ModerationLabels
      }
    };

    // Kiểm tra các vấn đề
    if (qualityCheck.FaceDetails.length === 0) {
      analysis.issues.push('Không phát hiện khuôn mặt trong ảnh');
      analysis.isValid = false;
    }

    if (textDetection.TextDetections.length === 0) {
      analysis.issues.push('Không phát hiện text trên CCCD/CMND');
      analysis.isValid = false;
    }

    const manipulationDetected = moderationCheck.ModerationLabels.some(label => 
      ['Photoshop', 'Edited', 'Manipulated'].includes(label.Name)
    );

    if (manipulationDetected) {
      analysis.issues.push('Phát hiện dấu hiệu chỉnh sửa ảnh');
      analysis.isValid = false;
      analysis.confidence = moderationCheck.ModerationLabels[0].Confidence;
    }

    return analysis;

  } catch (error) {
    console.error('Error analyzing ID card:', error);
    throw error;
  }
};

module.exports = {
  analyzeIDCard
};