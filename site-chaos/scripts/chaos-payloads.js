// Chaos Payloads — run via Chrome MCP evaluate_script
// Returns adversarial input payloads for form abuse testing.
// Does NOT inject them — the skill uses Chrome MCP fill/type_text to deliver each one.
//
// Usage: Run via evaluate_script to get payload arrays. Skill orchestrates delivery.

// eslint-disable-next-line no-unused-vars
const chaosPayloads = () => {
  return {
    url: window.location.href,

    // XSS probes — if any of these render as HTML, it's a vulnerability
    xss: [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg onload=alert(1)>',
      "javascript:alert('xss')",
      '<iframe src="data:text/html,<script>alert(1)</script>">',
      '{{constructor.constructor("alert(1)")()}}'
    ],

    // SQL injection probes — shouldn't reach a DB but tests input sanitization
    sqli: [
      "' OR '1'='1",
      "1; DROP TABLE users;--",
      "' UNION SELECT null,null--",
      "admin'--"
    ],

    // Boundary values
    boundaries: [
      '',                                           // empty
      ' ',                                          // whitespace only
      '   \t\n\r  ',                                // mixed whitespace
      'a'.repeat(10000),                            // very long string
      'a'.repeat(100000),                           // extremely long string
      '0',                                          // falsy string
      '-1',                                         // negative number as string
      '99999999999999999999',                        // number overflow
      'null',                                       // literal null string
      'undefined',                                  // literal undefined string
      'true',                                       // literal boolean string
      'NaN'                                         // literal NaN string
    ],

    // Unicode and encoding edge cases
    unicode: [
      '\u200B',                                     // zero-width space
      '\u200F',                                     // RTL mark
      '\uFEFF',                                     // BOM
      '\u0000',                                     // null byte
      'Test\u0000Value',                            // embedded null
      '\u202Ereversed\u202C',                       // RTL override
      '\uD83D\uDE00\uD83D\uDE01\uD83D\uDE02',     // emoji sequence
      '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66', // family ZWJ
      '\\',                                         // backslash
      '\n\n\n\n\n',                                 // newlines
      'Tes\u0301t',                                 // combining accent
      '\u2028\u2029'                                // line/paragraph separators
    ],

    // Format strings and template injection
    formatStrings: [
      '%s%s%s%s%s',                                 // printf format
      '${7*7}',                                     // template literal
      '{{7*7}}',                                    // template injection
      '#{7*7}',                                     // Ruby interpolation
      '%x%x%x%x',                                   // hex format
      '$(whoami)',                                   // command substitution
      '`whoami`'                                    // backtick execution
    ],

    summary: 'Payload sets: xss(6), sqli(4), boundaries(12), unicode(12), formatStrings(7)'
  };
};
