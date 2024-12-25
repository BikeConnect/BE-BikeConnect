const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const FileType = require("file-type");
const sharp = require("sharp");
const ExifReader = require("exifreader");
const imageSize = require("image-size");
const imageHash = require("image-hash");
const { PNG } = require("pngjs");
const jpeg = require("jpeg-js");
const pixelDiff = require("pixel-diff");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const rekognition = new AWS.Rekognition();

const fetchImageFromCloudinary = async (imageUrl) => {
  try {
    // Kiểm tra URL gốc trước
    console.log("Original URL:", imageUrl);

    // Thay đổi cách transform URL
    const transformedUrl = imageUrl.includes("/upload/")
      ? imageUrl.replace("/upload/", "/upload/q_auto,f_auto,fl_lossy/")
      : imageUrl;

    console.log("Transformed URL:", transformedUrl);

    const response = await fetch(transformedUrl, {
      headers: {
        Accept: "image/*",
      },
      timeout: 10000, // 10 seconds timeout
    });

    if (!response.ok) {
      // Nếu URL đã transform bị lỗi, thử lại với URL gốc
      console.log("Trying original URL as fallback");
      const originalResponse = await fetch(imageUrl, {
        headers: {
          Accept: "image/*",
        },
        timeout: 10000,
      });

      if (!originalResponse.ok) {
        throw new Error(
          `Failed to fetch image: ${originalResponse.statusText}`
        );
      }
      return await originalResponse.buffer();
    }

    return await response.buffer();
  } catch (error) {
    console.error("Error fetching image from Cloudinary:", error);
    throw error;
  }
};

const analyzeIDCard = async (imageUrl) => {
  try {
    console.log("Starting image analysis for URL:", imageUrl);

    const imageBuffer = await fetchImageFromCloudinary(imageUrl);
    console.log("Image buffer size:", imageBuffer.length);

    // Kiểm tra kích thước file
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > maxSize) {
      return {
        isValid: false,
        issues: ["Kích thước ảnh quá lớn (tối đa 5MB)"],
      };
    }

    // Kiểm tra định dạng file
    const fileType = await FileType.fromBuffer(imageBuffer);
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!fileType || !allowedTypes.includes(fileType.mime)) {
      return {
        isValid: false,
        issues: ["Định dạng file không hợp lệ (chỉ chấp nhận JPG/PNG)"],
      };
    }

    // Thực hiện các phân tích AWS Rekognition một cách tuần tự
    let analysis = {
      isValid: true,
      confidence: 0,
      issues: [],
      details: {
        imageQuality: "Unknown",
        brightness: 0,
        sharpness: 0,
        hasText: false,
        detectedTexts: [],
        isIDCard: false,
      },
    };

    try {
      // 1. Face Detection
      const faceParams = {
        Image: { Bytes: imageBuffer },
        Attributes: ["ALL"],
      };
      const faceResults = await rekognition.detectFaces(faceParams).promise();
      console.log(
        "Face detection results:",
        JSON.stringify(faceResults, null, 2)
      );

      // 2. Text Detection with UTF-8 handling
      const textParams = {
        Image: { Bytes: imageBuffer },
        Filters: {
          WordFilter: {
            MinConfidence: 80,
          },
        },
      };
      const textResults = await rekognition.detectText(textParams).promise();

      // Convert detected text to proper UTF-8
      const normalizedTexts = textResults.TextDetections.map((text) => {
        try {
          return {
            ...text,
            DetectedText: decodeURIComponent(escape(text.DetectedText)),
          };
        } catch {
          return text;
        }
      });

      console.log(
        "Text detection results:",
        JSON.stringify(normalizedTexts, null, 2)
      );

      // 3. Label Detection
      const labelParams = {
        Image: { Bytes: imageBuffer },
        MaxLabels: 10,
        MinConfidence: 80,
      };
      const labelResults = await rekognition
        .detectLabels(labelParams)
        .promise();
      console.log(
        "Label detection results:",
        JSON.stringify(labelResults, null, 2)
      );

      // Update analysis with results
      analysis.details = {
        imageQuality: faceResults.FaceDetails.length > 0 ? "Good" : "Poor",
        brightness: faceResults.FaceDetails[0]?.Quality?.Brightness || 0,
        sharpness: faceResults.FaceDetails[0]?.Quality?.Sharpness || 0,
        hasText: normalizedTexts.length > 0,
        hasFace: faceResults.FaceDetails.length > 0,
        detectedTexts: normalizedTexts.map((text) => {
          const vietnameseText = text.DetectedText.replace(
            /Ã|À|Á|Ạ|Ả|Ã|Â|�����������������������������|Ấ|Ậ|��|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g,
            "A"
          )
            .replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E")
            .replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I")
            .replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O")
            .replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U")
            .replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y")
            .replace(/Đ/g, "D");
          return vietnameseText;
        }),
        idNumber:
          extractIDNumber(
            normalizedTexts.map((text) => text.DetectedText),
            faceResults.FaceDetails.length > 0
          ) || "Không tìm thấy",
        isIDCard: labelResults.Labels.some((label) =>
          ["ID Card", "Document", "Text", "Card"].includes(label.Name)
        ),
      };

      // Validate results
      if (!analysis.details.isIDCard) {
        analysis.isValid = false;
        analysis.issues.push("Không phát hiện đây là ảnh CCCD/CMND");
      }

      if (faceResults.FaceDetails.length === 0) {
        analysis.isValid = false;
        analysis.issues.push("Không phát hiện khuôn mặt trong ảnh");
      }

      if (analysis.details.brightness < 40) {
        analysis.isValid = false;
        analysis.issues.push("Ảnh quá tối");
      }

      if (analysis.details.sharpness > 15) {
        analysis.isValid = false;
        analysis.issues.push("Ảnh không rõ nét");
      }

      console.log("Image sharpness:", analysis.details.sharpness);

      if (normalizedTexts.length < 5) {
        analysis.isValid = false;
        analysis.issues.push("Không đủ thông tin văn bản trên CCCD/CMND");
      }
    } catch (rekognitionError) {
      console.error("AWS Rekognition error:", rekognitionError);
      analysis.isValid = false;
      analysis.issues.push("Lỗi khi phân tích ảnh");
    }

    // Add manipulation detection
    const manipulationResults = await detectImageManipulation(imageBuffer);

    return {
      ...analysis,
      manipulationCheck: {
        isManipulated: manipulationResults.isManipulated,
        manipulationIssues: manipulationResults.issues,
        editingDetails: manipulationResults.details,
      },
    };
  } catch (error) {
    console.error("Error analyzing ID card:", error);
    throw error;
  }
};

