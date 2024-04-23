/** 文件状态到值的映射 */
export const FILE_STATUS_TO_VALUE_MAP = {
  /** 未选择 */
  NOT_SELECTED: 0,
  /** 未上传 */
  NOT_UPLOADED: 1,
  /** 校验中 */
  VALIDATING: 2,
  /** 上传中 */
  UPLOADING: 3,
  /** 上传失败 */
  UPLOAD_FAILED: 4,
  /** 合并中 */
  MERGING: 5,
  /** 合并成功 */
  MERGE_SUCCESSFUL: 6,
  /** 合并失败 */
  MERGE_FAILED: 7,
};

/**
 * 文件状态值到中文的映射
 */
export const FILE_STATUS_VALUE_TO_ZHCN_MAP = {
  [FILE_STATUS_TO_VALUE_MAP.NOT_SELECTED]: "未选择",
  [FILE_STATUS_TO_VALUE_MAP.NOT_UPLOADED]: "未上传",
  [FILE_STATUS_TO_VALUE_MAP.VALIDATING]: "校验中",
  [FILE_STATUS_TO_VALUE_MAP.UPLOADING]: "上传中",
  [FILE_STATUS_TO_VALUE_MAP.UPLOAD_FAILED]: "上传失败",
  [FILE_STATUS_TO_VALUE_MAP.MERGING]: "合并中",
  [FILE_STATUS_TO_VALUE_MAP.MERGE_SUCCESSFUL]: "合并成功",
  [FILE_STATUS_TO_VALUE_MAP.MERGE_FAILED]: "合并失败",
};

/** 分块状态到值的映射 */
export const CHUNK_STATUS_TO_VALUE_MAP = {
  /** 未上传 */
  NOT_UPLOADED: 0,
  /** 校验中 */
  VALIDATING: 1,
  /** 上传中 */
  UPLOADING: 2,
  /** 上传成功 */
  UPLOAD_SUCCESSFUL: 3,
  /** 上传失败 */
  UPLOAD_FAILED: 4,
};

/**
 * 分块状态值到中文的映射
 */
export const CHUNK_STATUS_VALUE_TO_ZHCN_MAP = {
  [CHUNK_STATUS_TO_VALUE_MAP.NOT_UPLOADED]: "未上传",
  [CHUNK_STATUS_TO_VALUE_MAP.VALIDATING]: "校验中",
  [CHUNK_STATUS_TO_VALUE_MAP.UPLOADING]: "上传中",
  [CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_SUCCESSFUL]: "上传成功",
  [CHUNK_STATUS_TO_VALUE_MAP.UPLOAD_FAILED]: "上传失败",
};
