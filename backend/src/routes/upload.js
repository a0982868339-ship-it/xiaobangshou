const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middlewares/auth');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * 完整图片上传解决方案
 * 包含：日期分目录、唯一文件名、大小限制、类型校验
 */

// 1. 配置存储引擎
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      let type = req.query.type || 'general';
      // 核心防御：仅允许字母数字类型的目录名，防止路径穿越 (Path Traversal)
      type = type.replace(/[^a-zA-Z0-9_-]/g, '');
      
      const now = new Date();
      const dateDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const uploadPath = path.join('uploads', type, dateDir);
      
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E4);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `img-${uniqueSuffix}${ext}`);
  }
});

// 2. 文件过滤器
const fileFilter = (req, file, cb) => {
  // 更加宽松的多媒体类型校验
  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/') || 
                  file.mimetype === 'application/x-mpegURL' || 
                  file.mimetype === 'application/octet-stream' || 
                  file.mimetype === 'application/vnd.apple.mpegurl' ||
                  file.mimetype === 'video/quicktime'; // iOS MOV 格式
  
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mov', '.m4v', '.avi', '.wmv', '.quicktime'];

  if ((isImage || isVideo) || allowedExts.includes(ext)) {
    return cb(null, true);
  }
  
  cb(new Error(`不支持的文件格式(${file.mimetype})。仅支持图片及视频格式`));
};

// 3. 创建上传中间件
const uploadInstance = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 增加到 50MB 以支持视频
  }
});

const videoUploadInstance = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
});

/**
 * 通用单图上传接口
 * 路径: /api/upload/image
 */
router.post('/image', authMiddleware, (req, res) => {
  uploadInstance.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return sendError(res, '图片大小不能超过 10MB');
        return sendError(res, `上传错误: ${err.message}`);
      }
      return sendError(res, err.message);
    }

    if (!req.file) {
      return sendError(res, '没有检测到上传文件');
    }

    // 生成标准的相对路径 URL (使用正斜杠)
    const type = req.query.type || 'general';
    const now = new Date();
    const dateDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const url = `/uploads/${type}/${dateDir}/${req.file.filename}`;
    
    sendSuccess(res, { 
      url,
      filename: req.file.filename,
      size: req.file.size
    }, '文件上传成功');
  });
});

/**
 * 视频流式上传接口 (ID 36 / ID 37 专项加固)
 * 锁定规格：480P, 15s (前端控制), 20MB (后端强制)
 * 路径: /api/upload/video
 */
router.post('/video', authMiddleware, (req, res) => {
  const type = req.query.type || 'video';
  const now = new Date();
  const dateDir = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const uploadDir = path.join('uploads', type, dateDir);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filename = `vid-${Date.now()}-${Math.round(Math.random() * 1E4)}.mp4`;
  const filePath = path.join(uploadDir, filename);
  
  // 核心：使用流式写入 (Streaming) 保护内存
  const writeStream = fs.createWriteStream(filePath);
  let receivedSize = 0;
  const MAX_SIZE = 20 * 1024 * 1024; // 硬性限制 20MB

  req.on('data', (chunk) => {
    receivedSize += chunk.length;
    if (receivedSize > MAX_SIZE) {
      req.pause();
      writeStream.end();
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(413).json({ success: false, message: '视频文件过大，上限 20MB。' });
    }
    writeStream.write(chunk);
  });

  req.on('end', () => {
    writeStream.end();
    const url = `/uploads/${type}/${dateDir}/${filename}`;
    sendSuccess(res, { url, filename, size: receivedSize }, '视频流式上传成功');
  });

  req.on('error', (err) => {
    writeStream.end();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    sendError(res, `上传中断: ${err.message}`);
  });
});

module.exports = router;