const detectImageManipulation = async (imageBuffer) => {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const imageStats = await sharp(imageBuffer).stats();
    const dimensions = imageSize(imageBuffer);
    let exifData = {};

    try {
      exifData = ExifReader.load(imageBuffer);
    } catch (e) {
      console.log("No EXIF data found - Suspicious for photo/screenshot");
      manipulationChecks.issues.push(
        "Không tìm thấy metadata - Nghi ngờ ảnh photo"
      );
    }

    const manipulationChecks = {
      isManipulated: false,
      issues: [],
      details: {
        software: exifData.Software?.description || "Unknown",
        editDateTime: exifData.ModifyDate?.description,
        originalDateTime: exifData.DateTimeOriginal?.description,
        hasPhotoshopTraces: false,
        compression: metadata.compression || "Unknown",
        format: metadata.format,
        hasAlphaChannel: metadata.hasAlpha || false,
        colorSpace: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        stats: imageStats,
      },
    };

    const editingSignatures = [
      // 1. Kiểm tra chi tiết phân bố màu sắc
      {
        condition: () => {
          if (!imageStats.channels) return false;
          const channels = imageStats.channels;

          // Kiểm tra độ đồng đều màu sắc
          const colorUniformity = channels.map((channel) => {
            const { mean, std, entropy } = channel;
            // Tính độ lệch chuẩn tương đối
            const relativeStd = std / mean;
            // Kiểm tra entropy thấp bất thường
            const lowEntropy = entropy < 4.5;
            // Kiểm tra độ lệch chuẩn quá thấp
            const lowVariation = relativeStd < 0.15;

            return lowEntropy || lowVariation;
          });

          // Kiểm tra phân bố histogram
          const histogramAnalysis = channels.map((channel) => {
            const { count } = channel;
            // Tìm peaks trong histogram
            const peaks = findHistogramPeaks(count);
            // Ảnh photo thường có ít peaks hơn
            return peaks.length < 3;
          });

          return (
            colorUniformity.some((x) => x) || histogramAnalysis.some((x) => x)
          );
        },
        message:
          "Phát hiện bất thường trong phân bố màu sắc - Dấu hiệu của ảnh photo",
      },

      // 2. Kiểm tra mẫu pixel và nhiễu
      {
        condition: () => {
          try {
            const data =
              metadata.format === "png"
                ? PNG.sync.read(imageBuffer).data
                : jpeg.decode(imageBuffer).data;

            let repeatingPatterns = 0;
            let noisyRegions = 0;
            let totalRegions = 0;

            // Kiểm tra từng vùng 4x4 pixel
            for (let y = 0; y < dimensions.height - 4; y += 4) {
              for (let x = 0; x < dimensions.width - 4; x += 4) {
                totalRegions++;

                // Lấy mẫu pixel trong vùng
                const region = getPixelRegion(data, x, y, dimensions.width);

                // Kiểm tra mẫu lặp lại
                if (hasRepeatingPattern(region)) {
                  repeatingPatterns++;
                }

                // Kiểm tra nhiễu thấp bất thường
                if (calculateNoiseLevel(region) < 5) {
                  noisyRegions++;
                }
              }
            }

            const patternRatio = repeatingPatterns / totalRegions;
            const noiseRatio = noisyRegions / totalRegions;

            return patternRatio > 0.3 || noiseRatio > 0.4;
          } catch (e) {
            console.error("Error in pixel pattern analysis:", e);
            return false;
          }
        },
        message: "Phát hiện mẫu pixel bất thường - Đặc trưng của ảnh photo",
      },

      // 3. Kiểm tra metadata và thông tin kỹ thuật
      {
        condition: () => {
          // Kiểm tra các dấu hiệu của thiết bị chụp lại
          const deviceTraces =
            /screenshot|screen capture|mobile|phone|camera/i.test(
              JSON.stringify(exifData)
            );

          // Kiểm tra thông số kỹ thuật bất thường
          const technicalAnomalies =
            [
              metadata.space !== "srgb",
              metadata.depth !== 8,
              !metadata.hasProfile,
              metadata.density &&
                (metadata.density < 72 || metadata.density > 300),
            ].filter(Boolean).length >= 2;

          return deviceTraces || technicalAnomalies;
        },
        message: "Phát hiện dấu hiệu kỹ thuật của ảnh photo hoặc screenshot",
      },
    ];

    // Helper functions
    function findHistogramPeaks(histogram) {
      const peaks = [];
      for (let i = 1; i < histogram.length - 1; i++) {
        if (
          histogram[i] > histogram[i - 1] &&
          histogram[i] > histogram[i + 1]
        ) {
          peaks.push(i);
        }
      }
      return peaks;
    }

    function getPixelRegion(data, x, y, width) {
      const region = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const idx = ((y + i) * width + (x + j)) * 4;
          region.push([data[idx], data[idx + 1], data[idx + 2]]);
        }
      }
      return region;
    }

    function hasRepeatingPattern(region) {
      // Kiểm tra mẫu lặp lại trong vùng 4x4
      const patterns = {};
      for (const pixel of region) {
        const key = pixel.join(",");
        patterns[key] = (patterns[key] || 0) + 1;
      }
      return Object.values(patterns).some((count) => count > 6);
    }

    function calculateNoiseLevel(region) {
      // Tính độ nhiễu trong vùng pixel
      let totalVariation = 0;
      for (let i = 0; i < region.length - 1; i++) {
        const diff =
          Math.abs(region[i][0] - region[i + 1][0]) +
          Math.abs(region[i][1] - region[i + 1][1]) +
          Math.abs(region[i][2] - region[i + 1][2]);
        totalVariation += diff;
      }
      return totalVariation / (region.length - 1);
    }

    function calculateImageQuality(buffer, dims) {
      const fileSize = buffer.length;
      const pixelCount = dims.width * dims.height;
      const bitsPerPixel = (fileSize * 8) / pixelCount;
      return Math.min(bitsPerPixel / 24, 1); // Normalize to 0-1
    }

    // Áp dụng kiểm tra
    editingSignatures.forEach((check) => {
      try {
        const result = check.condition();
        console.log(`Check result for ${check.message}:`, result);

        if (result) {
          manipulationChecks.isManipulated = true;
          manipulationChecks.issues.push(check.message);
        }
      } catch (e) {
        console.error(`Error in check ${check.message}:`, e);
      }
    });

    return manipulationChecks;
  } catch (error) {
    console.error("Error in manipulation detection:", error);
    return {
      isManipulated: false,
      issues: ["Không thể phân tích thông tin chỉnh sửa ảnh"],
      details: { error: error.message },
    };
  }
};

// Thêm hàm helper để trích xuất số CCCD
const extractIDNumber = (texts, hasFace = false) => {
  if (!hasFace) {
    return null;
  }

  // Pattern cho cả hai định dạng
  const patterns = [
    /(?:Số|No|So)[\s.:]*([0-9]{9,12})/i, // Định dạng 1: "Số/No.:"
    /(?:So dinh danh ca nhan|Personal identification)[\s.:]*([0-9]{9,12})/i, // Định dạng 2
  ];

  for (const text of texts) {
    // Kiểm tra từng pattern
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const number = match[1].replace(/[^0-9]/g, "");
        // Kiểm tra độ dài hợp lệ (9 số cho CMND hoặc 12 số cho CCCD)
        if (number.length === 9 || number.length === 12) {
          return number;
        }
      }
    }

    // Kiểm tra trường hợp số CCCD đứng một mình
    const numberOnly = text.replace(/[^0-9]/g, "");
    if (numberOnly.length === 12) {
      return numberOnly;
    }
  }

  return null;
};

module.exports = {
  analyzeIDCard,
  detectImageManipulation,
  extractIDNumber,
};
