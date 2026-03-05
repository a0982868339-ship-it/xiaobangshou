import TIM from 'tim-js-sdk';
import TIMUploadPlugin from 'tim-upload-plugin';

let tim = null;

export const initTIM = (sdkAppID) => {
  if (tim) return tim;

  tim = TIM.create({
    SDKAppID: sdkAppID
  });

  tim.setLogLevel(1);
  tim.registerPlugin({ 'tim-upload-plugin': TIMUploadPlugin });

  return tim;
};

export const getTIM = () => tim;
