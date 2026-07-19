const regexCache = new Map();
const wildcardCache = new Map();

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Returns true when URL exactly equals the configured rule. */
export function matchExact(url, rule) {
  return String(url) === String(rule);
}

/** Returns true when URL matches a wildcard rule that uses * characters. */
export function matchWildcard(url, rule) {
  const wildcardRule = String(rule);

  if (!wildcardCache.has(wildcardRule)) {
    try {
      const pattern = `^${escapeRegex(wildcardRule).replace(/\\\*/g, ".*")}$`;
      wildcardCache.set(wildcardRule, new RegExp(pattern));
    } catch {
      wildcardCache.set(wildcardRule, null);
    }
  }

  const compiled = wildcardCache.get(wildcardRule);
  return compiled ? compiled.test(String(url)) : false;
}

/** Returns true when URL matches a regex rule prefixed with "regex:". */
export function matchRegex(url, rule) {
  const rawRule = String(rule);

  if (!rawRule.startsWith("regex:")) {
    return false;
  }

  const source = rawRule.slice("regex:".length);

  if (!regexCache.has(source)) {
    try {
      regexCache.set(source, new RegExp(source));
    } catch {
      regexCache.set(source, null);
    }
  }

  const compiled = regexCache.get(source);
  return compiled ? compiled.test(String(url)) : false;
}

/** Returns true when URL matches at least one whitelist rule. */
export function isAllowed(url, rules) {
  if (!url || !Array.isArray(rules) || rules.length === 0) {
    return false;
  }

  const target = String(url);

  return rules.some((rule) => {
    const candidate = String(rule || "").trim();

    if (!candidate) {
      return false;
    }

    if (candidate.startsWith("regex:")) {
      return matchRegex(target, candidate);
    }

    if (candidate.includes("*")) {
      return matchWildcard(target, candidate);
    }

    return matchExact(target, candidate);
  });
}
