import SparkMd5 from "spark-md5";

/**
 * 文件分块
 * @param {File} file 文件对象
 * @param {number} chunkSize 分块大小
 * @param {Function | undefined} callback 分块上传进度回调函数
 * @returns {Promise <{fileHash: string, chunkList: Array<{raw: Blob, hash: string}>}} Promise 对象
 */
export const splitChunks = (file, chunkSize, callback) => {
  return new Promise((resolve, reject) => {
    /** 开始时间 */
    const startTime = Date.now();
    /** 文件大小 */
    const fileSize = file.size;
    /** 分块列表 */
    const chunkList = [];
    /** 分块方法 */
    const fileSlice =
      File.prototype.slice ||
      File.prototype.mozSlice ||
      File.prototype.webkitSlice;
    /** 分块总数量 */
    const totalChunk = Math.ceil(fileSize / chunkSize);
    /** 当前分块索引 */
    let currChunkIndex = 0;
    const sparkMd5 = new SparkMd5.ArrayBuffer();
    const fileReader = new FileReader();
    const loadNextChunk = () => {
      const start = currChunkIndex * chunkSize;
      const end = start + chunkSize >= fileSize ? fileSize : start + chunkSize;

      fileReader.readAsArrayBuffer(fileSlice.call(file, start, end));
    };

    fileReader.onload = (e) => {
      const arrayBuffer = e.target.result;
      const chunk = {
        raw: new Blob([arrayBuffer]),
        hash: SparkMd5.ArrayBuffer.hash(arrayBuffer),
      };
      console.log(`chunk 序号：${currChunkIndex + 1}/${totalChunk}`);
      console.log(`chunk 哈希值：${chunk.hash}`);

      Object.assign(
        chunk,
        callback && callback(chunk, currChunkIndex, totalChunk)
      );
      sparkMd5.append(arrayBuffer);
      chunkList.push(chunk);

      // 下一分块索引
      currChunkIndex++;
      if (currChunkIndex < totalChunk) {
        loadNextChunk();
      } else {
        const fileHash = sparkMd5.end();
        console.log(`file 读取分块完成, 总耗时：${Date.now() - startTime}ms`);
        console.log(`file 哈希值：${fileHash}`);
        resolve({ fileHash, chunkList });
      }
    };

    fileReader.onerror = () => {
      reject("fileReader.onerror：读取文件出错！");
    };

    loadNextChunk();
  });
};
