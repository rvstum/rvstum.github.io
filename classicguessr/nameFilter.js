(() => {
  "use strict";

  const NAME_FILTER_POLICIES = Object.freeze({
    username: Object.freeze({
      label: "username",
      minLength: 3,
      maxLength: 24,
    }),
    guild: Object.freeze({
      label: "guild name",
      minLength: 2,
      maxLength: 32,
    }),
  });

  const HIDDEN_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180b-\u180f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufe00-\ufe0f\ufeff]/g;
  const COMBINING_MARK_PATTERN = /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g;
  const ALLOWED_NAME_PATTERN = /^[\p{L}\p{N} ._'\u2019-]+$/u;
  const SEPARATOR_PATTERN = /[^a-z0-9]+/g;
  const VOWEL_PATTERN = /[aeiou]/g;

  const VISUAL_CHARACTER_MAP = Object.freeze({
    "@": "a",
    "4": "a",
    "\u2206": "a",
    "\u0391": "a",
    "\u0410": "a",
    "\u0430": "a",
    "\u03b1": "a",
    "\u0251": "a",
    "\u13aa": "a",
    "\ua4ee": "a",
    "8": "b",
    "\u00df": "ss",
    "\u0392": "b",
    "\u0412": "b",
    "\u0432": "b",
    "\u042c": "b",
    "\u13f4": "b",
    "\ua4d0": "b",
    "\u00a2": "c",
    "\u00a9": "c",
    "\u03f9": "c",
    "\u0421": "c",
    "\u0441": "c",
    "\u217d": "c",
    "\ua4da": "c",
    "\u0501": "d",
    "\u13a0": "d",
    "\ua4d3": "d",
    "3": "e",
    "\u20ac": "e",
    "\u0395": "e",
    "\u0415": "e",
    "\u0435": "e",
    "\u212e": "e",
    "\ua4f0": "e",
    "\u0492": "f",
    "\u0493": "f",
    "\u03dc": "f",
    "\u0192": "f",
    "6": "g",
    "9": "g",
    "\u050c": "g",
    "\u0261": "g",
    "\u13c0": "g",
    "\ua4d6": "g",
    "#": "h",
    "\u0397": "h",
    "\u041d": "h",
    "\u043d": "h",
    "\u04bb": "h",
    "\u13bb": "h",
    "\ua4e7": "h",
    "!": "i",
    "1": "i",
    "|": "i",
    "\u0399": "i",
    "\u0406": "i",
    "\u0456": "i",
    "\u217c": "i",
    "\u13e5": "i",
    "\ua4f2": "i",
    "\u0408": "j",
    "\u0458": "j",
    "\u13eb": "j",
    "\u039a": "k",
    "\u041a": "k",
    "\u03ba": "k",
    "\u043a": "k",
    "\u13e6": "k",
    "\ua4d7": "k",
    "\u00a3": "l",
    "\u2113": "l",
    "\u13de": "l",
    "\ua4e1": "l",
    "\u039c": "m",
    "\u041c": "m",
    "\u043c": "m",
    "\u13b7": "m",
    "\ua4df": "m",
    "\u039d": "n",
    "\u041f": "n",
    "\u043f": "n",
    "\u03b7": "n",
    "\u0578": "n",
    "\u13c1": "n",
    "\ua4e0": "n",
    "0": "o",
    "\u039f": "o",
    "\u041e": "o",
    "\u043e": "o",
    "\u03bf": "o",
    "\u03c3": "o",
    "\u0d20": "o",
    "\u13be": "o",
    "\ua4f3": "o",
    "\u03a1": "p",
    "\u0420": "p",
    "\u03c1": "p",
    "\u0440": "p",
    "\u13e2": "p",
    "\ua4d1": "p",
    "\u051a": "q",
    "\u0566": "q",
    "\u0533": "r",
    "\u13a1": "r",
    "\ua4e3": "r",
    "$": "s",
    "5": "s",
    "\u00a7": "s",
    "\u0405": "s",
    "\u0455": "s",
    "\ua4e2": "s",
    "+": "t",
    "7": "t",
    "\u03a4": "t",
    "\u0422": "t",
    "\u03c4": "t",
    "\u0442": "t",
    "\ua4d4": "t",
    "\u03bc": "u",
    "\u03c5": "u",
    "\u053d": "u",
    "\u22c3": "u",
    "\ua4f4": "u",
    "\u03bd": "v",
    "\u0474": "v",
    "\u0475": "v",
    "\u13d9": "v",
    "\ua4e6": "v",
    "\u03c9": "w",
    "\u051c": "w",
    "\u051d": "w",
    "\u0561": "w",
    "\u13b3": "w",
    "\ua4ea": "w",
    "%": "x",
    "\u00d7": "x",
    "\u03a7": "x",
    "\u0425": "x",
    "\u03c7": "x",
    "\u0445": "x",
    "\u166d": "x",
    "\ua4eb": "x",
    "\u03a5": "y",
    "\u0423": "y",
    "\u03b3": "y",
    "\u0443": "y",
    "\u04af": "y",
    "\u13a9": "y",
    "\ua4ec": "y",
    "2": "z",
    "\u0396": "z",
    "\u13c3": "z",
    "\ua4dc": "z",
  });

  const BLOCKED_NAME_ROOTS = Object.freeze([
    "arsehole",
    "asshole",
    "bastard",
    "biatch",
    "bitch",
    "blowjob",
    "boner",
    "boob",
    "chink",
    "clit",
    "cock",
    "cum",
    "cunt",
    "dick",
    "dyke",
    "fag",
    "faggot",
    "fagot",
    "fck",
    "fuck",
    "fuk",
    "hentai",
    "hitler",
    "incest",
    "isis",
    "jizz",
    "kkk",
    "kys",
    "killurself",
    "killyourself",
    "molest",
    "nazi",
    "nigga",
    "nigger",
    "pedo",
    "pedophile",
    "porn",
    "pussy",
    "rape",
    "rapist",
    "retard",
    "semen",
    "sex",
    "shit",
    "slut",
    "suicide",
    "terrorist",
    "tranny",
    "whore",
    "xxx",
  ]);

  const BLOCKED_NAME_SKELETONS = Object.freeze(
    BLOCKED_NAME_ROOTS
      .map((term) => [term.replace(VOWEL_PATTERN, ""), term])
      .filter(([skeleton]) => skeleton.length >= 3),
  );

  function normalizeDisplayName(value) {
    return String(value ?? "")
      .normalize("NFKC")
      .replace(HIDDEN_CHARACTER_PATTERN, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function validateDisplayName(value, type = "username") {
    const policy = NAME_FILTER_POLICIES[type] || NAME_FILTER_POLICIES.username;
    const rawValue = String(value ?? "");
    const normalizedValue = normalizeDisplayName(rawValue);
    const length = [...normalizedValue].length;

    if (!normalizedValue) {
      return getNameFilterResult(false, "empty", `Enter a ${policy.label}.`, normalizedValue);
    }

    if (HIDDEN_CHARACTER_PATTERN.test(rawValue)) {
      HIDDEN_CHARACTER_PATTERN.lastIndex = 0;
      return getNameFilterResult(false, "hidden_characters", `That ${policy.label} uses hidden characters.`, normalizedValue);
    }

    HIDDEN_CHARACTER_PATTERN.lastIndex = 0;

    if (length < policy.minLength) {
      return getNameFilterResult(false, "too_short", `That ${policy.label} is too short.`, normalizedValue);
    }

    if (length > policy.maxLength) {
      return getNameFilterResult(false, "too_long", `That ${policy.label} is too long.`, normalizedValue);
    }

    if (!ALLOWED_NAME_PATTERN.test(normalizedValue)) {
      return getNameFilterResult(false, "unsupported_characters", `That ${policy.label} uses unsupported characters.`, normalizedValue);
    }

    if (findBlockedVisualNameMatch(normalizedValue)) {
      return getNameFilterResult(false, "blocked_language", `That ${policy.label} looks inappropriate.`, normalizedValue);
    }

    return getNameFilterResult(true, "ok", "OK", normalizedValue);
  }

  function validateUsername(value) {
    return validateDisplayName(value, "username");
  }

  function validateGuildName(value) {
    return validateDisplayName(value, "guild");
  }

  function getNameFilterResult(ok, code, message, value) {
    return Object.freeze({
      ok,
      code,
      message,
      value,
    });
  }

  function findBlockedVisualNameMatch(value) {
    const forms = getVisualNameForms(value);

    return forms.some((form) => {
      const compact = form.replace(SEPARATOR_PATTERN, "");
      const squeezed = compact.replace(/(.)\1{2,}/g, "$1$1");
      const singleRepeated = compact.replace(/(.)\1+/g, "$1");
      const noVowels = compact.replace(VOWEL_PATTERN, "");
      const comparableForms = new Set([compact, squeezed, singleRepeated, noVowels]);

      for (const comparableForm of comparableForms) {
        if (!comparableForm) {
          continue;
        }

        if (BLOCKED_NAME_ROOTS.some((term) => comparableForm.includes(term))) {
          return true;
        }

        if (BLOCKED_NAME_SKELETONS.some(([skeleton]) => comparableForm.includes(skeleton))) {
          return true;
        }
      }

      return false;
    });
  }

  function getVisualNameForms(value) {
    const folded = foldNameForVisualScan(value);
    const compact = folded.replace(SEPARATOR_PATTERN, "");
    const spaced = folded.replace(SEPARATOR_PATTERN, " ").trim();
    const squeezed = compact.replace(/(.)\1{2,}/g, "$1$1");
    const singleRepeated = compact.replace(/(.)\1+/g, "$1");
    const noVowels = compact.replace(VOWEL_PATTERN, "");

    return [...new Set([folded, compact, spaced, squeezed, singleRepeated, noVowels].filter(Boolean))];
  }

  function foldNameForVisualScan(value) {
    const normalized = normalizeDisplayName(value)
      .normalize("NFKD")
      .replace(COMBINING_MARK_PATTERN, "")
      .toLowerCase();
    let folded = "";

    for (const character of normalized) {
      folded += VISUAL_CHARACTER_MAP[character] || character;
    }

    return folded;
  }

  globalThis.ClassicGuessrNameFilter = Object.freeze({
    normalizeDisplayName,
    validateDisplayName,
    validateUsername,
    validateGuildName,
    getVisualNameForms,
  });
})();
