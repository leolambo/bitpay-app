import React, {useImperativeHandle, useRef} from 'react';
import {StyleSheet} from 'react-native';
import {View} from 'react-native';
import Modal from 'react-native-modal';
import WebView, {WebViewMessageEvent} from 'react-native-webview';
import {HEIGHT, WIDTH} from '../../../components/styled/Containers';
import {Action, NeutralSlate} from '../../../styles/colors';

const RECAPTCHA_ID = 'bp-recaptcha';

export interface CaptchaRef {
  reset: (...args: any[]) => any;
}

interface RecaptchaModalProps {
  isVisible: boolean;

  /**
   * The public nocaptcha sitekey. The provided baseUrl must be one of the allowed domains for sitekey in order to function correctly.
   */
  sitekey: string;

  /**
   * The base URL to be used for any relative links in the HTML. This is also used for the origin header with CORS requests made from the WebView.
   * This URL must be one of the allowed domains for the sitekey in order to function correctly.
   */
  baseUrl: string;

  /**
   * Ref to the captcha WebView, giving the parent component access to grecaptcha functions.
   */
  captchaRef?: React.RefObject<CaptchaRef>;
  onResponse?: (gCaptchaResponse: string) => any;
  onCancel?: () => any;
  onExpired?: () => any;
  onError?: (error: any) => any;
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    padding: 0,
  },
  wrapper: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,.3)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

/**
 * Fullscreen modal that hosts a nocaptcha element in a WebView.
 * Required params: sitekey, baseUrl. Pass a ref to get access to grecaptcha functions from the parent component.
 */
export const RecaptchaModal = React.forwardRef<CaptchaRef, RecaptchaModalProps>(
  (props, ref) => {
    const {
      isVisible,
      baseUrl,
      sitekey,
      onResponse,
      onCancel,
      onExpired,
      onError,
    } = props;
    const webviewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => {
      return {
        reset: () => {
          webviewRef.current?.injectJavaScript(`
            window.grecaptcha.reset('${RECAPTCHA_ID}');
          `);
        },
      };
    });

    const onMessage = (e: WebViewMessageEvent) => {
      try {
        const {message, data} = JSON.parse(e.nativeEvent.data || '{}');

        switch (message) {
          case 'response':
            onResponse?.(data);
            break;
          case 'expired':
            onExpired?.();
            webviewRef.current?.injectJavaScript(`
            document.querySelector('#submit-captcha').disabled = true;
          `);
            break;
          case 'cancel':
            onCancel?.();
            break;
          case 'error':
            onError?.(data);
            break;
        }
      } catch (err) {
        onError?.(err);
      }
    };

    return (
      <Modal
        deviceHeight={HEIGHT}
        deviceWidth={WIDTH}
        backdropTransitionOutTiming={0}
        hideModalContentWhileAnimating={true}
        useNativeDriverForBackdrop={true}
        useNativeDriver={true}
        animationIn={'fadeInUp'}
        animationOut={'fadeOutDown'}
        isVisible={isVisible}
        style={styles.modal}>
        <View style={styles.wrapper}>
          <WebView
            ref={webviewRef}
            style={styles.webview}
            onMessage={onMessage}
            automaticallyAdjustContentInsets
            originWhitelist={['*']}
            mixedContentMode={'always'}
            javaScriptEnabled={true}
            source={{
              baseUrl,
              html: `
              <!DOCTYPE html>
              <html style="margin: 0; padding: 0;">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="initial-scale=1.0">
                  <meta http-equiv="X-UA-Compatible" content="ie=edge">
                  <style>
                    html {}

                    body {
                      bottom: 0px;
                      margin: 0;
                      padding: 0;
                      left: 0px;
                      position: absolute;
                      right: 0px;
                      top: 0px;
                    }

                    button {
                      border: 0;
                      border-radius: 4px;
                      margin-bottom: 12px;
                      padding: 16px;
                      width: 100%;
                      font-weight: 500;
                      font-size: 16px;
                    }

                    button:focus {
                      outline: 0;
                    }

                    button.secondary {
                      background: ${NeutralSlate};
                      color: ${Action}; 
                    }

                    #flex-container {
                      display: flex;
                      height: 100%;
                    }

                    #captcha-form {
                      margin: auto;
                    }

                    #${RECAPTCHA_ID} {
                      margin-bottom: 16px;
                      opacity: 0;
                      animation: fadeIn 1s 200ms forwards;
                    }
                    
                    @keyframes fadeIn {
                      0% {opacity:0;}
                      100% {opacity:1;}
                    }
                  </style>
                  <script src="https://www.google.com/recaptcha/api.js?render=explicit&onload=onCaptchaLoad"></script>
                  <script type="text/javascript"> 
                    window.onCaptchaLoad = () => {
                      window.grecaptcha.render('${RECAPTCHA_ID}', {
                        sitekey: '${sitekey}',

                        callback: (gCaptchaResponse) => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            message: 'response',
                            data: gCaptchaResponse,
                          }));
                        },

                        'expired-callback': () => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            message: 'expired',
                          }));
                        },

                        'error-callback': (err) => {
                          window.ReactNativeWebView.postMessage(JSON.stringify({
                            message: 'error',
                            data: err,
                          }));
                        },
                      });
                    };        

                    window.onCaptchaCancel = () => {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        message: 'cancel',
                      }));
                    };
                  </script> 
                </head>
                <body>
                  <div id="flex-container">
                    <form id="captcha-form">
                      <div id="${RECAPTCHA_ID}"></div>
                      <button id="cancel-captcha"
                        class="secondary"
                        onclick="onCaptchaCancel()"
                        type="button">
                        Cancel
                      </button>
                    </form>
                  </div>
                </body>
              </html>
            `,
            }}
          />
        </View>
      </Modal>
    );
  },
);

export default RecaptchaModal;