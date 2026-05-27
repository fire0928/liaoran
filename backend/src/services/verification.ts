/**
 * 短信验证码管理（内存存储，有效期5分钟）
 */
interface CodeRecord {
  code: string;
  expiresAt: number;
}

const store = new Map<string, CodeRecord>();

// 定期清理过期验证码（每 60 秒）
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store) {
    if (now > record.expiresAt) {
      store.delete(key);
    }
  }
}, 60000);

/**
 * 存储验证码
 */
export function setVerificationCode(phone: string, code: string): void {
  store.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
}

/**
 * 校验验证码，验证后立即删除（一次性）
 */
export function verifyCode(phone: string, code: string): boolean {
  const record = store.get(phone);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    store.delete(phone);
    return false;
  }
  if (record.code !== code) return false;
  store.delete(phone); // 一次性使用
  return true;
}

/**
 * 生成6位数字验证码
 */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
