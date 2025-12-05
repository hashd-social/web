// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill Web Crypto API for Jest tests
import { webcrypto } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.crypto === 'undefined') {
  (global as any).crypto = webcrypto;
}

if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}
