export class AuthenticationError extends Error {
  constructor(message = "Sesi tidak valid. Silakan login kembali.") {
    super(message);
    this.name = "AuthenticationError";
  }
}
