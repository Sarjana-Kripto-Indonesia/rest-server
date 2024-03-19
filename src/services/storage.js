/**
 * Storage function with multer and aws
 *
 */

const path = require("path");
const crypto = require("crypto");
const {
  S3Client,
  DeleteObjectsCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const multerS3 = require("multer-s3");

require("dotenv").config();

// S3 bucket configuration
const s3Config = {
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION,
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.DO_SPACES_SECRET_ACCESS_KEY,
  },
};

// S3 client initialization
const s3 = new S3Client(s3Config);

/**
 * file filter
 *
 * @param req Request
 * @param file File
 * @param cb Callback
 */
const filter = (req, file, cb) => {
  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".pdf",
    ".docx",
    ".doc",
    ".xlsx",
    ".csv",
    ".txt",
    ".mp4",
  ];
  const imageExtensions = [".jpg", ".jpeg", ".png"];
  const ext = path.extname(file.originalname);
  const size = file.size;
  const isImage = imageExtensions.includes(ext.toLowerCase());
  if (allowedExtensions.includes(ext.toLowerCase())) {
    if (isImage) {
      if (size > 5e6) {
        const err = "Image exceeds 5 mb";
        req.fileValidationError = err;
        cb(new Error(err), false);
      }
    } else {
      if (size > 500e8) {
        const err = "File exceeds 50000 mb";
        req.fileValidationError = err;
        cb(new Error(err), false);
      }
    }
    cb(null, true);
  } else {
    const err = "File extension is not allowed!";
    req.fileValidationError = err;
    cb(new Error(err), false);
  }
};

/**
 * Generate randomize key
 *
 * @param req Request
 * @param file File
 * @param cb Callback
 */
const generateKey = (req, file, cb) => {
  let path = "files/";
  const subPath = req.body.path;

  if (subPath && subPath !== "") {
    path = path + subPath.trim() + "/";
  }

  crypto.randomBytes(16, (err, raw) => {
    cb(err, err ? undefined : path + raw.toString("hex"));
  });
};

// storage settings
const storage = multerS3({
  s3: s3,
  bucket: process.env.DO_SPACES_BUCKET,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: generateKey,
  acl: "private",
});

/**
 * Upload file
 */
const uploadFile = multer({
  storage: storage,
  fileFilter: filter,
}).single("file");

const uploadFileMultiple = multer({
  storage: storage,
  fileFilter: filter,
}).array("file");

/**
 * Delete file(s) on the bucket
 *
 * @param keys Array or single key
 */
const deleteObject = async (keys) => {
  if (Array.isArray(keys)) {
    const objectList = keys.map((e) => ({ Key: e }));

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Delete: {
        Objects: objectList,
      },
    });

    try {
      const data = await s3.send(deleteCommand);
      console.log("DO Spaces multiple deletion: ", data);
    } catch (err) {
      console.error("Error", err);
    }
  } else {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: keys,
    });

    try {
      const data = await s3.send(deleteCommand);
      console.log("DO Spaces single deletion: ", data);
      return data;
    } catch (err) {
      console.error("Error", err);
    }
  }
};

// MIDDLEWARE MULTIPART
const multerMiddleware = require("multer");
const upload = multerMiddleware();

// MIDDLEWARE EXCEL
const multerExcel = require("multer");
const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes("excel") ||
    file.mimetype.includes("spreadsheetml")
  ) {
    cb(null, true);
  } else {
    // eslint-disable-next-line node/no-callback-literal
    cb("Please upload only excel file.", false);
  }
};
const excelStorage = multerExcel.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // console.log(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const uploadExcelFile = multerExcel({
  storage: excelStorage,
  fileFilter: excelFilter,
});
const uploadToServer = multerExcel({
  storage: excelStorage,
  fileFilter: filter,
});

/**
 * Retrieve file
 */

const retrieveFile = async (key) => {
  try {
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.DO_SPACES_BUCKET,
        Key: key,
      })
    );

    return { success: true, url };
  } catch (error) {
    return { success: false, error };
  }
};

module.exports = {
  uploadFile,
  uploadFileMultiple,
  deleteObject,
  storage,
  retrieveFile,
  uploadMiddleware: upload.any(),
  uploadExcelFile: uploadExcelFile.single("file"),
  uploadToServer: uploadToServer.single("file"),
};
