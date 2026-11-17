import assert from 'node:assert/strict'
import test from 'node:test'

const { safeHttpUrl } = await import('../.test-dist/src/utils/url.js')

test('allows absolute HTTPS URLs', () => {
  assert.equal(safeHttpUrl('https://example.com/search?q=test'), 'https://example.com/search?q=test')
})

test('allows absolute HTTP URLs', () => {
  assert.equal(safeHttpUrl('http://example.com/path'), 'http://example.com/path')
})

for (const protocol of ['javascript:', 'data:', 'file:', 'vbscript:']) {
  test(`rejects ${protocol} URLs`, () => {
    assert.equal(safeHttpUrl(`${protocol}alert(1)`), undefined)
  })
}

test('rejects malformed URLs', () => {
  assert.equal(safeHttpUrl('not a valid URL'), undefined)
})

test('rejects empty URLs', () => {
  assert.equal(safeHttpUrl(''), undefined)
  assert.equal(safeHttpUrl('   '), undefined)
})

test('preserves Markdown bare-domain compatibility only when requested', () => {
  assert.equal(safeHttpUrl('example.com/path', { assumeHttps: true }), 'https://example.com/path')
  assert.equal(safeHttpUrl('example.com/path'), undefined)
})
