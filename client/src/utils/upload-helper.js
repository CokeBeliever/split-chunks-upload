/**
 * 上传辅助类
 * @param {number} maxConcurrent 最大上传并发数
 */
export default class UploadHelper {
  constructor(maxConcurrent = 5) {
    /** 上传任务队列 */
    this.queue = [];
    /** 当前上传并发数 */
    this.currConcurrent = 0;
    /** 最大上传并发数 */
    this.maxConcurrent = maxConcurrent;
    /** 是否暂停上传 */
    this.paused = false;
  }

  /**
   * 添加上传任务
   * @param {() => Promise<any>} task 上传任务
   */
  enqueue(task) {
    this.queue.push(task);
  }

  /**
   * 移除上传任务
   * @returns {() => Promise<any>} 上传任务
   */
  dequeue() {
    return this.queue.shift();
  }

  /**
   * 刷新上传队列
   */
  flush() {
    const { queue, maxConcurrent, paused } = this;

    // 如果 "队列不为空"、"未达到最大并发数" 和 "未暂停上传"，那么刷新
    while (queue.length > 0 && this.currConcurrent < maxConcurrent && !paused) {
      const task = this.dequeue();

      task().finally(() => {
        this.currConcurrent--;
        this.flush();
      });
      this.currConcurrent++;
    }
  }

  /**
   * 暂停上传
   */
  pause() {
    this.paused = true;
  }

  /**
   * 恢复上传
   */
  resume() {
    this.paused = false;
    this.flush();
  }
}