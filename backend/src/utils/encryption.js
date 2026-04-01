/**
 * AES-256-GCM field-level encryption for PII data.
 *
 * Encrypts sensitive fields before they hit MongoDB so that raw database
 * files are useless without the ENCRYPTION_KEY. Decrypts transparently
 * when data is read through the API.
 *
 * Format: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * The "enc:v1:" prefix lets us detect already-encrypted values and skip
 * double-encryption. It also allows future version changes.
 */
const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ENCRYPTION_KEY is required in production");
    }
    // Dev fallback — NOT secure, just prevents crashes during development
    return crypto.createHash("sha256").update("dev-encryption-key-change-in-prod").digest();
  }
  // Derive a 32-byte key from the provided string
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypt a string value. Returns null/undefined/empty unchanged.
 */
function encrypt(value) {
  if (value == null || value === "") return value;
  const str = String(value);
  // Don't double-encrypt
  if (str.startsWith(PREFIX)) return str;

  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(str, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${PREFIX}${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a string value. Returns non-encrypted values unchanged.
 */
function decrypt(value) {
  if (value == null || value === "") return value;
  const str = String(value);
  if (!str.startsWith(PREFIX)) return str; // Not encrypted, return as-is

  try {
    const parts = str.slice(PREFIX.length).split(":");
    if (parts.length !== 3) return str;
    const [ivHex, authTagHex, ciphertext] = parts;

    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    // If decryption fails (wrong key, corrupted data), return the raw value
    // This prevents data loss — the field just won't be readable
    return "[encrypted]";
  }
}

/**
 * Encrypt a number (stored as encrypted string). Returns null unchanged.
 */
function encryptNumber(value) {
  if (value == null) return null;
  return encrypt(String(value));
}

/**
 * Decrypt back to a number. Returns null if not a valid number.
 */
function decryptNumber(value) {
  if (value == null) return null;
  const str = decrypt(value);
  if (str === "[encrypted]") return null;
  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Create Mongoose pre-save hook that encrypts specified fields.
 * @param {string[]} stringFields - Fields to encrypt as strings
 * @param {string[]} numberFields - Fields to encrypt as numbers (stored as encrypted strings)
 */
function createEncryptionHook(stringFields = [], numberFields = []) {
  return function (next) {
    for (const field of stringFields) {
      if (this.isModified(field) && this[field]) {
        this[field] = encrypt(this[field]);
      }
    }
    for (const field of numberFields) {
      if (this.isModified(field) && this[field] != null) {
        this[field] = encryptNumber(this[field]);
      }
    }
    next();
  };
}

/**
 * Create a toJSON transform that decrypts specified fields.
 * @param {string[]} stringFields - Fields to decrypt as strings
 * @param {string[]} numberFields - Fields to decrypt as numbers
 */
function createDecryptionTransform(stringFields = [], numberFields = []) {
  return function (doc, ret) {
    for (const field of stringFields) {
      if (ret[field]) ret[field] = decrypt(ret[field]);
    }
    for (const field of numberFields) {
      if (ret[field] != null) ret[field] = decryptNumber(ret[field]);
    }
    return ret;
  };
}

module.exports = { encrypt, decrypt, encryptNumber, decryptNumber, createEncryptionHook, createDecryptionTransform };
