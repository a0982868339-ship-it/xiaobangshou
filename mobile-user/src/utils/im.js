import TIM from 'tim-js-sdk';
import TIMUploadPlugin from 'tim-upload-plugin';

let tim = null;

export const initTIM = (sdkAppID) => {
  if (tim) return tim;

  tim = TIM.create({
    SDKAppID: sdkAppID
  });

  // 设置日志级别为 ERROR，生产环境建议设置为 ERROR
  tim.setLogLevel(1);

  // 注册腾讯云即时通信 IM 上传插件
  tim.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin });

  return tim;
};

export const getTIM = () => tim;
