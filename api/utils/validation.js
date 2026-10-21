/**
 * utils/validation.js
 * ----------------------------------------------------------------------------
 * Server-side validation helpers.
 *
 * The client-side AngularJS forms validate the same rules, but the API must
 * never trust the browser, so every rule is re-checked here before a record
 * reaches MySQL.
 * ----------------------------------------------------------------------------
 */
'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9 +()\-]{8,20}$/;

/** Trim a value and return '' for null/undefined. */
function str(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/** Convert to a finite number or null. */
function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Collect field-level validation errors as { field: message }. */
class Validator {
  constructor() {
    this.errors = {};
  }

  required(field, value, label) {
    if (str(value) === '') this.errors[field] = `${label} is required.`;
    return this;
  }

  maxLength(field, value, max, label) {
    if (str(value).length > max) this.errors[field] = `${label} must be ${max} characters or fewer.`;
    return this;
  }

  minLength(field, value, min, label) {
    const v = str(value);
    if (v !== '' && v.length < min) this.errors[field] = `${label} must be at least ${min} characters.`;
    return this;
  }

  email(field, value, label) {
    const v = str(value);
    if (v === '') {
      this.errors[field] = `${label} is required.`;
    } else if (!EMAIL_RE.test(v)) {
      this.errors[field] = `${label} must be a valid email address.`;
    }
    return this;
  }

  phone(field, value, label) {
    const v = str(value);
    if (v === '') {
      this.errors[field] = `${label} is required.`;
    } else if (!PHONE_RE.test(v)) {
      this.errors[field] = `${label} must contain only digits, spaces and + ( ) - characters.`;
    }
    return this;
  }

  number(field, value, label, { min, max, integer = false, required = true } = {}) {
    const raw = str(value);
    if (raw === '') {
      if (required) this.errors[field] = `${label} is required.`;
      return this;
    }
    const n = num(value);
    if (n === null) {
      this.errors[field] = `${label} must be a number.`;
      return this;
    }
    if (integer && !Number.isInteger(n)) this.errors[field] = `${label} must be a whole number.`;
    if (min !== undefined && n < min) this.errors[field] = `${label} must be at least ${min}.`;
    if (max !== undefined && n > max) this.errors[field] = `${label} must be at most ${max}.`;
    return this;
  }

  /** Accepts "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm". */
  dateTime(field, value, label) {
    const raw = str(value);
    if (raw === '') {
      this.errors[field] = `${label} is required.`;
      return this;
    }
    const parsed = new Date(raw.replace(' ', 'T'));
    if (Number.isNaN(parsed.getTime())) this.errors[field] = `${label} is not a valid date/time.`;
    return this;
  }

  oneOf(field, value, allowed, label) {
    if (!allowed.includes(str(value))) this.errors[field] = `${label} is not a valid option.`;
    return this;
  }

  get valid() {
    return Object.keys(this.errors).length === 0;
  }
}

/** Normalise "YYYY-MM-DDTHH:mm" into a MySQL DATETIME string. */
function toMysqlDateTime(value) {
  const raw = str(value).replace('T', ' ');
  if (raw === '') return null;
  return raw.length === 16 ? `${raw}:00` : raw.slice(0, 19);
}

/** Normalise "YYYY-MM-DDTHH:mm" into a value an <input type="datetime-local"> accepts. */
function toInputDateTime(value) {
  const raw = str(value).replace(' ', 'T');
  return raw.length >= 16 ? raw.slice(0, 16) : raw;
}

module.exports = { Validator, str, num, toMysqlDateTime, toInputDateTime, EMAIL_RE, PHONE_RE };
