import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-ctr';
  private readonly secretKey = process.env.CRYPTO_KEY;
  private readonly iv = crypto.randomBytes(16);

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.secretKey,
      this.iv,
    );

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return `${this.iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(hash: string): string {
    const [iv, encryptedText] = hash.split(':');

    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.secretKey,
      Buffer.from(iv, 'hex'),
    );

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, 'hex')),
      decipher.final(),
    ]);

    return decrypted.toString();
  }
}
