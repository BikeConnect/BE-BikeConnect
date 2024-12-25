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

const analyzeIDCard = async (imageUrl) => {
  try {
    console.log("Starting image analysis for URL:", imageUrl);

    const response = await fetch(imageUrl);
    const imageBuffer = await response.buffer();
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
            /Ã|À|Á|Ạ|Ả|Ã|Â|�������|Ấ|Ậ|��|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g,
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

      if (analysis.details.sharpness < 40) {
        analysis.isValid = false;
        analysis.issues.push("Ảnh không rõ nét");
      }

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

    // Sửa lại phần generate image hash
    const imageHashValue = await new Promise((resolve, reject) => {
      imageHash(
        {
          data: imageBuffer,
          hash_size: 16,
          hash_alg: "binary",
        },
        (error, data) => {
          if (error) reject(error);
          else resolve(data);
        }
      );
    });

    try {
      exifData = ExifReader.load(imageBuffer);
      console.log("Raw EXIF Data:", exifData);
    } catch (exifError) {
      console.log("Warning: Could not read EXIF data:", exifError.message);
    }

    // Kiểm tra cơ bản trước
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
        dimensions: dimensions,
        imageHash: imageHashValue,
        stats: imageStats,
      },
    };

    // Mở rộng danh sách kiểm tra phần mềm
    const editingSoftwarePatterns = [
      // Adobe Suite
      /photoshop|lightroom|adobe|illustrator|indesign|bridge|elements/i,

      // Phần mềm chỉnh sửa phổ biến khác
      /gimp|paint|corel|capture\s*one|affinity|luminar|acdsee/i,

      // Ứng dụng di động
      /snapseed|vsco|lightx|picsart|facetune|meitu|b612|snow|sweet\s*selfie/i,

      // Công cụ trực tuyến
      /canva|pixlr|fotor|befunky|photoscape|polarr|ribbet/i,

      // Từ khóa chung
      /edit|editor|retouch|filter|effect|adjust|modify|enhance/i,
    ];

    const editingSignatures = [
      // Kiểm tra metadata của phần mềm
      {
        condition: () => {
          return Object.keys(exifData).some((key) =>
            editingSoftwarePatterns.some((pattern) => pattern.test(key))
          );
        },
        message: "Phát hiện metadata của phần mềm chỉnh sửa ảnh",
      },

      // Kiểm tra tỷ lệ nén
      {
        condition: () => {
          const expectedSize =
            dimensions.width * dimensions.height * (metadata.channels || 3);
          const compressionRatio = imageBuffer.length / expectedSize;
          return compressionRatio < 0.1; // Tỷ lệ nén quá cao
        },
        message: "Phát hiện tỷ lệ nén bất thường",
      },

      // Kiểm tra nhiễu ảnh
      {
        condition: () => {
          return imageStats.channels.some((channel) => {
            const { mean, std } = channel;
            return std < mean * 0.1; // Độ lệch chuẩn quá thấp so với giá trị trung bình
          });
        },
        message: "Phát hiện dấu hiệu chỉnh sửa trong phân bố màu sắc",
      },

      // Kiểm tra thời gian chỉnh sửa
      {
        condition: () => {
          const originalTime = new Date(exifData.DateTimeOriginal?.description);
          const modifyTime = new Date(exifData.ModifyDate?.description);
          return (
            !isNaN(originalTime) &&
            !isNaN(modifyTime) &&
            modifyTime > originalTime
          );
        },
        message: "Thời gian chỉnh sửa khác với thời gian chụp",
      },

      // Kiểm tra bất thường trong kênh màu
      {
        condition: () => {
          if (!imageStats.channels) return false;
          return imageStats.channels.some((channel) => {
            return channel.entropy < 6.5 || channel.std < 15;
          });
        },
        message: "Phát hiện bất thường trong phân bố màu sắc",
      },

      // Kiểm tra định dạng và độ sâu bit
      {
        condition: () => {
          return metadata.space !== "srgb" || metadata.depth > 8;
        },
        message: "Phát hiện bất thường trong không gian màu hoặc độ sâu bit",
      },

      // Kiểm tra phiên bản lưu file
      {
        condition: () => {
          return (
            exifData.Software?.description?.includes("version") ||
            exifData.Software?.description?.includes("ver.") ||
            metadata.hasAlpha
          );
        },
        message: "Phát hiện dấu hiệu của file đã qua chỉnh sửa",
      },

      // Kiểm tra bất thường trong dữ liệu pixel
      {
        condition: async () => {
          try {
            // Đọc ảnh dựa trên định dạng
            let imageData;
            if (metadata.format === "png") {
              const png = PNG.sync.read(imageBuffer);
              imageData = {
                data: png.data,
                width: png.width,
                height: png.height,
              };
            } else {
              const jpegData = jpeg.decode(imageBuffer);
              imageData = {
                data: jpegData.data,
                width: jpegData.width,
                height: jpegData.height,
              };
            }

            // Kiểm tra sự khác biệt pixel giữa các vùng
            const diff = new pixelDiff({
              imageA: imageData,
              imageB: imageData,
              thresholdType: pixelDiff.THRESHOLD_PERCENT,
              threshold: 0.01,
            });

            const diffResult = await diff.compare();
            return (
              diffResult.differences > imageData.width * imageData.height * 0.01
            );
          } catch (e) {
            console.error("Error in pixel analysis:", e);
            return false;
          }
        },
        message: "Phát hiện bất thường trong dữ liệu pixel của ảnh",
      },

      // Kiểm tra tính liên tục của dữ liệu
      {
        condition: () => {
          try {
            const data =
              metadata.format === "png"
                ? PNG.sync.read(imageBuffer).data
                : jpeg.decode(imageBuffer).data;

            let discontinuities = 0;
            for (let i = 0; i < data.length - 4; i += 4) {
              const diff = Math.abs(data[i] - data[i + 4]);
              if (diff > 50) discontinuities++;
            }

            return discontinuities > (data.length / 4) * 0.1;
          } catch (e) {
            console.error("Error in continuity check:", e);
            return false;
          }
        },
        message: "Phát hiện đứt đoạn bất thường trong dữ liệu ảnh",
      },
    ];

    // Áp dụng tất cả kiểm tra
    editingSignatures.forEach((check) => {
      try {
        if (check.condition()) {
          manipulationChecks.isManipulated = true;
          manipulationChecks.issues.push(check.message);
        }
      } catch (e) {
        console.log(`Error in check: ${e.message}`);
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
