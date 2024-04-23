const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");

const app = express();
/** 服务端端口 */
const SERVER_PORT = 3000;
/** 文件链接前缀 */
const FILE_HREF_PREV = "/files";
/** 文件存储路径 */
const FILES_PATH = path.resolve(__dirname, "files");
/** 分块存储路径 */
const CHUNKS_PATH = path.resolve(__dirname, "chunks");
/** 分块上传 Multer */
const chunkUploadMulter = multer({
  storage: multer.diskStorage({
    // 定义分块存储路径
    destination: (req, file, cb) => {
      const { fileHash, chunkSize } = req.body;
      // 由于文件和分块是一对多的关系，并且相同文件在不同分块大小下产生的分块内容和数量不同
      // 因此，分块存储路径需要根据文件哈希值和分块大小生成，我们可以采用 fileHash/chunkSize/ 的路径结构来存储分块
      const filePath = path.resolve(CHUNKS_PATH, fileHash, String(chunkSize));
      if (!fs.existsSync(filePath)) {
        fs.mkdirSync(filePath, { recursive: true });
      }
      cb(null, filePath);
    },
    // 定义分块文件名
    filename: (req, file, cb) => {
      const { chunkHash, chunkIndex } = req.body;
      // 为了保证分块的唯一性和分块顺序，我们可以采用 chunkHash_chunkIndex 的分块文件名格式（即：分块哈希值_分块序号）
      cb(null, `${chunkHash}_${chunkIndex}`);
    },
  }),
  limits: {
    fileSize: Infinity,
  },
});

// 初始化文件存储路径
if (!fs.existsSync(FILES_PATH)) {
  fs.mkdirSync(FILES_PATH, { recursive: true });
}
// 初始化分块存储路径
if (!fs.existsSync(CHUNKS_PATH)) {
  fs.mkdirSync(CHUNKS_PATH, { recursive: true });
}

// 静态文件请求处理
app.use(FILE_HREF_PREV, express.static(FILES_PATH));
// 解析请求体
app.use(bodyParser.json());

// 上传分块
app.post(
  "/upload/chunk",
  chunkUploadMulter.single("chunk"),
  (req, res, next) => {
    res.json({
      code: 200,
      data: null,
      message: "分块上传成功",
    });
  }
);

// 判断文件是否存在
app.get("/upload/validate-file/:fileHash", (req, res, next) => {
  const { fileHash } = req.params;
  const { fileExt } = req.query;
  const result = fs.existsSync(
    path.resolve(FILES_PATH, `${fileHash}.${fileExt}`)
  );

  res.json({
    code: 200,
    data: result,
    message: result ? "文件存在" : "文件不存在",
  });
});

// 获取文件链接
app.get("/upload/get-file-href/:fileHash", (req, res, next) => {
  const { fileHash } = req.params;
  const { fileExt } = req.query;
  const filename = `${fileHash}.${fileExt}`;
  const fileHref = `${FILE_HREF_PREV}/${filename}`;
  const result = fs.existsSync(path.resolve(FILES_PATH, filename));

  res.json({
    code: 200,
    data: result ? fileHref : null,
    message: result ? "获取文件链接成功" : "获取文件链接失败",
  });
});

// 判断分块是否存在
app.get("/upload/validate-chunk/:chunkHash", (req, res, next) => {
  const { chunkHash } = req.params;
  const { chunkIndex, fileHash, chunkSize } = req.query;
  const result = fs.existsSync(
    path.resolve(
      CHUNKS_PATH,
      fileHash,
      String(chunkSize),
      `${chunkHash}_${chunkIndex}`
    )
  );

  res.json({
    code: 200,
    data: result,
    message: result ? "分块存在" : "分块不存在",
  });
});

// 合并分块
app.post("/upload/merge-chunks", async (req, res, next) => {
  const { fileExt, fileHash, chunkSize } = req.body;
  const filename = `${fileHash}.${fileExt}`;
  const filePath = path.resolve(FILES_PATH, filename);
  const fileHref = `${FILE_HREF_PREV}/${filename}`;
  const chunksDirPath = path.resolve(CHUNKS_PATH, fileHash, String(chunkSize));

  // 校验，文件存在
  if (fs.existsSync(filePath)) {
    return res.json({
      code: 200,
      data: fileHref,
      message: "文件已存在",
    });
  }

  // 校验，分块不存在
  if (!fs.existsSync(chunksDirPath)) {
    return res.json({
      code: 500,
      data: null,
      message: "文件分块缺失",
    });
  }

  // 合并分块
  {
    const fileWriteStream = fs.createWriteStream(filePath);
    const chunkNameList = fs.readdirSync(chunksDirPath);
    const mergeResult = true;

    // 根据分块序号排序
    chunkNameList.sort((a, b) => {
      const [hashA, indexA] = a.split("_");
      const [hashB, indexB] = b.split("_");
      return parseInt(indexA) - parseInt(indexB);
    });

    // 写入文件
    for (const [index, chunkName] of chunkNameList.entries()) {
      const chunkReadStream = fs.createReadStream(
        path.resolve(chunksDirPath, chunkName)
      );

      try {
        await pipeline(chunkReadStream, fileWriteStream, { end: false });
      } catch (err) {
        mergeResult = false;
        break;
      } finally {
        chunkReadStream.close();
      }
    }
    fileWriteStream.end();

    if (mergeResult) {
      res.json({
        code: 200,
        data: fileHref,
        message: "合并分块成功",
      });
    } else {
      fs.unlinkSync(filePath);
      res.json({
        code: 500,
        data: null,
        message: "合并分块失败",
      });
    }
  }
});

// 启动服务
app.listen(SERVER_PORT, () => {
  console.log(`文件存储路径：${FILES_PATH}`);
  console.log(`分块存储路径：${CHUNKS_PATH}`);
  console.log(`启动服务地址：http://localhost:${SERVER_PORT}`);
});
