import COS from 'cos-nodejs-sdk-v5';

// 初始化腾讯云 COS 客户端
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID || '',
  SecretKey: process.env.COS_SECRET_KEY || '',
});

const Bucket = process.env.COS_BUCKET || '';
const Region = process.env.COS_REGION || 'ap-guangzhou';

export interface UploadOptions {
  Key: string; // 对象键（文件路径）
  Body: Buffer | string; // 文件内容
  ContentType?: string; // 文件类型
}

/**
 * 上传文件到腾讯云 COS
 */
export async function uploadToCOS(options: UploadOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket,
        Region,
        Key: options.Key,
        Body: options.Body,
        ContentType: options.ContentType,
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          // 返回文件的完整 URL
          const url = `https://${data.Location}`;
          resolve(url);
        }
      }
    );
  });
}

/**
 * 删除 COS 中的文件
 */
export async function deleteFromCOS(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    cos.deleteObject(
      {
        Bucket,
        Region,
        Key: key,
      },
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * 获取 COS 文件的临时 URL（用于预览）
 */
export function getCOSUrl(key: string): string {
  return `https://${Bucket}.cos.${Region}.myqcloud.com/${key}`;
}

/**
 * 列出 COS 中的文件
 */
export interface ListCOSFilesOptions {
  Prefix?: string; // 前缀，例如 'images/' 或 'blog/'
  MaxKeys?: number; // 最大返回数量，默认 100
  Marker?: string; // 分页标记
}

export interface COSFile {
  Key: string; // 文件路径
  Size: number; // 文件大小（字节）
  LastModified: string; // 最后修改时间
  ETag: string;
  url: string; // 完整访问 URL
}

export async function listCOSFiles(options: ListCOSFilesOptions = {}): Promise<{
  files: COSFile[];
  nextMarker?: string;
  isTruncated: boolean;
}> {
  return new Promise((resolve, reject) => {
    cos.getBucket(
      {
        Bucket,
        Region,
        Prefix: options.Prefix || '',
        MaxKeys: options.MaxKeys || 100,
        Marker: options.Marker,
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          const files: COSFile[] = (data.Contents || []).map((item: any) => ({
            Key: item.Key,
            Size: item.Size,
            LastModified: item.LastModified,
            ETag: item.ETag,
            url: getCOSUrl(item.Key),
          }));

          resolve({
            files,
            nextMarker: data.NextMarker,
            isTruncated: data.IsTruncated === 'true',
          });
        }
      }
    );
  });
}

