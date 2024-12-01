const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../configs/cloudinaryConfig");

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({
          success: false,
          message: "File is too large. Maximum file size allowed is 5MB.",
        });
      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          message: "Too many files uploaded. Maximum allowed is 10 images.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          fail: false,
          message: "Unexpected field. Please upload only image files.",
        });
      default:
        return res.status(400).json({
          success: false,
          message: "File upload error. Please try again.",
        });
    }
  } else if (err) {
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred during file upload.",
    });
  }
  next();
};

const handleImageUpload = async (req, res, next) => {
  try {
    const storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: "BikeConnect/vehicles",
        allowed_formats: ["jpg", "png", "jpeg", "gif"],
        resource_type: "auto"
      },
    });

    const upload = multer({ 
      storage: storage,
      limits: {
        fileSize: 5 * 1024 * 1024,
        files: 10
      }
    }).array('images', 10);

    upload(req, res, function(err) {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  } catch (error) {
    next(error);
  }
};
module.exports = { handleImageUpload };
