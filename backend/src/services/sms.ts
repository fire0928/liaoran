/**
 * 腾讯云短信服务
 * 如果未配置密钥，自动降级为模拟模式（控制台输出验证码）
 */
import crypto from 'crypto';
import https from 'https';
import { getDatabase } from '../config/database';

interface SmsConfig {
  secretId: string;
  secretKey: string;
  sdkAppId: string;
  signName: string;
  templateId: string;
}

function getSmsConfig(): SmsConfig {
  const db = getDatabase();
  const keys = [
    'sms_secret_id',
    'sms_secret_key',
    'sms_sdk_app_id',
    'sms_sign_name',
    'sms_template_id',
  ];
  const configs = db
    .prepare(
      `SELECT config_key, config_value FROM system_configs WHERE config_key IN (${keys.map(() => '?').join(',')})`
    )
    .all(...keys) as any[];

  const map: Record<string, string> = {};
  configs.forEach((c: any) => {
    map[c.config_key] = c.config_value;
  });

  return {
    secretId: map.sms_secret_id || '',
    secretKey: map.sms_secret_key || '',
    sdkAppId: map.sms_sdk_app_id || '',
    signName: map.sms_sign_name || '了然APP',
    templateId: map.sms_template_id || '',
  };
}

function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  if (typeof key === 'string') key = Buffer.from(key, 'utf-8');
  return crypto.createHmac('sha256', key).update(data).digest();
}

function sign(
  secretKey: string,
  date: string,
  service: string,
  stringToSign: string
): string {
  const kDate = hmacSha256('TC3' + secretKey, date);
  const kService = hmacSha256(kDate, service);
  const kSigning = hmacSha256(kService, 'tc3_request');
  return hmacSha256(kSigning, stringToSign).toString('hex');
}

/**
 * 发送验证码短信
 */
export async function sendSmsCode(
  phone: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  const config = getSmsConfig();

  // 未配置密钥 → 模拟模式
  if (!config.secretId || !config.secretKey || !config.sdkAppId || !config.templateId) {
    console.log(`\n📱 [模拟短信] 验证码 → ${phone}: ${code}\n`);
    return {
      success: true,
      message: '验证码已发送（模拟模式）',
    };
  }

  // 腾讯云 SMS API（V3签名）
  const endpoint = 'sms.tencentcloudapi.com';
  const service = 'sms';
  const action = 'SendSms';
  const version = '2021-01-11';
  const region = 'ap-guangzhou';

  const timestamp = Math.floor(Date.now() / 1000);
  const date = new Date(timestamp * 1000).toISOString().split('T')[0];

  const payload = JSON.stringify({
    PhoneNumberSet: [`+86${phone}`],
    SmsSdkAppId: config.sdkAppId,
    SignName: config.signName,
    TemplateId: config.templateId,
    TemplateParamSet: [code, '5'], // 验证码、有效期（分钟）
  });

  const hashedPayload = sha256(payload);
  const canonicalHeaders =
    `content-type:application/json\nhost:${endpoint}\nx-tc-action:${action.toLowerCase()}\n`;
  const canonicalRequest =
    `POST\n/\n\n${canonicalHeaders}\ncontent-type;host;x-tc-action\n${hashedPayload}`;

  const algorithm = 'TC3-HMAC-SHA256';
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign =
    `${algorithm}\n${timestamp}\n${credentialScope}\n${sha256(canonicalRequest)}`;

  const signature = sign(config.secretKey, date, service, stringToSign);
  const authorization =
    `${algorithm} Credential=${config.secretId}/${credentialScope}, SignedHeaders=content-type;host;x-tc-action, Signature=${signature}`;

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: endpoint,
        port: 443,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Host: endpoint,
          'X-TC-Action': action,
          'X-TC-Version': version,
          'X-TC-Region': region,
          'X-TC-Timestamp': String(timestamp),
          Authorization: authorization,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk: Buffer) => (body += chunk.toString()));
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            if (result.Response?.Error) {
              console.error('❌ 短信发送失败:', result.Response.Error.Message);
              resolve({
                success: false,
                message: result.Response.Error.Message,
              });
            } else {
              console.log(
                `📱 短信已发送 → ${phone}, RequestId: ${result.Response?.RequestId}`
              );
              resolve({ success: true, message: '验证码已发送' });
            }
          } catch {
            resolve({ success: false, message: '短信接口异常' });
          }
        });
      }
    );

    req.on('error', (err: Error) => {
      console.error('❌ 短信请求失败:', err.message);
      resolve({ success: false, message: '短信服务不可用' });
    });

    req.write(payload);
    req.end();
  });
}
