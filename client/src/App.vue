<template>
  <div style="padding: 40px">
    <!-- 上传文件输入框，当文件 "校验中"、"上传中" 或 "合并中" 状态禁用 -->
    <input
      type="file"
      :disabled="
        file.status === FILE_STATUS_TO_VALUE_MAP.VALIDATING ||
        file.status === FILE_STATUS_TO_VALUE_MAP.UPLOADING ||
        file.status === FILE_STATUS_TO_VALUE_MAP.MERGING
      "
      @change="onChangeFileUploadInput"
    />

    <!-- 上传设置表单，当文件 "未上传" 状态可用 -->
    <el-form
      label-width="160px"
      style="margin-top: 20px"
      :disabled="file.status !== FILE_STATUS_TO_VALUE_MAP.NOT_UPLOADED"
    >
      <el-form-item label="分块校验并发数">
        <el-slider
          v-model="chunkValidateHelper.maxConcurrent"
          :step="1"
          :min="1"
          :max="100"
          show-input
        />
      </el-form-item>
      <el-form-item label="分块上传并发数">
        <el-slider
          v-model="chunkUploadHelper.maxConcurrent"
          :step="1"
          :min="1"
          :max="100"
          show-input
        />
      </el-form-item>
      <el-form-item label="分块大小">
        <el-slider
          v-model="file.chunkSize"
          :step="1024 * 1024"
          :min="1024 * 1024"
          :max="100 * 1024 * 1024"
          show-input
          :format-tooltip="(value) => `${value / 1024 / 1024}MB`"
        />
      </el-form-item>
    </el-form>

    <el-descriptions
      border
      title="文件信息"
      style="margin-top: 20px"
      :column="2"
    >
      <template #extra>
        <!-- 暂停上传按钮，当文件 "上传中" 状态可用 -->
        <el-button
          type="primary"
          :disabled="file.status !== FILE_STATUS_TO_VALUE_MAP.UPLOADING"
          @click="onClickPauseOrContinueButton"
        >
          {{ chunkUploadHelper.paused ? "继续上传" : "暂停上传" }}
        </el-button>
        <!-- 上传文件按钮，当文件 "未上传" 状态可用 -->
        <el-button
          type="primary"
          :disabled="file.status !== FILE_STATUS_TO_VALUE_MAP.NOT_UPLOADED"
          @click="onClickUploadFileButton"
        >
          上传文件
        </el-button>
      </template>
      <el-descriptions-item label="标识（hash）">
        {{ file.hash }}
      </el-descriptions-item>
      <el-descriptions-item label="名称">
        {{ file.raw?.name }}
      </el-descriptions-item>
      <el-descriptions-item label="类型">
        {{ file.raw?.type }}
      </el-descriptions-item>
      <el-descriptions-item label="大小">
        {{ file.raw?.size }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag>{{ FILE_STATUS_VALUE_TO_ZHCN_MAP[file.status] }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="上传进度">
        {{ file.percentage }}
      </el-descriptions-item>
      <el-descriptions-item label="文件链接">
        <!-- 文件链接，当文件 "合并成功" 状态可用 -->
        <el-link
          target="_blank"
          :href="file.href"
          :disabled="file.status !== FILE_STATUS_TO_VALUE_MAP.MERGE_SUCCESSFUL"
        >
          查看文件
        </el-link>
      </el-descriptions-item>
    </el-descriptions>

    <h4>分块列表</h4>
    <el-table
      border
      size="small"
      style="margin-top: 20px"
      :data="file.chunkList"
      :height="400"
    >
      <el-table-column type="index" label="序号" width="80" />
      <el-table-column prop="hash" label="标识（hash）" min-width="160" />
      <el-table-column prop="status" label="状态" width="160">
        <template #default="scope">
          <el-tag>
            {{ CHUNK_STATUS_VALUE_TO_ZHCN_MAP[scope.row.status] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="操作" width="80">
        <template #default="scope">
          <!-- 重新上传按钮，当分块 "上传失败" 状态可用 -->
          <el-button
            type="primary"
            size="small"
            link
            :disabled="
              scope.row.status !== CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_FAILED
            "
            @click="onClickReUploadButton(scope.row, scope.$index)"
          >
            重新上传
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from "vue";
import axios from "axios";
import {
  FILE_STATUS_TO_VALUE_MAP,
  FILE_STATUS_VALUE_TO_ZHCN_MAP,
  CHUNK_STATUS_TO_VALUE_MAP,
  CHUNK_STATUS_VALUE_TO_ZHCN_MAP,
} from "@/consts/file";
import UploadHelper from "@/utils/upload-helper";
import { splitChunks } from "@/utils/file";

/** 分块校验辅助对象 */
const chunkValidateHelper = reactive(new UploadHelper(10));
/** 分块上传辅助对象 */
const chunkUploadHelper = reactive(new UploadHelper(10));
/** 文件对象 */
const file = ref({
  /** 文件原始对象 */
  raw: null,
  /**
   * 文件哈希值
   */
  hash: "",
  /**
   * 文件链接
   */
  href: "",
  /**
   * 文件上传进度
   */
  percentage: computed(() => {
    const chunkList = file.value.chunkList;
    const chunkCount = chunkList.length;
    const uploadedChunkList = chunkList.filter(
      (chunk) => chunk.status === CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_SUCCESSFUL
    );
    const uploadedChunkCount = uploadedChunkList.length;

    return `${uploadedChunkCount}/${chunkCount}`;
  }),
  /**
   * 文件状态
   */
  status: FILE_STATUS_TO_VALUE_MAP.NOT_SELECTED,
  /**
   * 分块大小
   */
  chunkSize: 20 * 1024 * 1024,
  /**
   * @type {Array<{raw: Blob, hash: string, status: number}>} 分块列表
   *  - raw: 分块数据
   *  - hash: 分块哈希值
   *  - status: 分块状态
   */
  chunkList: [],
});

/**
 * 事件监听，change on 文件上传输入框
 * @param {*} event 事件对象
 */
const onChangeFileUploadInput = (event) => {
  const fileValue = file.value;
  fileValue.raw = event.target.files[0];
  fileValue.hash = "";
  fileValue.href = "";
  fileValue.status = fileValue.raw
    ? FILE_STATUS_TO_VALUE_MAP.NOT_UPLOADED
    : FILE_STATUS_TO_VALUE_MAP.NOT_SELECTED;
  fileValue.chunkList = [];
};

/**
 * 事件监听，click on 上传文件按钮
 */
const onClickUploadFileButton = async () => {
  const fileValue = file.value;
  const { raw: fileRaw, chunkSize, chunkList } = fileValue;
  const fileExt = fileRaw.name.split(".").pop();
  let fileHash = "";

  // todo：文件分块
  {
    fileValue.status = FILE_STATUS_TO_VALUE_MAP.VALIDATING;
    const splitChunksResult = await splitChunks(
      fileRaw,
      chunkSize,
      (chunk, index, total) => {
        chunkList.push({
          ...chunk,
          status: CHUNK_STATUS_TO_VALUE_MAP.NOT_UPLOADED,
        });
      }
    );
    fileValue.hash = fileHash = splitChunksResult.fileHash;
  }

  // todo: 文件级别校验（可选）
  {
    const validateFileResult = await axios
      .get(`/api/upload/validate-file/${fileHash}`, {
        params: {
          fileExt,
        },
      })
      .then((res) => res.data.data);

    // 如果 "文件" 在服务器存在，那么 "文件" 合并成功
    if (validateFileResult) {
      chunkList.forEach((chunk) => {
        chunk.status = CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_SUCCESSFUL;
      });
      fileValue.status = FILE_STATUS_TO_VALUE_MAP.MERGE_SUCCESSFUL;
      fileValue.href = await axios
        .get(`/api/upload/get-file-href/${fileHash}`, {
          params: { fileExt },
        })
        .then((res) => res.data.data);
      return;
    }
  }

  // todo: 块级别校验（可选）
  {
    const validateChunkRequestList = chunkList.map((chunk, chunkIndex) => {
      return new Promise((resolve, reject) => {
        chunkValidateHelper.enqueue(() => {
          chunk.status = CHUNK_STATUS_TO_VALUE_MAP.VALIDATING;
          return axios
            .get(`/api/upload/validate-chunk/${chunk.hash}`, {
              params: {
                chunkIndex,
                fileHash,
                chunkSize,
              },
            })
            .then((res) => {
              if (res.data.data) {
                // 如果 "分块" 在服务器存在，那么 "分块" 上传成功
                chunk.status = CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_SUCCESSFUL;
              }
              resolve();
            })
            .catch(() => {
              reject();
            });
        });

        chunkValidateHelper.flush();
      });
    });
    await Promise.all(validateChunkRequestList);
  }

  // todo: 分块上传
  {
    fileValue.status = FILE_STATUS_TO_VALUE_MAP.UPLOADING;
    const uploadChunkRequestList = chunkList.map((chunk, chunkIndex) => {
      if (chunk.status === CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_SUCCESSFUL) {
        return Promise.resolve();
      }
      return uploadChunk(chunk, chunkIndex);
    });

    try {
      await Promise.all(uploadChunkRequestList);
    } catch (err) {
      fileValue.status = FILE_STATUS_TO_VALUE_MAP.UPLOAD_FAILED;
    }
  }

  // todo: 分块合并
  {
    fileValue.status = FILE_STATUS_TO_VALUE_MAP.MERGING;
    await axios
      .post("/api/upload/merge-chunks", {
        fileExt,
        fileHash,
        chunkSize,
      })
      .then((res) => {
        fileValue.status = FILE_STATUS_TO_VALUE_MAP.MERGE_SUCCESSFUL;
        fileValue.href = res.data.data;
      })
      .catch((err) => {
        fileValue.status = FILE_STATUS_TO_VALUE_MAP.MERGE_FAILED;
      });
  }
};

/**
 * 事件监听，click on 暂停/继续按钮
 */
const onClickPauseOrContinueButton = () => {
  chunkUploadHelper.paused
    ? chunkUploadHelper.resume()
    : chunkUploadHelper.pause();
};

/**
 * 事件监听，click on 重新上传按钮
 * @param {*} chunk 分块对象
 * @param {number} index 分块索引
 */
const onClickReUploadButton = (chunk, index) => {
  uploadChunk(chunk, index);
};

/**
 * 上传分块
 * @param {Blob} chunk 分块数据
 * @param {number} chunkIndex 分块顺序
 * @returns {Promise} 上传结果
 */
const uploadChunk = (chunk, chunkIndex) => {
  const { hash: fileHash, chunkSize } = file.value;
  const formData = new FormData();

  // 文件哈希值
  formData.append("fileHash", fileHash);
  // 分块大小
  formData.append("chunkSize", chunkSize);
  // 分块顺序
  formData.append("chunkIndex", chunkIndex);
  // 分块哈希值
  formData.append("chunkHash", chunk.hash);
  // 分块数据
  formData.append("chunk", chunk.raw);

  return new Promise((resolve, reject) => {
    chunkUploadHelper.enqueue(() => {
      chunk.status = CHUNK_STATUS_TO_VALUE_MAP.UPLOADING;
      return axios
        .post("/api/upload/chunk", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then(() => {
          chunk.status = CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_SUCCESSFUL;
          resolve();
        })
        .catch(() => {
          chunk.status = CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_FAILED;
          reject();
        });
    });

    chunkUploadHelper.flush();
  });
};
</script>
