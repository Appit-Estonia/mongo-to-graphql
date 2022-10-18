import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scriptAsync = promisify(scrypt);

export class PasswordManager {
  static async toHash(password: string) {
    const salt = randomBytes(8).toString('hex');
    const buffer = (await scriptAsync(password, salt, 65)) as Buffer;

    return `${buffer.toString('hex')}.${salt}`;
  }

  static async compare(storedPassword: string, comparablePassword: string) {
    const [hashedPassword, salt] = storedPassword.split('.');
    const buffer = (await scriptAsync(comparablePassword, salt, 65)) as Buffer;

    return buffer.toString('hex') === hashedPassword;
  }
}