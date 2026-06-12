#!/usr/bin/env node
// Mint an OpenImmo feed key for a partner. Stores only the sha256 hash; prints
// the plaintext once. Usage: node scripts/make-feed-key.mjs "Partner Name"
import { webcrypto as wc } from 'node:crypto'
import { api } from './lib/admin.mjs'

const name = process.argv.slice(2).join(' ') || 'unnamed-feed'
const key = 'fk_' + [...wc.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('')
const hashBuf = await wc.subtle.digest('SHA-256', new TextEncoder().encode(key))
const hash = [...new Uint8Array(hashBuf)].map((b) => b.toString(16).padStart(2, '0')).join('')

const { error } = await api.insert('feed_keys', { name, key_hash: hash })
if (error) {
  console.error('failed:', error)
  process.exit(1)
}
console.log(`feed: ${name}`)
console.log(`KEY (store now — not recoverable): ${key}`)
